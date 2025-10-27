"""Unit tests for quota enforcement middleware."""
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import pytest

from apps.api.src.quota import (
    get_or_create_quota,
    check_qr_quota,
    check_export_quota,
    check_template_quota,
    increment_qr_quota,
    increment_export_quota,
    increment_template_quota,
    enforce_qr_quota,
    enforce_export_quota,
    enforce_template_quota
)
from apps.api.src.models import Account, UsageQuota


class TestQuotaCreation:
    """Test quota creation and management."""
    
    def test_creates_quota_for_current_month(self):
        """Test that quota is created for current month."""
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None
        
        account = Account(id="test-id", plan="free")
        
        quota = get_or_create_quota(db, account)
        
        # Should create new quota
        db.add.assert_called_once()
        db.commit.assert_called()
    
    def test_returns_existing_quota(self):
        """Test that existing quota is returned."""
        now = datetime.utcnow()
        existing_quota = UsageQuota(
            account_id="test-id",
            period_start=datetime(now.year, now.month, 1),
            period_end=datetime(now.year, now.month + 1, 1) - timedelta(seconds=1),
            qr_generated_count=10,
            daily_exports=5,
            daily_reset_at=now
        )
        
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = existing_quota
        
        account = Account(id="test-id", plan="free")
        
        quota = get_or_create_quota(db, account)
        
        assert quota == existing_quota
        db.add.assert_not_called()
    
    def test_resets_daily_counters(self):
        """Test that daily counters are reset when date changes."""
        yesterday = datetime.utcnow() - timedelta(days=1)
        existing_quota = UsageQuota(
            account_id="test-id",
            period_start=yesterday,
            period_end=yesterday + timedelta(days=30),
            qr_generated_count=10,
            daily_exports=50,
            daily_reset_at=yesterday
        )
        
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = existing_quota
        
        account = Account(id="test-id", plan="free")
        
        quota = get_or_create_quota(db, account)
        
        assert quota.daily_exports == 0
        db.commit.assert_called()


