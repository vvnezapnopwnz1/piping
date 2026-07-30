# PipeQC role matrix

These files are target functional-persona and domain maps, not authoritative access control. A membership has one access role, zero or more functional roles, and independent scope. Supabase capabilities and RLS are authoritative.

**Status:** 🧪 Demo mode retains its manual persona switcher and mock workflows.
**Status:** ✅ Supabase mode implements access/function/scope capability
resolution, RLS enforcement, project selection and audited Access Rights RPCs.
Operational workflow stores remain a later runtime-source-of-truth track; a
demo screen is never evidence of a Supabase-backed production workflow.

| Person | Access | Function | Scope |
| --- | --- | --- | --- |
| PM | Project Reader | Project Manager | Project |
| Internal QC | Project Editor | QC Engineer | Project |
| NDE laboratory user | Subcontractor | NDE Inspector | Subcontractor + PDS |
| Platform administrator | Global System Admin | none required | All projects |
