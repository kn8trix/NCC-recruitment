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

drop policy if exists "Applicants can upload recruitment photos"
  on storage.objects;

create policy "Applicants can upload recruitment photos"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'recruitment-photos');

alter table public.recruitment_submissions
  drop constraint if exists recruitment_submissions_student_id_format,
  add constraint recruitment_submissions_student_id_format
    check (student_id ~* '^(CS|EE|TE|IP|FD)-26[0-9]+$') not valid,
  drop constraint if exists recruitment_submissions_student_id_department,
  add constraint recruitment_submissions_student_id_department
    check (
      (department = 'CSE' and student_id ~* '^CS-')
      or (department = 'EEE' and student_id ~* '^EE-')
      or (department = 'Textile Engineering' and student_id ~* '^TE-')
      or (department = 'IPE' and student_id ~* '^IP-')
      or (department = 'FDAE' and student_id ~* '^FD-')
    ) not valid;
