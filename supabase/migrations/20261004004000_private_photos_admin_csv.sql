alter table public.recruitment_submissions
  add column if not exists photo_path text;

update public.recruitment_submissions
set photo_path = substring(
      photo_url from '/storage/v1/object/public/student-photos/(.+)$'
    )
where photo_path is null
  and photo_url like '%/storage/v1/object/public/student-photos/%';

alter table public.recruitment_submissions
  alter column photo_url drop not null;

update public.recruitment_submissions
set photo_url = null;

alter table public.recruitment_submissions
  drop constraint if exists recruitment_submissions_photo_path_required,
  add constraint recruitment_submissions_photo_path_required
    check (photo_path is not null) not valid;

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

update storage.buckets
set public = false
where id = 'student-photos';
