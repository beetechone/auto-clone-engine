# Phase 6 (P6) - Analytics Events Specification

## Overview
This document specifies the event tracking system for analytics in Phase 6.

## Event Types

### 1. Create Event
**Type:** `create`
**Description:** Triggered when a user creates a new QR code
**Metadata:**
- `type`: QR code type (url, text, wifi, vcard, event)
- `options`: Customization options used
- `source`: Creation source (editor, template, api)

**Example:**
```json
{
  "type": "create",
  "user_id": "uuid",
  "item_id": "uuid",
  "meta": {
    "type": "url",
    "options": {"color": "#000000"},
    "source": "editor"
  },
  "created_at": "2025-10-27T00:00:00Z"
}
```

### 2. Export Event
**Type:** `export`
**Description:** Triggered when a user exports/downloads a QR code
**Metadata:**
- `format`: Export format (png, svg, pdf)
- `size`: Image size for PNG exports
- `quality`: Quality setting

**Example:**
```json
{
  "type": "export",
  "user_id": "uuid",
  "item_id": "uuid",
  "meta": {
    "format": "png",
    "size": "1000x1000",
    "quality": "high"
  },
  "created_at": "2025-10-27T00:00:00Z"
}
```

### 3. Scan Event
**Type:** `scan`
**Description:** Triggered when a QR code is scanned via shortlink redirect
**Metadata:**
- `code`: Shortlink code used
- `target_url`: URL redirected to
- `referrer`: HTTP referrer (if available)
- `country`: Geo-location (if available)

**Additional Fields:**
- `ip_address`: Client IP address (anonymized)
- `user_agent`: Browser user agent string

**Example:**
```json
{
  "type": "scan",
  "user_id": null,
  "item_id": "uuid",
  "meta": {
    "code": "abc123",
    "target_url": "https://example.com",
    "referrer": "https://google.com"
  },
  "ip_address": "192.168.1.xxx",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-10-27T00:00:00Z"
}
```

## Database Schema

### qr_events Table
```sql
CREATE TABLE qr_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR NOT NULL CHECK (type IN ('create', 'export', 'scan')),
  user_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  item_id UUID REFERENCES qr_items(id) ON DELETE SET NULL,
  meta JSONB DEFAULT '{}',
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_qr_events_type ON qr_events(type, created_at);
CREATE INDEX idx_qr_events_user ON qr_events(user_id, created_at);
CREATE INDEX idx_qr_events_item ON qr_events(item_id, created_at);
```

### shortlinks Table
```sql
CREATE TABLE shortlinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  qr_item_id UUID NOT NULL REFERENCES qr_items(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  scan_count INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shortlinks_code ON shortlinks(code);
CREATE INDEX idx_shortlinks_qr_item ON shortlinks(qr_item_id);
```

## API Endpoints

### GET /r/{code}
**Description:** Redirect shortlink and record scan event
**Authentication:** None (public)
**Rate Limit:** 200 requests/minute per IP

**Response:**
- `302 Found`: Successful redirect with Location header
- `404 Not Found`: Shortlink does not exist

**Behavior:**
1. Look up shortlink by code
2. Record scan event (idempotent)
3. Increment scan count
4. Return 302 redirect to target URL

### GET /analytics/summary
**Description:** Get analytics summary for current user
**Authentication:** Required (JWT)
**Rate Limit:** 60 requests/minute per user

**Response:**
```json
{
  "total_creates": 100,
  "total_exports": 50,
  "total_scans": 200,
  "creates_this_week": 10,
  "exports_this_week": 5,
  "scans_this_week": 20,
  "creates_this_month": 30,
  "exports_this_month": 15,
  "scans_this_month": 60
}
```

**Caching:** 5 minutes (Redis)

### GET /analytics/timeseries
**Description:** Get time series data for charts
**Authentication:** Required (JWT)
**Rate Limit:** 60 requests/minute per user

**Query Parameters:**
- `period`: "daily" or "weekly" (default: "daily")
- `days`: Number of days (1-365, default: 30)

