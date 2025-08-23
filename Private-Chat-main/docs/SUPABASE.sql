create table if not exists public.rooms (
  id bigserial primary key,
  room_id text not null,
  created_at timestamp with time zone default now(),
  created_at_iso text,
  closed_at_iso text,
  messages_encrypted jsonb,
  participants jsonb
);

create index if not exists rooms_room_id_idx on public.rooms (room_id);

-- Considera RLS según tus necesidades; para inserciones desde el servidor usa Service Role.



