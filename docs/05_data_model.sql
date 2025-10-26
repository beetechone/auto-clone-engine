create table if not exists accounts (
  id uuid primary key,
  email text unique not null,
  password_hash text not null,
  plan text default 'free',
  created_at timestamptz default now()
);
create table if not exists qr_items (
  id uuid primary key,
  owner_id uuid references accounts(id),
  type text not null,
  payload jsonb not null,
  options jsonb not null,
  created_at timestamptz default now()
);
