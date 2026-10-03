create table if not exists public.recruitment_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name varchar(255) not null check (char_length(trim(full_name)) between 2 and 255),
  student_id varchar(50) not null unique check (char_length(trim(student_id)) between 2 and 50),
  department varchar(40) not null check (
    department in ('CSE', 'EEE', 'Textile Engineering', 'IPE', 'FDAE')
  ),
  whatsapp_num varchar(20) not null check (char_length(trim(whatsapp_num)) between 8 and 20),
  email varchar(255) not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  photo_url text not null,
  segments text[] not null check (
    cardinality(segments) > 0
    and segments <@ array[
      'App Development',
      'Web Development',
      'Cybersecurity',
      'Robotics',
      'Competitive Programming',
      'Graphics Design',
      'Gaming'
    ]::text[]
  ),
  xp_earned integer not null default 0 check (xp_earned between 0 and 100),
  status varchar(50) not null default 'PENDING' check (status = 'PENDING')
);

alter table public.recruitment_submissions enable row level security;

revoke all on public.recruitment_submissions from anon, authenticated;
grant insert (
  id,
  full_name,
  student_id,
  department,
  whatsapp_num,
  email,
  photo_url,
  segments,
  xp_earned,
  status
) on public.recruitment_submissions to anon;

create policy "Public can submit recruitment applications"
  on public.recruitment_submissions
  for insert
  to anon
  with check (
    status = 'PENDING'
    and xp_earned between 0 and 100
    and cardinality(segments) > 0
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-photos',
  'student-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Applicants can upload recruitment photos"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'student-photos');
