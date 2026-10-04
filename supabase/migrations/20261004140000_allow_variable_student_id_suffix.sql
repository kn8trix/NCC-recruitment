alter table public.recruitment_submissions
  drop constraint if exists recruitment_submissions_student_id_format,
  add constraint recruitment_submissions_student_id_format
    check (student_id ~* '^(CS|EE|TE|IP|FD)-26[0-9]+$') not valid;
