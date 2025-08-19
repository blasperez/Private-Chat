alter table rooms add column if not exists max_participants integer not null default 10;
alter table room_sessions add column if not exists display_name text;


