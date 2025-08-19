-- Si se usa desde Supabase con RLS, desactiva RLS o define políticas de servicio.
alter table rooms disable row level security;
alter table room_sessions disable row level security;
alter table messages disable row level security;
alter table media disable row level security;
