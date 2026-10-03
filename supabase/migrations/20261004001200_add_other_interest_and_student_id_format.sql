alter table public.recruitment_submissions
  add column if not exists other_interest text;

alter table public.recruitment_submissions
  drop constraint if exists recruitment_submissions_student_id_format,
  add constraint recruitment_submissions_student_id_format
    check (student_id ~* '^[A-Z]{2}-[0-9]{7}$') not valid,
  drop constraint if exists recruitment_submissions_other_interest_length,
  add constraint recruitment_submissions_other_interest_length
    check (
      other_interest is null
      or char_length(trim(other_interest)) between 1 and 120
    ),
  drop constraint if exists recruitment_submissions_segments_check,
  drop constraint if exists recruitment_submissions_segments_or_other,
  add constraint recruitment_submissions_segments_or_other
    check (
      segments <@ array[
        'App Development',
        'Web Development',
        'Cybersecurity',
        'Robotics',
        'Competitive Programming',
        'Graphics Design',
        'Gaming'
      ]::text[]
      and (cardinality(segments) > 0 or other_interest is not null)
    );

drop policy if exists "Public can submit recruitment applications"
  on public.recruitment_submissions;

create policy "Public can submit recruitment applications"
  on public.recruitment_submissions
  for insert
  to anon
  with check (
    status = 'PENDING'
    and xp_earned between 0 and 100
    and (cardinality(segments) > 0 or other_interest is not null)
  );

grant insert (
  id,
  full_name,
  student_id,
  department,
  whatsapp_num,
  email,
  photo_url,
  segments,
  other_interest,
  xp_earned,
  status
) on public.recruitment_submissions to anon;