**Response:**
```json
{
  "period": "daily",
  "data": [
    {
      "date": "2025-10-27",
      "creates": 5,
      "exports": 3,
      "scans": 10
    }
  ]
}
```

**Caching:** 5 minutes (Redis)

### GET /analytics/events
**Description:** Get detailed event list
**Authentication:** Required (JWT)
**Rate Limit:** 60 requests/minute per user

**Query Parameters:**
- `event_type`: Filter by type (create|export|scan)
- `limit`: Results per page (1-1000, default: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "scan",
    "user_id": "uuid",
    "item_id": "uuid",
    "meta": {},
    "created_at": "2025-10-27T00:00:00Z"
  }
]
```

## Privacy & Security

### Data Collection
- **Scan Events:** IP addresses are collected but anonymized (last octet removed)
- **User Agents:** Stored for analytics but not exposed in public APIs
- **Geo-location:** Optional, requires user consent

### Data Retention
- Events are retained for 365 days
- After 365 days, events are aggregated and raw data is deleted
- Aggregated data is retained indefinitely

### Access Control
- Users can only view analytics for their own QR codes
- Scan events from public shortlinks are anonymous (no user_id)
- Admin users can view aggregate analytics across all users

## Performance Considerations

### Caching Strategy
- Summary data cached for 5 minutes
- Time series data cached for 5 minutes
- Cache invalidation on new events (optional)

### Database Optimization
- Indexes on type, user_id, item_id, and created_at
- Partitioning by created_at for large datasets
- Regular vacuum and analyze

### Rate Limiting
- Public endpoints: 200 req/min per IP
- Authenticated endpoints: 60 req/min per user
- Shortlink redirects: 200 req/min per IP

## Monitoring & Observability

### Metrics to Track
- Event ingestion rate (events/second)
- Scan conversion rate (scans/creates)
- Export rate (exports/creates)
- API response times (p50, p95, p99)
- Cache hit rate

### Alerts
- High scan rate (potential abuse)
- Low cache hit rate (< 80%)
- API response time > 500ms (p95)
- Event ingestion errors

### Logging
All events are logged with structured JSON:
```json
{
  "event": "scan_recorded",
  "trace_id": "abc123",
  "code": "xyz789",
  "scan_count": 42,
  "response_time_ms": 45
}
```

## Error Budgets

### Target SLOs
- **Availability:** 99.9% uptime
- **Latency (p95):** < 500ms for analytics endpoints
- **Latency (p95):** < 200ms for shortlink redirects
- **Error Rate:** < 0.1% for all endpoints

### Error Budget Calculation
- Monthly error budget: 43 minutes downtime
- Daily error budget: 1.4 minutes downtime
- Hourly error budget: 3.6 seconds downtime

### Budget Exhaustion Response
When error budget is exhausted:
1. Create GitHub issue with "perf regression" label
2. Halt new feature development
3. Focus on stability and performance
4. Conduct root cause analysis
5. Implement fixes and optimizations

## Testing Strategy

### Unit Tests
- Event recording functions
- Analytics aggregation logic
- Cache operations
- Rate limiting

### Integration Tests
- End-to-end event flow
- Analytics API responses
- Shortlink redirects
- Cache invalidation

### Performance Tests
- k6 load tests (50 concurrent users)
- k6 smoke tests (basic functionality)
- Lighthouse CI (performance scores)

### Acceptance Criteria
- All unit tests passing
- E2E tests passing
- Load tests meeting SLOs
- Lighthouse scores ≥ 85
- No security vulnerabilities (CodeQL)

## Future Enhancements

### Phase 7 (Planned)
- Real-time analytics dashboard
- Custom date ranges
- Export analytics to CSV/PDF
- Funnel analysis (create → export → scan)
- A/B testing support
- Custom events API

### Phase 8 (Planned)
- Geo-location tracking
- Device type analytics
- Referrer analytics
- Campaign tracking
- Integration with Google Analytics
- Webhook notifications for events
