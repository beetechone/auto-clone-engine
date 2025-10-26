# SRS - Software Requirements Specification

## Functional Requirements

### Phase 3: Library & Dashboard (Current)

#### FR-LIB-001: QR Code Library Management
- MUST: Users can view list of saved QR codes
- MUST: Users can search QR codes by name
- MUST: Users can sort QR codes by date, name, type
- MUST: Pagination support (20 items per page)
- MUST: Ownership isolation (users only see their own QR codes)

#### FR-LIB-002: QR Code CRUD Operations
- MUST: Users can create new QR codes from Editor
- MUST: Users can update existing QR codes
- MUST: Users can soft-delete QR codes (recoverable)
- MUST: Users can restore deleted QR codes
- MUST: Users can permanently delete QR codes after 30 days
- MUST: Users can duplicate QR codes

#### FR-LIB-003: Organization Features
- SHOULD: Users can create folders to organize QR codes
- SHOULD: Users can assign tags to QR codes
- SHOULD: Users can filter by folder or tag
- SHOULD: Users can move QR codes between folders

#### FR-LIB-004: Export & Actions
- MUST: Users can export saved QR codes (PNG/SVG)
- MUST: Users can view QR code details
- MUST: Users can edit QR codes from library
- MUST: Save from Editor updates existing or creates new item

#### FR-LIB-005: Access Control
- MUST: Guest users cannot access library (redirect to login)
- MUST: Authenticated users can only access their own items
- MUST: API endpoints require valid JWT token

## Previous Phases

### Phase 1-2: Foundation (Completed)
- MUST: QR URL/Text/Wi-Fi/vCard/Event; PNG/SVG; account; save; basic analytics
- SHOULD: Templates; PDF; folders; Stripe billing
- COULD: Teams; custom domains; shortlinks

## Non-Functional Requirements
- NFR: Perf TTI<2s P95; TTFB<500ms; WCAG AA; OWASP ASVS L2
- NFR: Database queries with pagination <100ms P95
- NFR: Soft-delete for data recovery and audit trail
- NFR: Structured JSON logging for all CRUD operations
