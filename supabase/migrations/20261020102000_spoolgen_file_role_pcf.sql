-- A spooling import can take PCF files. The new value is added in its own migration so that it is committed
-- before 20261020103000_spooling_import_many_files.sql and the tests use it.

alter type public.spoolgen_file_role add value if not exists 'pcf';