class TestQuotaChecking:
    """Test quota limit checking."""
    
    def test_check_qr_quota_under_limit(self):
        """Test QR quota check when under limit."""
        db = Mock()
        quota = UsageQuota(
            account_id="test-id",
            qr_generated_count=25,
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        db.query.return_value.filter.return_value.first.return_value = quota
        
        account = Account(id="test-id", plan="free")
        
        result = check_qr_quota(account, db)
        
        assert result == True
    
    def test_check_qr_quota_at_limit(self):
        """Test QR quota check when at limit."""
        db = Mock()
        quota = UsageQuota(
            account_id="test-id",
            qr_generated_count=50,  # Free plan limit
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        db.query.return_value.filter.return_value.first.return_value = quota
        
        account = Account(id="test-id", plan="free")
        
        result = check_qr_quota(account, db)
        
        assert result == False
    
    def test_check_export_quota_under_limit(self):
        """Test export quota check when under limit."""
        db = Mock()
        quota = UsageQuota(
            account_id="test-id",
            daily_exports=5,
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        db.query.return_value.filter.return_value.first.return_value = quota
        
        account = Account(id="test-id", plan="free")
        
        result = check_export_quota(account, db)
        
        assert result == True
    
    def test_check_export_quota_at_limit(self):
        """Test export quota check when at limit."""
        db = Mock()
        quota = UsageQuota(
            account_id="test-id",
            daily_exports=10,  # Free plan daily limit
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        db.query.return_value.filter.return_value.first.return_value = quota
        
        account = Account(id="test-id", plan="free")
        
        result = check_export_quota(account, db)
        
        assert result == False
    
    def test_check_template_quota_pro_plan(self):
        """Test template quota for Pro plan has higher limits."""
        db = Mock()
        quota = UsageQuota(
            account_id="test-id",
            templates_applied_count=50,
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        db.query.return_value.filter.return_value.first.return_value = quota
        
        account = Account(id="test-id", plan="pro")
        
        result = check_template_quota(account, db)
        
        # Pro plan has limit of 100, so 50 should be under limit
        assert result == True


class TestQuotaIncrement:
    """Test quota increment functions."""
    
    def test_increment_qr_quota(self):
        """Test incrementing QR generation count."""
        db = Mock()
        quota = UsageQuota(
            account_id="test-id",
            qr_generated_count=10,
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        db.query.return_value.filter.return_value.first.return_value = quota
        
        account = Account(id="test-id", plan="free")
        
        increment_qr_quota(account, db)
        
        assert quota.qr_generated_count == 11
        db.commit.assert_called()
    
    def test_increment_export_quota(self):
        """Test incrementing export counts."""
        db = Mock()
        quota = UsageQuota(
            account_id="test-id",
            exports_count=5,
            daily_exports=2,
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        db.query.return_value.filter.return_value.first.return_value = quota
        
        account = Account(id="test-id", plan="free")
        
        increment_export_quota(account, db)
        
        assert quota.exports_count == 6
        assert quota.daily_exports == 3
        db.commit.assert_called()
    
    def test_increment_template_quota(self):
        """Test incrementing template application count."""
        db = Mock()
        quota = UsageQuota(
            account_id="test-id",
            templates_applied_count=3,
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        db.query.return_value.filter.return_value.first.return_value = quota
        
        account = Account(id="test-id", plan="free")
        
        increment_template_quota(account, db)
        
        assert quota.templates_applied_count == 4
        db.commit.assert_called()


class TestQuotaEnforcement:
    """Test quota enforcement dependencies."""
    
    def test_enforce_qr_quota_raises_when_exceeded(self):
        """Test that enforce_qr_quota raises HTTPException when quota exceeded."""
        from fastapi import HTTPException
        
        db = Mock()
        account = Account(id="test-id", auth_sub="auth0|test", plan="free")
        quota = UsageQuota(
            account_id="test-id",
            qr_generated_count=50,  # At limit
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        
        db.query.return_value.filter.return_value.first.side_effect = [account, quota]
        
        user = {"sub": "auth0|test"}
        
        with pytest.raises(HTTPException) as exc_info:
            enforce_qr_quota(user, db)
        
        assert exc_info.value.status_code == 429
        assert "quota_exceeded" in str(exc_info.value.detail)
    
    def test_enforce_export_quota_raises_when_exceeded(self):
        """Test that enforce_export_quota raises HTTPException when quota exceeded."""
        from fastapi import HTTPException
        
        db = Mock()
        account = Account(id="test-id", auth_sub="auth0|test", plan="free")
        quota = UsageQuota(
            account_id="test-id",
            daily_exports=10,  # At daily limit
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        
        db.query.return_value.filter.return_value.first.side_effect = [account, quota]
        
        user = {"sub": "auth0|test"}
        
        with pytest.raises(HTTPException) as exc_info:
            enforce_export_quota(user, db)
        
        assert exc_info.value.status_code == 429
        assert "Daily export limit" in str(exc_info.value.detail)
    
    def test_enforce_template_quota_returns_account_when_ok(self):
        """Test that enforce_template_quota returns account when under limit."""
        db = Mock()
        account = Account(id="test-id", auth_sub="auth0|test", plan="free")
        quota = UsageQuota(
            account_id="test-id",
            templates_applied_count=2,  # Under limit
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow() + timedelta(days=30),
            daily_reset_at=datetime.utcnow()
        )
        
        db.query.return_value.filter.return_value.first.side_effect = [account, quota]
        
        user = {"sub": "auth0|test"}
        
        result = enforce_template_quota(user, db)
        
        assert result == account
    
    def test_enforce_quota_raises_404_when_account_not_found(self):
        """Test that enforce functions raise 404 when account not found."""
        from fastapi import HTTPException
        
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None
        
        user = {"sub": "auth0|nonexistent"}
        
        with pytest.raises(HTTPException) as exc_info:
            enforce_qr_quota(user, db)
        
        assert exc_info.value.status_code == 404
        assert "Account not found" in exc_info.value.detail


class TestQuotaDifferentPlans:
    """Test quota limits for different subscription plans."""
    
    def test_free_plan_limits(self):
        """Test that free plan has correct limits."""
        from apps.api.src.billing import get_quota_for_plan
        
        quota = get_quota_for_plan("free")
        
        assert quota["qr_month"] == 50
        assert quota["exports_day"] == 10
        assert quota["templates_apply"] == 5
    
    def test_pro_plan_limits(self):
        """Test that pro plan has correct limits."""
        from apps.api.src.billing import get_quota_for_plan
        
        quota = get_quota_for_plan("pro")
        
        assert quota["qr_month"] == 1000
        assert quota["exports_day"] == 100
        assert quota["templates_apply"] == 100
    
    def test_team_plan_limits(self):
        """Test that team plan has correct limits."""
        from apps.api.src.billing import get_quota_for_plan
        
        quota = get_quota_for_plan("team")
        
        assert quota["qr_month"] == 10000
        assert quota["exports_day"] == 1000
        assert quota["templates_apply"] == 1000
