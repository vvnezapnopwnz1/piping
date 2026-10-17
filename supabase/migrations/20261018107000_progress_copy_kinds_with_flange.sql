-- 20261018105000 listed the progress-copy kinds from 20261017102000 and dropped flange_progress,
-- which 20261017103000 had added. Every kind the ledger knows, in one list.

alter table public.revision_progress_copies
  drop constraint revision_progress_copies_progress_kind_check,
  add constraint revision_progress_copies_progress_kind_check
    check (progress_kind in (
      'fabrication_start', 'material_check', 'weld_progress', 'support_progress',
      'sent_to_paint', 'paint', 'flange_progress'
    ));
