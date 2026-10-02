-- WasteFlow AI initial schema
create extension if not exists "uuid-ossp";

create type user_role as enum ('citizen', 'admin', 'collection_staff');
create type report_status as enum (
  'submitted',
  'ai_analyzed',
  'pending_verification',
  'verified',
  'assigned',
  'scheduled',
  'in_progress',
  'collected',
  'resolved',
  'rejected',
  'pending_manual_review'
);
create type report_priority as enum ('low', 'medium', 'high', 'critical');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  phone text,
  role user_role not null default 'citizen',
  created_at timestamptz not null default now()
);

create table if not exists public.waste_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  title text not null,
  description text not null,
  category text,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  image_url text not null,
  status report_status not null default 'submitted',
  priority report_priority not null default 'low',
  ai_confidence double precision,
  estimated_volume double precision,
  ai_summary text,
  recommended_action text,
  duplicate_group_id uuid,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_analysis (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.waste_reports(id) on delete cascade,
  waste_type text not null,
  estimated_volume double precision not null check (estimated_volume >= 0),
  severity text not null,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  hazards_detected text[] not null default '{}',
  visual_description text not null,
  recommended_action text not null,
  reasoning_summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.waste_images (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.waste_reports(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.duplicate_groups (
  id uuid primary key default gen_random_uuid(),
  latitude_center double precision not null,
  longitude_center double precision not null,
  report_count integer not null default 1,
  category text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.waste_reports
  add constraint fk_duplicate_group
  foreign key (duplicate_group_id) references public.duplicate_groups(id);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_number text not null unique,
  capacity_kg double precision not null check (capacity_kg > 0),
  type text,
  active boolean not null default true,
  current_latitude double precision,
  current_longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  staff_user_id uuid references public.profiles(id),
  phone text,
  vehicle_id uuid references public.vehicles(id),
  capacity_kg double precision,
  active boolean not null default true,
  current_latitude double precision,
  current_longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.waste_reports(id) on delete cascade,
  team_id uuid not null references public.collection_teams(id),
  vehicle_id uuid references public.vehicles(id),
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  scheduled_for timestamptz,
  status text not null default 'assigned'
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  route_name text not null,
  team_id uuid not null references public.collection_teams(id),
  vehicle_id uuid not null references public.vehicles(id),
  start_latitude double precision not null,
  start_longitude double precision not null,
  total_distance_km double precision not null,
  estimated_duration_minutes integer not null,
  total_estimated_weight double precision not null,
  status text not null default 'scheduled',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  report_id uuid not null references public.waste_reports(id) on delete cascade,
  stop_order integer not null,
  latitude double precision not null,
  longitude double precision not null,
  estimated_weight double precision not null default 0,
  completed boolean not null default false,
  completed_at timestamptz
);

create table if not exists public.resolution_proofs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.waste_reports(id) on delete cascade,
  image_url text not null,
  notes text,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.waste_reports(id) on delete cascade,
  old_status report_status,
  new_status report_status not null,
  changed_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid references public.waste_reports(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_waste_reports_user_id on public.waste_reports(user_id);
create index if not exists idx_waste_reports_created_at on public.waste_reports(created_at desc);
create index if not exists idx_waste_reports_status on public.waste_reports(status);
create index if not exists idx_assignments_team_id on public.assignments(team_id);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_waste_reports_updated_at on public.waste_reports;
create trigger set_waste_reports_updated_at
before update on public.waste_reports
for each row execute procedure public.handle_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'citizen')
  )
  on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.waste_reports enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.waste_images enable row level security;
alter table public.duplicate_groups enable row level security;
alter table public.collection_teams enable row level security;
alter table public.vehicles enable row level security;
alter table public.assignments enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.resolution_proofs enable row level security;
alter table public.report_status_history enable row level security;
alter table public.notifications enable row level security;

create or replace function public.current_role()
returns user_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create policy "profiles self read" on public.profiles
for select using (id = auth.uid() or public.current_role() = 'admin');

create policy "profiles self update" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "reports citizen create" on public.waste_reports
for insert with check (user_id = auth.uid());

create policy "reports citizen read own" on public.waste_reports
for select using (
  user_id = auth.uid()
  or public.current_role() = 'admin'
  or exists (
    select 1
    from public.assignments a
    join public.collection_teams ct on ct.id = a.team_id
    where a.report_id = waste_reports.id and ct.staff_user_id = auth.uid()
  )
);

create policy "reports admin update" on public.waste_reports
for update using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

create policy "ai analysis read allowed" on public.ai_analysis
for select using (
  exists (
    select 1
    from public.waste_reports wr
    where wr.id = ai_analysis.report_id
      and (
        wr.user_id = auth.uid()
        or public.current_role() = 'admin'
        or exists (
          select 1
          from public.assignments a
          join public.collection_teams ct on ct.id = a.team_id
          where a.report_id = wr.id and ct.staff_user_id = auth.uid()
        )
      )
  )
);

create policy "ai analysis admin write" on public.ai_analysis
for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "staff resolution proofs" on public.resolution_proofs
for insert with check (
  uploaded_by = auth.uid() and (
    public.current_role() = 'admin'
    or public.current_role() = 'collection_staff'
  )
);

create policy "resolution proof read" on public.resolution_proofs
for select using (
  public.current_role() = 'admin'
  or exists (
    select 1 from public.waste_reports wr where wr.id = resolution_proofs.report_id and wr.user_id = auth.uid()
  )
  or uploaded_by = auth.uid()
);

create policy "notifications owner access" on public.notifications
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
