create index if not exists idx_messages_room_created on messages(room_id, created_at);
create index if not exists idx_media_room_uploaded on media(room_id, uploaded_at);
