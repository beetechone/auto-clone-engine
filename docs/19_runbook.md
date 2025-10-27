# Operations Runbook - QR Clone Engine

**Version**: 1.0.0  
**Last Updated**: October 27, 2025  
**Owner**: DevOps Team

## Table of Contents
1. [System Overview](#system-overview)
2. [Backup & Restore](#backup--restore)
3. [Secret Rotation](#secret-rotation)
4. [Webhook Replay](#webhook-replay)
5. [Quota Tuning](#quota-tuning)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Troubleshooting](#troubleshooting)
8. [Deployment](#deployment)
9. [Emergency Procedures](#emergency-procedures)

---

## System Overview

### Architecture
- **Web App**: Next.js frontend (port 3000)
- **Admin App**: Next.js admin dashboard (port 3001)
- **API**: FastAPI backend (port 8000)
- **Database**: PostgreSQL (port 5432)
- **Cache**: Redis (port 6379)
- **Storage**: MinIO S3-compatible (port 9000)
- **Mail**: MailHog for development (port 8025)

### Services
```bash
# Check all services status
make logs

# Individual service logs
docker compose logs -f api
docker compose logs -f web
docker compose logs -f admin
docker compose logs -f db
docker compose logs -f redis
docker compose logs -f minio
```

---

## Backup & Restore

### Database Backup

#### Manual Backup
```bash
# Create timestamped backup
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker compose exec -T db pg_dump -U qr_user qr_db > "backups/$BACKUP_FILE"

# Compress backup
gzip "backups/$BACKUP_FILE"

# Verify backup
gunzip -c "backups/${BACKUP_FILE}.gz" | head -20
```

#### Automated Daily Backup
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/auto-clone-engine && docker compose exec -T db pg_dump -U qr_user qr_db | gzip > "backups/backup_$(date +\%Y\%m\%d).sql.gz"

# Keep only last 30 days of backups
0 3 * * * find /path/to/auto-clone-engine/backups -name "backup_*.sql.gz" -mtime +30 -delete
```

### Database Restore

```bash
# Stop API to prevent writes during restore
docker compose stop api

# Restore from backup
gunzip -c "backups/backup_20251027.sql.gz" | docker compose exec -T db psql -U qr_user qr_db

# Restart services
docker compose up -d

# Verify restoration
docker compose exec db psql -U qr_user qr_db -c "SELECT COUNT(*) FROM accounts;"
docker compose exec db psql -U qr_user qr_db -c "SELECT COUNT(*) FROM qr_items;"
```

### Redis Backup

```bash
# Redis automatically creates dump.rdb
# Manual save
docker compose exec redis redis-cli SAVE

# Copy RDB file
docker compose cp redis:/data/dump.rdb backups/redis_$(date +%Y%m%d).rdb

# Restore Redis
docker compose stop redis
docker compose cp backups/redis_20251027.rdb redis:/data/dump.rdb
docker compose start redis
```

### MinIO/S3 Backup

```bash
# Install MinIO client (mc)
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configure MinIO client
mc alias set local http://localhost:9000 minioadmin minioadmin

# Backup bucket
mc mirror local/qr-exports backups/minio/qr-exports_$(date +%Y%m%d)/

# Restore bucket
mc mirror backups/minio/qr-exports_20251027/ local/qr-exports
```

### Full System Backup

```bash
# Create backup directory
mkdir -p backups/full_$(date +%Y%m%d)

# Backup database
docker compose exec -T db pg_dump -U qr_user qr_db | gzip > backups/full_$(date +%Y%m%d)/database.sql.gz

# Backup Redis
docker compose exec redis redis-cli SAVE
docker compose cp redis:/data/dump.rdb backups/full_$(date +%Y%m%d)/redis.rdb

# Backup MinIO
mc mirror local/qr-exports backups/full_$(date +%Y%m%d)/minio/

# Backup environment files
cp .env.local backups/full_$(date +%Y%m%d)/env.backup

# Create tarball
tar -czf backups/full_backup_$(date +%Y%m%d).tar.gz backups/full_$(date +%Y%m%d)/

# Upload to remote storage (optional)
# aws s3 cp backups/full_backup_$(date +%Y%m%d).tar.gz s3://my-backup-bucket/
```

---

## Secret Rotation

### Auth0 Secrets Rotation

#### Step 1: Update Auth0 Configuration
```bash
# 1. Log into Auth0 Dashboard
# 2. Navigate to Applications > Your App > Settings
# 3. Rotate Client Secret (copy new secret)
```

#### Step 2: Update Environment Variables
```bash
# Edit .env.local
nano .env.local

# Update these values:
# AUTH0_DOMAIN=your-new-tenant.auth0.com (if domain changed)
# AUTH0_AUDIENCE=https://api.qr-cloner.local
# AUTH0_CLIENT_SECRET=new_secret_here (if using client credentials)
```

#### Step 3: Restart Services
```bash
# Restart API to pick up new secrets
docker compose restart api

# Verify authentication still works
curl -H "Authorization: Bearer valid_token" http://localhost:8000/secure/ping
```

### Stripe Secrets Rotation

#### Step 1: Generate New Keys
```bash
# 1. Log into Stripe Dashboard
# 2. Navigate to Developers > API keys
# 3. Click "Reveal test key" or "Generate new key"
# 4. Copy new Secret Key
```

#### Step 2: Update Environment
```bash
# Edit .env.local
nano .env.local

# Update:
# STRIPE_SECRET_KEY=sk_test_new_key_here
```

#### Step 3: Update Webhook Secret
```bash
# If using Stripe CLI for local testing
stripe listen --forward-to localhost:8000/billing/webhook

# Copy new webhook secret from CLI output
# Update .env.local:
# STRIPE_WEBHOOK_SECRET=whsec_new_secret_here
```

#### Step 4: Restart and Verify
```bash
docker compose restart api

# Test webhook
stripe trigger checkout.session.completed
```

### Database Password Rotation

```bash
# 1. Connect to database
docker compose exec db psql -U postgres

# 2. Change password
ALTER USER qr_user WITH PASSWORD 'new_secure_password';

# 3. Update .env.local
nano .env.local
# DATABASE_URL=postgresql://qr_user:new_secure_password@db:5432/qr_db

# 4. Restart services
docker compose restart api
```

### Redis Password Rotation

```bash
# 1. Edit docker-compose.yml or set in .env.local
# REDIS_PASSWORD=new_redis_password

# 2. Update Redis configuration
# Add to docker-compose.yml:
# redis:
#   command: redis-server --requirepass new_redis_password

# 3. Update application config
# REDIS_URL=redis://:new_redis_password@redis:6379/0

# 4. Restart services
docker compose up -d
```

---

## Webhook Replay

### Stripe Webhook Replay

#### Using Stripe Dashboard
```bash
# 1. Log into Stripe Dashboard
# 2. Navigate to Developers > Webhooks
# 3. Select your webhook endpoint
# 4. Click on a specific event
# 5. Click "Send test webhook"
```

#### Using Stripe CLI
```bash
# Replay specific event
stripe events resend evt_1234567890abcdef

# Replay events from a date range
stripe events list --created-gt 1698393600 | jq -r '.data[].id' | xargs -I {} stripe events resend {}

# Test specific event types
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
```

#### Manual Webhook Replay via API
```bash
# Fetch event from Stripe
STRIPE_EVENT=$(stripe events retrieve evt_1234567890abcdef --format json)

# Replay to local endpoint
curl -X POST http://localhost:8000/billing/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: $(echo $STRIPE_EVENT | openssl dgst -sha256 -hmac $STRIPE_WEBHOOK_SECRET)" \
  -d "$STRIPE_EVENT"
```

### Check Webhook Logs
```bash
# View webhook processing logs
docker compose logs -f api | grep "webhook"

# Check for failed webhooks
docker compose exec db psql -U qr_user qr_db -c "
  SELECT created_at, event_type, status, error_message 
  FROM webhook_logs 
  WHERE status = 'failed' 
  ORDER BY created_at DESC 
  LIMIT 10;
"
```

---

## Quota Tuning

### Database Connection Pool

```python
# apps/api/src/config.py
SQLALCHEMY_POOL_SIZE = 20          # Increase for high traffic
SQLALCHEMY_MAX_OVERFLOW = 40       # Allow temporary overflow
SQLALCHEMY_POOL_TIMEOUT = 30       # Connection timeout in seconds
SQLALCHEMY_POOL_RECYCLE = 3600     # Recycle connections hourly
```

### Redis Connection Pool

```python
# apps/api/src/cache.py
redis_pool = redis.ConnectionPool(
    host=REDIS_HOST,
    port=6379,
    db=0,
    max_connections=50,            # Increase for high concurrency
    socket_timeout=5,
    socket_connect_timeout=5
)
```

### Rate Limiting Tuning

```python
# apps/api/src/rate_limit.py
RATE_LIMITS = {
    "/r/*": "200/minute",          # Shortlink redirects
    "/analytics/*": "60/minute",   # Analytics queries
    "/library/*": "100/minute",    # Library operations
    "/billing/*": "30/minute",     # Billing operations
}

# Adjust based on load:
# - Increase limits during peak hours
# - Decrease during maintenance
# - Add per-IP limits for public endpoints
```

### API Workers (Uvicorn)

```yaml
# docker-compose.yml
api:
  command: uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
  # --workers = (2 x CPU cores) + 1
  # For 8 cores: --workers 17
```

### Database Query Performance

```sql
-- Add indexes for slow queries
CREATE INDEX CONCURRENTLY idx_qr_items_owner_created 
  ON qr_items(owner_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_qr_events_type_created 
  ON qr_events(type, created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE 
SELECT * FROM qr_items 
WHERE owner_id = 'user-uuid' 
ORDER BY created_at DESC 
LIMIT 20;
```

### Cache TTL Tuning

```python
# apps/api/src/analytics.py
CACHE_TTL_SUMMARY = 300        # 5 minutes (increase for less frequent updates)
CACHE_TTL_TIMESERIES = 300     # 5 minutes
CACHE_TTL_PLANS = 3600         # 1 hour (plans rarely change)

# Invalidate cache on write operations
await cache.delete(f"analytics:summary:{user_id}")
```

---

## Monitoring & Alerts

### Health Checks

```bash
# API health check
curl http://localhost:8000/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-27T10:00:00Z"}

# Database health
docker compose exec db pg_isready -U qr_user

# Redis health
docker compose exec redis redis-cli PING
```

### Prometheus Metrics (Future Enhancement)

```python
# apps/api/src/metrics.py (to be implemented)
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
http_requests_total = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
http_request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')

# Business metrics
qr_codes_created = Counter('qr_codes_created_total', 'Total QR codes created')
qr_codes_scanned = Counter('qr_codes_scanned_total', 'Total QR codes scanned')

# System metrics
database_connections = Gauge('database_connections_active', 'Active database connections')
cache_hit_rate = Gauge('cache_hit_rate', 'Cache hit rate')
```

### Log Aggregation

```bash
# Centralized logging with structured JSON
docker compose logs -f | jq -r 'select(.level == "ERROR")'

# Query logs for specific user
docker compose logs -f api | jq -r 'select(.user_id == "user-uuid")'

# Track API response times
docker compose logs -f api | jq -r 'select(.duration_ms > 1000)'
```

### Alert Thresholds

```yaml
# alerts.yml (for Prometheus Alertmanager)
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: DatabaseConnectionPoolExhausted
        expr: database_connections_active > 18
        for: 2m
        annotations:
          summary: "Database connection pool near capacity"
          
      - alert: SlowQueries
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2.0
        for: 5m
        annotations:
          summary: "95th percentile response time > 2s"
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service status
docker compose ps

# Check logs for errors
docker compose logs api

# Common issues:
# 1. Port already in use
sudo lsof -i :8000
sudo kill -9 <PID>

# 2. Database not ready
docker compose restart db
sleep 5
docker compose up -d

# 3. Missing environment variables
cat .env.local
make init
```

### Database Connection Issues

```bash
# Test database connectivity
docker compose exec db psql -U qr_user qr_db -c "SELECT 1;"

# Check connections
docker compose exec db psql -U qr_user qr_db -c "
  SELECT count(*) FROM pg_stat_activity 
  WHERE datname = 'qr_db';
"

# Kill idle connections
docker compose exec db psql -U qr_user qr_db -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = 'qr_db' AND state = 'idle' AND state_change < now() - interval '30 minutes';
"
```

### Redis Connection Issues

```bash
# Test Redis connectivity
docker compose exec redis redis-cli PING

# Check memory usage
docker compose exec redis redis-cli INFO memory

# Clear cache if needed
docker compose exec redis redis-cli FLUSHDB
```

### High Memory Usage

```bash
# Check container memory
docker stats

# Restart memory-hungry service
docker compose restart api

# Increase memory limits in docker-compose.yml
api:
  deploy:
    resources:
      limits:
        memory: 1G
```

### Slow Queries

```bash
# Enable slow query log in PostgreSQL
docker compose exec db psql -U postgres -c "
  ALTER SYSTEM SET log_min_duration_statement = 1000;
  SELECT pg_reload_conf();
"

# View slow queries
docker compose logs db | grep "duration:"

# Analyze query plan
docker compose exec db psql -U qr_user qr_db -c "
  EXPLAIN ANALYZE SELECT * FROM qr_items ORDER BY created_at DESC LIMIT 20;
"
```

---

## Deployment

### Production Checklist

- [ ] Update environment variables for production
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS for production domain
- [ ] Set up database backups
- [ ] Configure monitoring and alerts
- [ ] Review security headers
- [ ] Test disaster recovery procedures
- [ ] Document runbook updates

### Zero-Downtime Deployment

```bash
# 1. Pull latest changes
git pull origin main

# 2. Build new images
docker compose build

# 3. Run database migrations (if any)
# docker compose exec api python -m alembic upgrade head

# 4. Rolling restart services
docker compose up -d --no-deps --build api
sleep 10
docker compose up -d --no-deps --build web
docker compose up -d --no-deps --build admin

# 5. Verify health
curl http://localhost:8000/health
curl http://localhost:3000/
```

---

## Emergency Procedures

### API Service Down

```bash
# 1. Check logs
docker compose logs --tail=100 api

# 2. Restart service
docker compose restart api

# 3. If restart fails, rebuild
docker compose up -d --build api

# 4. Verify health
curl http://localhost:8000/health
```

### Database Corruption

```bash
# 1. Stop all services
docker compose stop

# 2. Backup current state
docker compose cp db:/var/lib/postgresql/data backups/db_corrupted_$(date +%Y%m%d)/

# 3. Restore from latest backup
gunzip -c backups/backup_latest.sql.gz | docker compose exec -T db psql -U qr_user qr_db

# 4. Restart services
docker compose up -d
```

### Complete System Failure

```bash
# 1. Stop all services
docker compose down

# 2. Restore from full backup
tar -xzf backups/full_backup_20251027.tar.gz

# 3. Restore database
gunzip -c backups/full_20251027/database.sql.gz | docker compose exec -T db psql -U qr_user qr_db

# 4. Restore Redis
docker compose cp backups/full_20251027/redis.rdb redis:/data/dump.rdb

# 5. Restore MinIO
mc mirror backups/full_20251027/minio/ local/qr-exports

# 6. Start services
docker compose up -d

# 7. Verify all services
make test
```

---

## Contact Information

**On-Call Engineer**: devops@example.com  
**Escalation**: engineering-lead@example.com  
**Documentation**: https://github.com/beetechone/auto-clone-engine

---

**Document Version**: 1.0.0  
**Last Review**: October 27, 2025  
**Next Review**: January 27, 2026
