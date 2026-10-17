-- Keep the existing Track 09 authorization kind while F3 widens the same ledger.

alter table public.revision_progress_copies
  drop constraint revision_progress_copies_progress_kind_check,
  add constraint revision_progress_copies_progress_kind_check
    check (progress_kind in (
      'fabrication_start', 'material_check', 'weld_progress', 'sent_to_paint', 'paint', 'flange_progress'
    ));
