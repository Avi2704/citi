-- DEMO DATA ONLY (development)
-- Insert demo teams and vehicles after creating demo auth users/profiles.

insert into public.vehicles (id, vehicle_number, capacity_kg, type, active)
values
  ('00000000-0000-0000-0000-000000000101', 'MH-XX-1001', 1000, 'truck', true),
  ('00000000-0000-0000-0000-000000000102', 'MH-XX-1002', 1500, 'truck', true),
  ('00000000-0000-0000-0000-000000000103', 'MH-XX-1003', 800, 'mini-truck', true)
on conflict do nothing;

insert into public.collection_teams (id, name, phone, vehicle_id, capacity_kg, active)
values
  ('00000000-0000-0000-0000-000000000201', 'DEMO DATA - North Zone Team 01', '+91-9000000001', '00000000-0000-0000-0000-000000000101', 1000, true),
  ('00000000-0000-0000-0000-000000000202', 'DEMO DATA - East Zone Team 02', '+91-9000000002', '00000000-0000-0000-0000-000000000102', 1500, true),
  ('00000000-0000-0000-0000-000000000203', 'DEMO DATA - South Zone Team 03', '+91-9000000003', '00000000-0000-0000-0000-000000000103', 800, true)
on conflict do nothing;

-- Add demo reports manually with demo citizen IDs once auth users are available.
