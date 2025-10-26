-- Phase 1-2: Basic schema
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  auth_sub text unique not null, -- Auth0 subject ID
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Phase 3: QR Items with soft-delete
create table if not exists qr_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references accounts(id) on delete cascade,
  name text not null,
  type text not null check (type in ('url', 'text', 'wifi', 'vcard', 'event')),
  payload jsonb not null, -- QR code data (url, text, wifi credentials, etc.)
  options jsonb not null default '{}'::jsonb, -- customization options (colors, logo, etc.)
  folder_id uuid references folders(id) on delete set null,
  deleted_at timestamptz, -- soft delete timestamp
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Phase 3: Folders for organization
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references accounts(id) on delete cascade,
  name text not null,
  parent_id uuid references folders(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_folder_name_per_user unique (owner_id, name, parent_id)
);

-- Phase 3: Tags for categorization
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references accounts(id) on delete cascade,
  name text not null,
  color text default '#0070f3',
  created_at timestamptz default now(),
  constraint unique_tag_name_per_user unique (owner_id, name)
);

-- Phase 3: QR Items <-> Tags many-to-many
create table if not exists qr_item_tags (
  qr_item_id uuid references qr_items(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (qr_item_id, tag_id)
);

-- Phase 3: Audit log for tracking changes
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references accounts(id) on delete set null,
  action text not null, -- create, update, delete, restore, export
  resource_type text not null, -- qr_item, folder, tag
  resource_id uuid not null,
  extra_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_qr_items_owner on qr_items(owner_id) where deleted_at is null;
create index idx_qr_items_deleted on qr_items(owner_id, deleted_at) where deleted_at is not null;
create index idx_qr_items_folder on qr_items(folder_id) where deleted_at is null;
create index idx_folders_owner on folders(owner_id);
create index idx_tags_owner on tags(owner_id);
create index idx_audit_log_user on audit_log(user_id, created_at desc);
