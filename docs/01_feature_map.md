# Feature Map

## Discovered Features from Target Site
Target: https://qr-generator.ai/
Crawl Depth: 3
Last Updated: 2025-10-26

### Core Features (Phase 2 - Page/Flow Parity)
- **QR Code Generation**: URL, Text, Wi-Fi, vCard, Event types
- **Editor**: Input forms, customization options
- **Export**: PNG, SVG formats
- **Preview**: Real-time QR code preview

### Pages and Routes
1. **Home (/)**: Main QR editor interface with preview
2. **Pricing (/pricing)**: Billing plans display with checkout flow
3. **Editor (/editor)**: Dedicated QR code creation and customization page
4. **Templates (/templates)**: Pre-configured QR code templates gallery
5. **Dashboard (/dashboard)**: User's saved QR codes library
6. **Login (/login)**: User authentication
7. **Sign Up (/signup)**: User registration

### Account & Billing (Phase 1 - Completed)
- **Authentication**: Auth0 JWT-based auth
- **Billing Plans**: Free, Pro, Team tiers
- **Checkout**: Stripe integration
- **Webhooks**: Payment event handling

### Advanced Features (Phase 3-6)
- **Library/Dashboard** (Phase 3 - Current):
  - Saved QR codes list with preview
  - Search and sort QR codes by name, type, date
  - Pagination for large collections
  - Folders for organization
  - Tags for categorization
  - Soft delete with restore capability
  - Duplicate QR codes
  - Export existing QR codes again
  - Save from Editor integration
  - Detail view for individual QR codes
- **Analytics**: Scan tracking
- **Templates**: Pre-configured QR styles
- **Admin**: User management, analytics dashboard
- **Teams**: Multi-user collaboration
- **Custom Domains**: Branded short URLs

## Phase 3 Backlog - Library & Dashboard

### Library List (LIBRARY-001)
- Display all saved QR codes for authenticated user
- Table view with columns: Preview, Name, Type, Created, Scans, Actions
- Pagination (default 20 per page)
- Guest users: show "Please log in" message

### Detail View (LIBRARY-002)
- Individual QR code detail page at /dashboard/items/[id]
- Show full QR code, metadata, creation date
- Actions: Edit, Duplicate, Delete, Export

### Bulk Actions (LIBRARY-003)
- Select multiple QR codes
- Bulk delete/restore
- Bulk move to folder
- Bulk tag assignment

### Folders & Tags (LIBRARY-004)
- Create, rename, delete folders
- Organize QR codes into folders
- Add/remove tags to QR codes
- Filter by folder or tag

### Search & Sort (LIBRARY-005)
- Search by name or content
- Sort by: name, date created, type, scans
- Filter by: type, folder, tags, deleted status

### Save from Editor (LIBRARY-006)
- "Save" button in Editor
- Creates new QR item in library
- "Update" for existing items
- Redirect to Dashboard after save

## MoSCoW Prioritization
- **MUST**: QR generation (URL/Text), PNG/SVG export, basic auth, billing plans, route parity
- **SHOULD**: Templates, PDF export, folders, analytics
- **COULD**: Teams, custom domains, shortlinks
- **WON'T**: Mobile apps (web-only for now)