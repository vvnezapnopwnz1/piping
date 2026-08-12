-- Track 07: enum additions must run before any migration references the new values.
alter type public.construction_stage add value 'to_site';
alter type public.construction_stage add value 'erected';
alter type public.construction_stage add value 'welded_bolted';
alter type public.construction_stage add value 'supported';
alter type public.construction_stage add value 'rft';
