begin;
select plan(13);

select has_table(
  'public',
  'fabrication_spool_projections',
  'the scalable fabrication read model is stored as one row per spool revision'
);
select has_column(
  'public',
  'fabrication_spool_projections',
  'spool_revision_id',
  'the projection is keyed by the immutable spool revision'
);
select has_column(
  'public',
  'fabrication_spool_projections',
  'project_id',
  'the projection keeps its project boundary for indexed reads'
);
select has_function(
  'public',
  'recompute_fabrication_spool_projection',
  array['uuid'],
  'the private one-spool projection refresh helper exists'
);
select has_function(
  'public',
  'list_fabrication_spools',
  array['uuid', 'text', 'text', 'text', 'uuid', 'integer'],
  'the fabrication list is a cursor-paged business RPC'
);
select has_function(
  'public',
  'fabrication_spool_stage_counts',
  array['uuid'],
  'the dashboard obtains project-wide stage totals without loading every spool'
);
select has_function(
  'public',
  'fabrication_progress_s_curve',
  array['uuid'],
  'the actual fabrication S-curve is aggregated from the stored projection'
);
select has_function(
  'public',
  'fabrication_stage_distribution',
  array['uuid'],
  'the pipeline distribution is aggregated from the stored projection'
);
select has_function(
  'public',
  'fabrication_progress_by_pds_area',
  array['uuid'],
  'progress by PDS area is aggregated from the stored projection'
);
select has_function(
  'public',
  'recompute_erection_spool_projection',
  array['uuid'],
  'the erection facts are refreshed against the bounded spool projection'
);
select has_function(
  'public',
  'erection_progress_s_curve',
  array['uuid'],
  'the erection S-curve is aggregated from the stored projection'
);
select has_function(
  'public',
  'erection_stage_distribution',
  array['uuid'],
  'the erection stage distribution is available to the dashboard'
);
select has_function(
  'public',
  'erection_rft_blocker_distribution',
  array['uuid'],
  'the RFT blockers are aggregated without loading a spool worklist'
);
select * from finish();
rollback;
