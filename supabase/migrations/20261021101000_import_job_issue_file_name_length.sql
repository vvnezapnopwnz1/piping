-- A file name on an import issue is at most 255 characters.
--
-- 20261020103000 added import_job_issues.file_name as free text. The browser writes it from the name of a
-- file the person picked, and the database held whatever came. No file system stores a longer name, so a
-- longer one is a mistake or an attack on the size of a row; the check refuses it where the other columns of
-- the table are checked. No row can break it: the column is new and the migration that added it is not yet
-- released.

alter table public.import_job_issues
  add constraint import_job_issues_file_name_length
  check (file_name is null or length(file_name) <= 255);
