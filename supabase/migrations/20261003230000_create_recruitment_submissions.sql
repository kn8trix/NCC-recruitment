create table if not exists public.recruitment_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name varchar(255) not null check (char_length(trim(full_name)) between 2 and 255),
  student_id varchar(50) not null unique,
  department varchar(40) not null check (
    department in ('CSE', 'EEE', 'Textile Engineering', 'IPE', 'FDAE')
  ),
  constraint recruitment_submissions_student_id_format check (
    student_id ~* '^(CS|EE|TE|IP|FD)-26[0-9]+$'
  ),
  constraint recruitment_submissions_student_id_department check (
    (department = 'CSE' and student_id ~* '^CS-')
    or (department = 'EEE' and student_id ~* '^EE-')
    or (department = 'Textile Engineering' and student_id ~* '^TE-')
    or (department = 'IPE' and student_id ~* '^IP-')
    or (department = 'FDAE' and student_id ~* '^FD-')
  ),
  whatsapp_num varchar(20) not null check (char_length(trim(whatsapp_num)) between 8 and 20),
  email varchar(255) not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  photo_path text not null,
  photo_url text,
  segments text[] not null check (
    segments <@ array[
      'App Development',
      'Web Development',
      'Cybersecurity',
      'Robotics',
      'Competitive Programming',
      'Graphics Design',
      'Gaming'
    ]::text[]
  ),
  other_interest text,
  constraint recruitment_submissions_other_interest_length check (
    other_interest is null
    or char_length(trim(other_interest)) between 1 and 120
  ),
  constraint recruitment_submissions_segments_or_other check (
    cardinality(segments) > 0 or other_interest is not null
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
  photo_path,
  segments,
  other_interest,
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
    and (cardinality(segments) > 0 or other_interest is not null)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recruitment-photos',
  'recruitment-photos',
  false,
  2097152,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Applicants can upload recruitment photos"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'recruitment-photos');
