create table if not exists rooms (
  id uuid primary key,
  password_hash text not null,
  magic_token uuid unique not null,
  media_dir text not null,
  archive_path text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists room_sessions (
  id bigserial primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  joined_at timestamptz not null default now(),
  ip text,
  user_agent text
);

create table if not exists messages (
  id bigserial primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists media (
  id bigserial primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  file_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now()
);

