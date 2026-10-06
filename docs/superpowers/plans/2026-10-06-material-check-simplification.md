# Material Check Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before touching `supabase/`, load the `supabase-postgres-best-practices` skill.

**Goal:** Перевести Material Check на простой бэкенд: чтение — обычными `select` из view через RLS, команда — только ID строки BOM и записи PML, без постраничной загрузки, без ручного разбора JSON и без копии правил в TypeScript.

**Architecture:** Новая миграция `20261007090000_material_check_simplify.sql` ложится поверх `20261006120000_material_check_workbench.sql`. Старую не трогаем. Новая миграция содержит:
- удаление трёх функций чтения из старой миграции;
- одна вспомогательная функция для политики: возвращает проект спула, если вызывающий может его читать;
- политика чтения BOM для пользователей Construction;
- политика чтения QC-13 на том же правиле;
- два view с `security_invoker`: строки проверки и допустимые кандидаты PML;
- команда `record_material_check`, которая принимает `{spool_revision_material_id, piping_material_record_id}` и проверяет допустимость по тому же view.

Клиент читает view обычным `select` с сгенерированными типами.

**Tech Stack:** Supabase/PostgreSQL 17, pgTAP, Next.js 16 / React 19, TypeScript, `node:test`. Новых зависимостей нет.

**Spec:**
- `docs/audits/2026-10-06-backend-simplification.md`, находки B1–B4 и B8;
- раздел «Backend: keep one rule in one place» в `AGENTS.md`.

Исходная работа описана в `docs/superpowers/plans/2026-10-06-material-traceability-workbench.md`. Её продуктовые правила сохраняются, кроме двух явно отменённых ниже.

## Global Constraints

- **Живой локальный стенд (порты 543xx, SHOWCASE-1) не сбрасывать и не заполнять заново.** Это требование владельца от 2026-10-06.
  - Запрещены `demo:prepare`, `demo:showcase`, `supabase db reset` без `--workdir` и `npm run verify`: он запускает pgTAP на живом стенде.
  - Новая миграция применяется к живому стенду один раз, в Task 6, командой `npx supabase migration up --local`, без сброса.
- **pgTAP — только на изолированном стеке** `.pgtap-stack`: проект `pipe-qc-pgtap`, порты 554xx, те же образы, что у живого стенда.
  - `bash tasks/material-check/pgtap.sh test <files…>` — свежая тестовая база и указанные файлы.
  - `bash tasks/material-check/pgtap.sh check` — свежая тестовая база и весь набор. Красный при любом падении, которого нет в `tasks/material-check/pgtap-known-failures.txt`.
  - В этом списке 13 тестов прав из 001 и 050. На свежесозданном стеке они падают уже до этой работы; это отдельная проблема, чинить её здесь нельзя.
- Новая миграция: `supabase/migrations/20261007090000_material_check_simplify.sql`. Файл `20261006120000_material_check_workbench.sql` и другие миграции не меняются.
- Где ниже в задачах написано «переписать миграцию 20261006120000», «`npm run demo:prepare -- --confirm-local-reset`», «`npx supabase test db …`» или «`npm run test:db`», вместо этого действуют правила из этого раздела.
- Новых npm-зависимостей нет.
- Работать в текущей ветке `feat/unified-workspace`. Коммит — после каждой задачи, с сообщением из задачи. Не делать push, PR, новых веток и worktree.
- Секреты: следовать `AGENTS.md`. Скрипты сами читают `.env.local`. Пароли и ключи не выдумывать, не печатать и не передавать в командной строке.
- Hosted-команды не запускать.
- Не трогать `modules/pressure-test/**`, оболочку (`components/pipeqc/**`), `components/ui/record-drawer*`.
- Тексты интерфейса — на английском.
- Коды ошибок и их сообщения сохраняются: PQC30, PQC31, PQC32, PQC33, PQC50, PQC54, 23514, 42501. На них опирается `mapSupabaseConstructionError`. Код PQC58 удаляется.
- **Отменённые правила исходного плана:**
  1. Кнопка «Reconfirm check date» удаляется. Сейчас она не работает: отправляет пустой `target_items`, и сервер всегда отвечает 23514. При этом она не меняет дату производного этапа Material Check.
  2. Связь записи с QC-13 сохраняет **первую** форму. Это правило переносится на сервер: последующие записи её не перезаписывают.
- Каждое изменение проверяется против правил 1–6 в `AGENTS.md`.

## Review Focus

1. **Пользователь только Erection** (`erection_contributor`, без `fabrication.view` и `spooling.view`) открывает Field Material. Он видит строки BOM, кандидатов PML и форму QC-13 спула — это раньше давала обходящая RLS функция. Тест — Task 2.
2. **Пользователь другого PDS-района или без доступа к проекту** видит ноль строк BOM и ноль кандидатов, а не ошибку. Тест — Task 2.
3. **Повтор уже принятой строки.**
   - С тем же PML — проходит без второй записи.
   - С другим PML — 23514.
   - `HEAT-AB12` вместо `Heat-ab12` — PQC33, регистр не сворачивается.
   Тест — Task 3.
4. **Новая QC-13 после первой записи.** Запись оставшихся строк не меняет `material_check_records.qc13_form_id`. Тест — Task 3.
5. **Для Ident нет активных записей PML.** Выбор показывает «No active PML evidence matches this BOM row» — это не ошибка, и кнопка записи недоступна, пока ничего не выбрано. Проверка — Task 5, шаг в браузере.

---

## File Map

| Действие | Файл | Ответственность |
|---|---|---|
| Create | `supabase/migrations/20261007090000_material_check_simplify.sql` | удалить 3 старые функции чтения; helper, 2 политики, 2 view, команда |
| Create | `supabase/tests/database/109_no_definer_reads.test.sql` | Защита от новых читающих `SECURITY DEFINER`-функций |
| Rewrite | `supabase/tests/database/108_material_check_workbench.test.sql` | Доступ через view, допустимость, команда по ID |
| Modify | `supabase/tests/database/050_material_traceability.test.sql`, `052_…`, `053_…`, `063_…`, `072_…`, `073_…` | Payload только из ID |
| Regenerate | `lib/supabase/database.types.ts` | Типы view |
| Rewrite | `modules/construction/infrastructure/supabase-material-check-repository.ts` | Обычные `select`, без декодера |
| Rewrite | `modules/construction/infrastructure/supabase-material-check-repository.test.ts` | Маппинг строк |
| Modify | `modules/construction/infrastructure/supabase-construction-repository.ts` | Удалить реэкспорт и `loadBillOfMaterials` / `loadMaterialCheckItems` |
| Modify | `modules/construction/infrastructure/supabase-construction-errors.ts` (+ test) | Удалить PQC58 |
| Modify | `modules/construction/domain/material-check.ts` (+ test) | Только типы; `reconcileMaterialCheck` удалить |
| Modify | `modules/construction/application/record-material-check.ts`, `record-field-material-check.ts` (+ tests) | Payload из ID, простые условия |
| Modify | `modules/construction/application/material-check-draft.ts` (+ test) | Черновик без Ident/quantity |
| Modify | `modules/construction/ui/use-material-check-workspace.ts` | Без повторной проверки кандидата |
| Rewrite | `modules/construction/ui/material-trace-picker.tsx` | Один запрос кандидатов, фильтр на клиенте |
| Modify | `components/ui/reference-combobox.tsx` | Удалить «Load more» |
| Modify | `modules/construction/ui/fabrication/material-check-screen.tsx`, `modules/construction/ui/erection/field-material-check-screen.tsx` | Без Reconfirm, без `targetKey` у выбора |
| Create | `scripts/demo/material-check-items.ts` | Выбор PML для fixtures (по одной на строку) |
| Modify | `scripts/bootstrap-showcase-dataset.ts`, `scripts/bootstrap-track07-browser-fixtures.ts`, `scripts/demo/showcase-dataset.ts` (комментарии), `scripts/demo/showcase-dataset.test.ts` (комментарий) | Payload из ID |
| Modify | `scripts/verify-material-traceability-workbench.ts` | Убрать зависимость от agy-каталога артефактов |
| Modify | `docs/acceptance/2026-10-06-material-traceability-workbench.md`, `docs/audits/2026-10-06-backend-simplification.md` | Итог упрощения |

---

### Task 1: Guard test — no new data-returning SECURITY DEFINER functions

> **Done** — commit `521d17b` (executed before the live-stand constraint; the steps below are kept for the record).

**Files:**
- Create: `supabase/tests/database/109_no_definer_reads.test.sql`

**Interfaces:**
- Produces: a pgTAP test that fails when a `public` function that is `SECURITY DEFINER`, `STABLE` or `IMMUTABLE`, returns neither `boolean` nor `trigger`, and is executable by `authenticated` is not on the allowlist.

- [ ] **Step 1: Prepare the empty local stand**

Run: `npm run demo:prepare -- --confirm-local-reset`
Expected: exit 0. The local DB now carries the *current* (old) migration, with `read_material_check_workspace` and `search_material_trace_candidates`.

- [ ] **Step 2: List the current offenders**

Run:
```zsh
npx supabase db query --local "select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef and p.provolatile in ('s','i') and p.prorettype not in ('boolean'::regtype, 'trigger'::regtype) and has_function_privilege('authenticated', p.oid, 'EXECUTE') order by 1"
```
`psql` is not installed on this machine. If `db query` cannot run, use `docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -At -c "<query>"`.

Expected: a list that includes `read_material_check_workspace(uuid,uuid,integer)` and `search_material_trace_candidates(uuid,text,text,uuid,integer)`, plus the existing read models (for example `list_fabrication_spools(...)`, `get_fabrication_spool(uuid)` and the chart functions).

- [ ] **Step 3: Write the test with the allowlist**

Create `supabase/tests/database/109_no_definer_reads.test.sql`:

```sql
begin;
select plan(1);

-- AGENTS.md rule 2: reads are plain selects through RLS. A SECURITY DEFINER function that returns
-- data bypasses every policy. The list below is what existed on 2026-10-06; do not extend it —
-- expose new reads as `security_invoker` views over tables with RLS policies instead.
-- `construction_spool_project_id` is the one policy helper that returns a value (a project id,
-- only for a spool the caller may read); it is listed for that reason.
select is_empty($$
  select p.oid::regprocedure::text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and p.provolatile in ('s', 'i')
    and p.prorettype not in ('boolean'::regtype, 'trigger'::regtype)
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  except
  select unnest(array[
    'construction_spool_project_id(uuid)'
    -- , '<every line from Step 2 except the two material functions, verbatim, one per line>'
  ])
$$, 'no new SECURITY DEFINER read function is exposed to authenticated users');

select * from finish();
rollback;
```

Replace the commented line with every Step 2 output line, **except** `read_material_check_workspace(...)` and `search_material_trace_candidates(...)`. Paste each one verbatim as a quoted array element. The allowlist is copied from the database, not invented.

- [ ] **Step 4: Run it and see it fail**

Run: `npx supabase test db supabase/tests/database/109_no_definer_reads.test.sql`
Expected: FAIL, with the two material functions as unexpected rows.

- [ ] **Step 5: Commit**

```bash
git add supabase/tests/database/109_no_definer_reads.test.sql
git commit -m "test(db): guard against new SECURITY DEFINER read functions"
```

The suite stays red until Task 2. That is expected.

---

### Task 2: Read path — helper, policies and views

**Files:**
- Create: `supabase/migrations/20261007090000_material_check_simplify.sql`, with the drops and read parts below. `record_material_check` is added to it in Task 3. Do not edit `20261006120000_material_check_workbench.sql`.
- Rewrite: `supabase/tests/database/108_material_check_workbench.test.sql`, read part.

**Interfaces:**
- Produces, as SQL objects:
  - `public.construction_spool_project_id(uuid) returns uuid`;
  - view `public.material_check_lines(spool_revision_material_id, spool_revision_id, ident_code, description, quantity, unit, expected_trace_number, accepted_piping_material_record_id, accepted_trace_number, accepted_mrr_number, accepted_status)`;
  - view `public.material_trace_candidates(spool_revision_material_id, spool_revision_id, piping_material_record_id, trace_number, mrr_number)`.

- [ ] **Step 1: Write the failing read tests**

Replace the whole `108_material_check_workbench.test.sql` with the content below.

Keep the **fixture block** of the current file verbatim. It runs from the line `-- Fixture setup` through the line `select public.record_construction_progress('36000000-0000-0000-0000-000000000108', 'fabrication', 'start_fab', '2026-10-01', '{}'::jsonb);`. Paste it where marked.

```sql
begin;
select plan(13);

select has_view('public', 'material_check_lines', 'material_check_lines view exists');
select has_view('public', 'material_trace_candidates', 'material_trace_candidates view exists');
select ok(
  (select bool_and('security_invoker=true' = any(coalesce(c.reloptions, '{}')))
   from pg_class c
   where c.oid in ('public.material_check_lines'::regclass, 'public.material_trace_candidates'::regclass)),
  'both material views apply the caller''s RLS (security_invoker)'
);
select is(
  has_function_privilege('anon', 'public.construction_spool_project_id(uuid)', 'EXECUTE'),
  false,
  'anon cannot call the construction spool project helper'
);

-- <<< paste the fixture block from the current file here, verbatim >>>

reset role;
-- A fourth user: Erection contributor scoped to another PDS area of the same project.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000112', 'authenticated', 'authenticated', 'scoped108@example.test', 'not-used', now(), now(), now());
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000109', '30000000-0000-0000-0000-000000000108', 'PDS-109', 'Other area');
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000112', '30000000-0000-0000-0000-000000000108', '10000000-0000-0000-0000-000000000112', 'subcontractor', 'project_editor', true);
insert into public.project_membership_functional_roles (membership_id, role_code)
values ('20000000-0000-0000-0000-000000000112', 'erection_contributor');
insert into public.membership_pds_area_scopes (membership_id, pds_area_id)
values ('20000000-0000-0000-0000-000000000112', '31000000-0000-0000-0000-000000000109');
insert into public.qc13_progress_forms (id, project_id, spool_revision_id, form_number, requested_on)
values ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000108', '36000000-0000-0000-0000-000000000108', 'QC13-108-A', '2026-10-01');

create function pg_temp.act_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, true),
         set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;

-- QC engineer: fabrication.view, no spooling.view
select pg_temp.act_as('10000000-0000-0000-0000-000000000109');
select is((select count(*)::int from public.material_check_lines where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 4,
  'qc_engineer reads all four BOM rows without spooling.view');
select results_eq(
  $$select trace_number from public.material_trace_candidates where spool_revision_material_id = '50000000-0000-0000-0000-000000000001'$$,
  $$values ('Heat-ab12'::text)$$,
  'a BOM row that expects Heat-ab12 offers exactly Heat-ab12, not HEAT-AB12');
select is((select count(*)::int from public.material_trace_candidates where spool_revision_material_id = '50000000-0000-0000-0000-000000000003'), 1,
  'a BOM row without an expected trace offers only the active PML records of its Ident');

-- Erection contributor: erection.view only
select pg_temp.act_as('10000000-0000-0000-0000-000000000110');
select is((select count(*)::int from public.material_check_lines where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 4,
  'an erection contributor reads the BOM of a spool in its project');
select is((select count(*)::int from public.material_trace_candidates where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 4,
  'an erection contributor sees one eligible candidate per BOM row');
select is((select count(*)::int from public.qc13_progress_forms where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 1,
  'an erection contributor reads the QC-13 form of the spool');

-- No membership
select pg_temp.act_as('10000000-0000-0000-0000-000000000111');
select is((select count(*)::int from public.material_check_lines), 0, 'a user without project access reads no BOM rows');

-- Scoped to another PDS area
select pg_temp.act_as('10000000-0000-0000-0000-000000000112');
select is((select count(*)::int from public.material_trace_candidates where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 0,
  'a user scoped to another PDS area sees no candidates for this spool');
select is((select count(*)::int from public.material_check_lines where spool_revision_id = '36000000-0000-0000-0000-000000000108'), 0,
  'a user scoped to another PDS area reads no BOM rows of this spool');

select * from finish();
rollback;
```

- [ ] **Step 2: Run it and see it fail**

Run: `bash tasks/material-check/pgtap.sh test supabase/tests/database/108_material_check_workbench.test.sql`
Expected: FAIL, because the views do not exist.

- [ ] **Step 3: Create the new migration with the read part**

Create `supabase/migrations/20261007090000_material_check_simplify.sql` with this content:

```sql
-- Migration: material_check_simplify
-- Material Check works on BOM rows. Reads go through RLS (one policy helper, two policies and two
-- security_invoker views) instead of the SECURITY DEFINER reads of 20261006120000;
-- record_material_check takes BOM-row and PML-record IDs only (added below the views).

drop function if exists public.search_material_trace_candidates(uuid, text, text, uuid, integer);
drop function if exists public.read_material_check_workspace(uuid, uuid, integer);
drop function if exists public.assert_material_check_read_target(uuid);
```

Then append:

```sql
-- The project of a spool revision, returned only to a caller who may read that spool as a
-- Construction user (fabrication.view or erection.view, inside their PDS scope). Used by the BOM
-- read policy and by material_trace_candidates.
create or replace function public.construction_spool_project_id(target_spool_revision_id uuid)
returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select iso.project_id
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = target_spool_revision_id
    and public.current_user_can_read_fabrication_spool(iso.project_id, sr.id);
$$;
revoke all on function public.construction_spool_project_id(uuid) from public, anon;
grant execute on function public.construction_spool_project_id(uuid) to authenticated;

create policy "construction users read spool revision materials" on public.spool_revision_materials
  for select to authenticated
  using (public.construction_spool_project_id(spool_revision_id) is not null);

-- QC-13 forms follow the same rule as the material check records they belong to.
drop policy if exists "read QC13 progress forms" on public.qc13_progress_forms;
create policy "read QC13 progress forms" on public.qc13_progress_forms for select to authenticated
  using (public.current_user_can_read_fabrication_spool(project_id, spool_revision_id));

-- One row per BOM line with its accepted evidence, if any.
create view public.material_check_lines with (security_invoker = true) as
select
  material.id as spool_revision_material_id,
  material.spool_revision_id,
  material.ident_code,
  material.description,
  material.quantity,
  material.unit,
  material.trace_number as expected_trace_number,
  item.piping_material_record_id as accepted_piping_material_record_id,
  pml.trace_number as accepted_trace_number,
  pml.mrr_number as accepted_mrr_number,
  pml.status as accepted_status
from public.spool_revision_materials material
left join public.material_check_records record on record.spool_revision_id = material.spool_revision_id
left join public.material_check_items item
  on item.material_check_record_id = record.id and item.spool_revision_material_id = material.id
left join public.piping_material_records pml on pml.id = item.piping_material_record_id;

-- The one definition of "eligible PML evidence for a BOM row": same project, same Ident, active,
-- and the exact BOM trace when the BOM names one. record_material_check checks against it too.
create view public.material_trace_candidates with (security_invoker = true) as
select
  material.id as spool_revision_material_id,
  material.spool_revision_id,
  pml.id as piping_material_record_id,
  pml.trace_number,
  pml.mrr_number
from public.spool_revision_materials material
join public.piping_material_records pml
  on pml.project_id = public.construction_spool_project_id(material.spool_revision_id)
 and pml.ident_code = material.ident_code
 and pml.status = 'active'
 and (material.trace_number is null or pml.trace_number = material.trace_number);

revoke all on public.material_check_lines, public.material_trace_candidates from anon;
grant select on public.material_check_lines, public.material_trace_candidates to authenticated;
```

- [ ] **Step 4: Apply the migration on the isolated stack and run the tests**

Run: `bash tasks/material-check/pgtap.sh test supabase/tests/database/108_material_check_workbench.test.sql supabase/tests/database/109_no_definer_reads.test.sql`
Expected: both PASS. This re-creates only the `.pgtap-stack` test DB; the live stand is untouched.

If the PDS-scope assertion fails because user 112 still sees rows, check the access path first:
`select public.current_user_has_capability('30000000-0000-0000-0000-000000000108', 'spooling.view')` as that user.
- If it is true, the old `spooling.view` policy without PDS scope is the cause. Stop and report it. Do not widen this task.
- Otherwise, fix the helper.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261007090000_material_check_simplify.sql supabase/tests/database/108_material_check_workbench.test.sql
git commit -m "refactor(material-check): read BOM and PML candidates through RLS views"
```

---

### Task 3: Command — IDs only, eligibility from the view, first QC-13 kept

**Files:**
- Modify: `supabase/migrations/20261007090000_material_check_simplify.sql` — add `record_material_check` after the views.
- Modify: `supabase/tests/database/108_material_check_workbench.test.sql` (append), `050_material_traceability.test.sql`, `052_fabrication_release.test.sql`, `053_construction_projections.test.sql`, `063_pwht_release.test.sql`, `072_erection_rft.test.sql`, `073_material_check_phase_naming.test.sql`.
- Regenerate: `lib/supabase/database.types.ts`.

**Interfaces:**
- Consumes: `public.material_trace_candidates` from Task 2.
- Produces: `record_material_check(target_spool_revision_id uuid, target_checked_on date, target_items jsonb, target_qc13_form_id uuid default null, target_idempotency_key text default null, target_phase construction_phase default 'fabrication')`. The signature is unchanged. `target_items` is an array of `{"spool_revision_material_id": uuid, "piping_material_record_id": uuid}`; any other keys are ignored. `checked_quantity` is taken from the BOM row. `record_field_material_check` is unchanged, because it delegates.

- [ ] **Step 1: Append the failing command tests to 108**

In `108`, before `select * from finish();`, insert the block below. Change `select plan(13);` to `select plan(30);`.

```sql
-- Commands, as the QC engineer
select pg_temp.act_as('10000000-0000-0000-0000-000000000109');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000003"}]'::jsonb)$$,
  'PQC33', null, 'HEAT-AB12 is not eligible for a row that expects Heat-ab12');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000003","piping_material_record_id":"60000000-0000-0000-0000-000000000005"}]'::jsonb)$$,
  'PQC33', null, 'an inactive PML record is not eligible');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000004","piping_material_record_id":"60000000-0000-0000-0000-000000000004"}]'::jsonb)$$,
  'PQC33', null, 'a PML record of another Ident is not eligible');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000099","piping_material_record_id":"60000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  'PQC30', null, 'a BOM row outside this spool revision is rejected');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  '23514', null, 'an item without a PML record id is rejected');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"not-a-uuid","piping_material_record_id":"60000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  '23514', null, 'a non-UUID reference is rejected');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000001"},
    {"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  '23514', null, 'a BOM row may appear only once per command');

select lives_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000001"},
    {"spool_revision_material_id":"50000000-0000-0000-0000-000000000002","piping_material_record_id":"60000000-0000-0000-0000-000000000002"}]'::jsonb,
  '70000000-0000-0000-0000-000000000001', 'mc108-first')$$,
  'two BOM rows with the same Ident are recorded separately in one command');
select is((select count(*)::int from public.material_check_lines
  where spool_revision_id = '36000000-0000-0000-0000-000000000108' and accepted_piping_material_record_id is not null), 2,
  'both ID-1 rows show accepted evidence');
select is((select checked_quantity::numeric from public.material_check_items
  where spool_revision_material_id = '50000000-0000-0000-0000-000000000003'), null::numeric,
  'an unrecorded row has no item');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-02',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000003"}]'::jsonb)$$,
  '23514', null, 'accepted evidence cannot switch to another PML record');
select lives_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-03',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000001","piping_material_record_id":"60000000-0000-0000-0000-000000000001"}]'::jsonb)$$,
  'resubmitting an accepted row with its own PML record is accepted');

reset role;
insert into public.qc13_progress_forms (id, project_id, spool_revision_id, form_number, requested_on)
values ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000108', '36000000-0000-0000-0000-000000000108', 'QC13-108-B', '2026-10-04');
set local role authenticated;
select pg_temp.act_as('10000000-0000-0000-0000-000000000109');
select lives_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-04',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000003","piping_material_record_id":"60000000-0000-0000-0000-000000000004"},
    {"spool_revision_material_id":"50000000-0000-0000-0000-000000000004","piping_material_record_id":"60000000-0000-0000-0000-000000000006"}]'::jsonb,
  '70000000-0000-0000-0000-000000000002', 'mc108-rest')$$,
  'the remaining rows are recorded against a newer QC-13');
select is((select qc13_form_id from public.material_check_records where spool_revision_id = '36000000-0000-0000-0000-000000000108'),
  '70000000-0000-0000-0000-000000000001'::uuid,
  'the material check keeps the QC-13 it was first recorded with');
select is((select checked_quantity::numeric from public.material_check_items
  where spool_revision_material_id = '50000000-0000-0000-0000-000000000003'), 2::numeric,
  'checked quantity is taken from the BOM row');
select is((select count(*)::int from public.construction_progress_events
  where spool_revision_id = '36000000-0000-0000-0000-000000000108' and stage = 'material_check'), 1,
  'completing every BOM row derives Material Check exactly once');

select pg_temp.act_as('10000000-0000-0000-0000-000000000111');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000108', '2026-10-04',
  '[{"spool_revision_material_id":"50000000-0000-0000-0000-000000000003","piping_material_record_id":"60000000-0000-0000-0000-000000000004"}]'::jsonb)$$,
  '42501', null, 'a user without project access cannot record');
```

Count check: 13 read assertions plus 17 command assertions make 30. The command assertions are seven `throws_ok` checks for invalid payloads, the first `lives_ok`, two counts, one rewrite `throws_ok`, two `lives_ok`, three result checks and the final 42501. If you add or remove one, update `plan`.

- [ ] **Step 2: Run it and see it fail**

Run: `bash tasks/material-check/pgtap.sh test supabase/tests/database/108_material_check_workbench.test.sql`
Expected: FAIL. The old body still requires `ident_code`/`trace_number` (23514 on the first `lives_ok`) and overwrites the QC-13 link.

- [ ] **Step 3: Replace `record_material_check`**

Append the version below to `20261007090000_material_check_simplify.sql`, after the two views. The `-- [unchanged]` parts are copied from the current function in `20261006120000_material_check_workbench.sql`, which itself is not edited. Notes:
- the prologue, the evidence snapshots, the derived event, the audit and the receipt are taken from the current body **without changes**;
- the item loop is new;
- `on conflict` keeps the first QC-13;
- move the function so it comes **after** the two views in the file. It reads `material_trace_candidates`. plpgsql would resolve it at call time anyway, but the file should read top-down.

```sql
create or replace function public.record_material_check(
  target_spool_revision_id uuid,
  target_checked_on date,
  target_items jsonb,
  target_qc13_form_id uuid default null,
  target_idempotency_key text default null,
  target_phase public.construction_phase default 'fabrication'
)
returns public.material_check_records
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  target_project_id uuid;
  required_capability text;
  context public.spool_context;
  claimed jsonb;
  record_row public.material_check_records;
  item_value jsonb;
  item_bom_id uuid;
  item_pml_id uuid;
  seen_bom_ids uuid[] := array[]::uuid[];
  bom_row public.spool_revision_materials;
  prior_pml_id uuid;
  derived_event public.construction_progress_events;
  before_snapshot jsonb;
  after_snapshot jsonb;
begin
  -- [unchanged] lines from `select iso.project_id into target_project_id` through the
  -- `perform pg_advisory_xact_lock(...)` and the `before_snapshot` select — copy them verbatim
  -- from the current body (current file lines 37–99).

  insert into public.material_check_records (
    project_id, spool_revision_id, qc13_form_id, checked_on, checked_by, command_receipt_id
  ) values (
    context.project_id, target_spool_revision_id, target_qc13_form_id, target_checked_on, auth.uid(),
    nullif(claimed ->> 'receipt_id', '')::uuid
  )
  on conflict (spool_revision_id) do update
    set qc13_form_id = coalesce(material_check_records.qc13_form_id, excluded.qc13_form_id),
        checked_on = excluded.checked_on, checked_by = excluded.checked_by,
        updated_at = timezone('utc', now())
  returning * into record_row;

  for item_value in select value from jsonb_array_elements(target_items)
  loop
    begin
      item_bom_id := (item_value ->> 'spool_revision_material_id')::uuid;
      item_pml_id := (item_value ->> 'piping_material_record_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Material reference IDs must be UUIDs' using errcode = '23514';
    end;
    if item_bom_id is null or item_pml_id is null then
      raise exception 'Every material item needs spool_revision_material_id and piping_material_record_id'
        using errcode = '23514';
    end if;

    select * into bom_row from public.spool_revision_materials material
    where material.id = item_bom_id and material.spool_revision_id = target_spool_revision_id;
    if not found then
      raise exception 'Material row is not in this spool revision BOM' using errcode = 'PQC30';
    end if;
    if bom_row.id = any(seen_bom_ids) then
      raise exception 'Each BOM row may appear only once per command' using errcode = '23514';
    end if;
    seen_bom_ids := array_append(seen_bom_ids, bom_row.id);

    select checked.piping_material_record_id into prior_pml_id
    from public.material_check_items checked
    where checked.material_check_record_id = record_row.id
      and checked.spool_revision_material_id = bom_row.id;
    if found then
      if prior_pml_id <> item_pml_id then
        raise exception 'Accepted material evidence cannot be rewritten' using errcode = '23514';
      end if;
      continue;
    end if;

    if not exists (
      select 1 from public.material_trace_candidates candidate
      where candidate.spool_revision_material_id = bom_row.id
        and candidate.piping_material_record_id = item_pml_id
    ) then
      raise exception 'Active piping material evidence is missing' using errcode = 'PQC33';
    end if;

    insert into public.material_check_items (
      material_check_record_id, spool_revision_material_id, piping_material_record_id, checked_quantity
    ) values (record_row.id, bom_row.id, item_pml_id, bom_row.quantity);
  end loop;

  -- [unchanged] from `select jsonb_build_object('record', to_jsonb(record_row), ...) into after_snapshot;`
  -- through `return record_row;` — copy verbatim from the current body (current file lines 198–259).
end;
$$;
```

Before saving, replace both `-- [unchanged]` comments with the exact lines they name. The final function must contain no placeholder comments.

- [ ] **Step 4: Convert the other pgTAP callers to ID payloads**

Each legacy item `{"ident_code":…,"trace_number":…[,"quantity":…]}` becomes `{"spool_revision_material_id":"<BOM id>","piping_material_record_id":"<PML id>"}`. The fixture IDs are below.

| File | Replace | With |
|---|---|---|
| `052_fabrication_release` (line 158) | `IDN-100 / HEAT-100` | BOM `44000000-0000-0000-0000-000000000521`, PML `45000000-0000-0000-0000-000000000521` |
| `053_construction_projections` (line 162) | `IDN-100 / HEAT-100` | `…000000000531` / `…000000000531` (same prefixes) |
| `063_pwht_release` (line 129) | `IDN-PWHT / HT-PWHT` | `44000000-…-000000000631` / `45000000-…-000000000631` |
| `072_erection_rft` (line 77) | `IDN-07 / HEAT-07` | `44000000-…-000000000721` / `45000000-…-000000000721` |
| `073_material_check_phase_naming` (lines 61, 83) | `IDN-07M / HEAT-07M` | `44000000-…-000000000731` / `45000000-…-000000000731` |

Before replacing, confirm each ID in the file's own `insert into public.spool_revision_materials` / `piping_material_records` lines.

In `050_material_traceability`, BOM `39000000-0000-0000-0000-00000000050N` and PML `3a000000-0000-0000-0000-00000000050N`:
- `MAT-05-A/TRACE-05-A` → BOM `…0501`, PML `…0501`; `MAT-05-B/TRACE-05-B` → `…0502`, `…0502`. Apply to every call.
- Line 131 (`UNKNOWN`, PQC30): BOM `39000000-0000-0000-0000-000000000599`, PML `…0501`.
- Line 133 (`TRACE-WRONG`, PQC33): BOM `…0501`, PML `3a000000-0000-0000-0000-000000000502` (another Ident).
- Line 190 (evidence rewrite, `TRACE-05-A2`): BOM `…0501`, PML `3a000000-0000-0000-0000-000000000503`; still 23514.
- Line 192 (repeated ident): the same BOM `…0501` twice; still 23514. Change the description to `'a material-check command cannot repeat a BOM row'`.
- Line 180 (`accepted material quantity cannot be rewritten`) and lines 222/224 (`NaN` / `Infinity` quantity): delete these three assertions, because the command no longer accepts a quantity. Also delete the fixture rows used only by 222/224 (BOM `…0503`, PML `…0504`, spool revision `…0505` and its start_fab event), but only if nothing else references them.
- Audit assertion near line 155: replace `"submitted_items":[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A","quantity":1}]` with `"submitted_items":[{"spool_revision_material_id":"39000000-0000-0000-0000-000000000501","piping_material_record_id":"3a000000-0000-0000-0000-000000000501"}]`. Keep the `"evidence"` part; the evidence snapshot is unchanged.
- Update `select plan(N)` to the new count.

- [ ] **Step 5: Apply and run the whole DB suite**

Run:
```zsh
bash tasks/material-check/pgtap.sh check
```
Expected: `OK   pgTAP suite: no failures beyond the 13 known environment ones` — 108, 109 and every converted file pass.

- [ ] **Step 6: Regenerate types**

Run: `npx supabase gen types typescript --local --workdir .pgtap-stack > lib/supabase/database.types.ts` (the isolated stack has the new migration; the live stand gets it only in Task 6)
Expected:
- the diff removes `read_material_check_workspace` / `search_material_trace_candidates` / `assert_material_check_read_target`;
- it adds `material_check_lines`, `material_trace_candidates` and `construction_spool_project_id`;
- the header still starts with `export type Json`.

TypeScript does not compile until Task 4 and Task 5. That is expected.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261007090000_material_check_simplify.sql supabase/tests/database/*.test.sql lib/supabase/database.types.ts
git commit -m "refactor(material-check): command takes BOM and PML ids only; first QC-13 kept"
```

---

### Task 4: Callers — application payload, gates, domain types, scripts

**Files:**
- Modify: `modules/construction/domain/material-check.ts`, `modules/construction/domain/material-check.test.ts`
- Modify: `modules/construction/application/record-material-check.ts` (+ `.test.ts`), `record-field-material-check.ts` (+ `.test.ts`), `material-check-draft.ts` (+ `.test.ts`)
- Modify: `modules/construction/infrastructure/supabase-construction-errors.ts` (+ `.test.ts`)
- Create: `scripts/demo/material-check-items.ts`
- Modify: `scripts/bootstrap-showcase-dataset.ts:212-230`, `scripts/bootstrap-track07-browser-fixtures.ts:119-120`, the comments in `scripts/demo/showcase-dataset.ts:35` and `:281` and in `scripts/demo/showcase-dataset.test.ts:182`

**Interfaces:**
- Produces, in `domain/material-check.ts` (types only; `reconcileMaterialCheck`, `MaterialCheckReconciliation` and `normalizeTrace` are removed):
```ts
export interface BillLine {
  spoolRevisionMaterialId: string
  identCode: string
  description: string | null
  quantity: number | null
  unit: string | null
  expectedTraceNumber: string | null
}
/** A PML record chosen for one BOM row; the command needs only these two ids. */
export interface TraceEntry {
  spoolRevisionMaterialId: string
  pipingMaterialRecordId: string
}
/** One eligible PML record for a BOM row, from `material_trace_candidates`. */
export interface MaterialCandidate {
  id: string
  traceNumber: string
  mrrNumber: string
}
/** Evidence already recorded for a BOM row; labels are null when the PML row is not readable. */
export interface AcceptedMaterialEvidence {
  spoolRevisionMaterialId: string
  pipingMaterialRecordId: string
  traceNumber: string | null
  mrrNumber: string | null
  status: "active" | "inactive" | "archived" | null
}
```
- Produces, in `application/record-material-check.ts`:
```ts
export type MaterialCheckItemPayload = { spool_revision_material_id: string; piping_material_record_id: string }
export interface MaterialCheckPayload { target_spool_revision_id: string; checked_on: string; items: MaterialCheckItemPayload[]; qc13_form_id: string | null }
export interface MaterialCheckDraft { spoolRevisionId: string; checkedOn: string; qc13FormId: string | null; entries: TraceEntry[] }
export interface Gate { allowed: boolean; reason: string | null }
export function describeMaterialCheckGate(lines: readonly BillLine[], entries: readonly TraceEntry[], startFabOn: string | null): Gate
export function toMaterialCheckPayload(draft: MaterialCheckDraft): MaterialCheckPayload
```
- Produces, in `application/record-field-material-check.ts`: `describeFieldMaterialCheckGate(input: { lines; entries; toSiteOn: string | null; canRecord: boolean }): Gate`.
- Produces, in `application/material-check-draft.ts`: `interface MaterialDraftChoice extends TraceEntry { traceNumber: string; mrrNumber: string }`, `type MaterialDrafts`, `clearSavedMaterialDrafts(current, submitted: readonly TraceEntry[])`. A draft is cleared when `pipingMaterialRecordId` matches. `createMaterialRequestOwner` stays as is.
- Produces, in `scripts/demo/material-check-items.ts`: `materialCheckItemsFor(client, spoolRevisionId): Promise<{ spool_revision_material_id: string; piping_material_record_id: string }[]>`.

- [ ] **Step 1: Write the failing application tests**

In `record-material-check.test.ts`, replace the payload and gate tests with:

```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { describeMaterialCheckGate, toMaterialCheckPayload } from "./record-material-check"
import type { BillLine } from "../domain/material-check"

const line: BillLine = { spoolRevisionMaterialId: "bom-1", identCode: "ID-1", description: null, quantity: 1, unit: "ea", expectedTraceNumber: null }
const entry = { spoolRevisionMaterialId: "bom-1", pipingMaterialRecordId: "pml-1" }

test("the payload carries only the BOM row and PML record ids", () => {
  const payload = toMaterialCheckPayload({ spoolRevisionId: "rev-1", checkedOn: "2026-10-06", qc13FormId: null, entries: [entry] })
  assert.deepEqual(payload.items, [{ spool_revision_material_id: "bom-1", piping_material_record_id: "pml-1" }])
})

test("recording needs a BOM, Start Fab and at least one chosen trace", () => {
  assert.equal(describeMaterialCheckGate([], [entry], "2026-10-01").allowed, false)
  assert.equal(describeMaterialCheckGate([line], [entry], null).allowed, false)
  assert.equal(describeMaterialCheckGate([line], [], "2026-10-01").allowed, false)
  assert.deepEqual(describeMaterialCheckGate([line], [entry], "2026-10-01"), { allowed: true, reason: null })
})
```

In `record-field-material-check.test.ts`, test the same four cases with `toSiteOn` and `canRecord: false`. Keep the existing reason strings.

In `material-check-draft.test.ts`, keep the existing tests that remain valid. Change the "cleared only when equal" test so it compares on `pipingMaterialRecordId` only.

In `supabase-construction-errors.test.ts`, delete the PQC58 case.

In `material-check.test.ts`: if it only covered `reconcileMaterialCheck` / `normalizeTrace`, delete the file. Otherwise delete only those tests.

- [ ] **Step 2: Run the tests and see them fail**

Run: `node --import tsx --test modules/construction/application/*.test.ts modules/construction/infrastructure/supabase-construction-errors.test.ts`
Expected: FAIL, because the payload still has `ident_code` / `trace_number` and the gates still take the reconfirm options.

- [ ] **Step 3: Implement**

`record-material-check.ts`:
```ts
import type { BillLine, TraceEntry } from "../domain/material-check"

export interface MaterialCheckDraft { spoolRevisionId: string; checkedOn: string; qc13FormId: string | null; entries: TraceEntry[] }
export interface Gate { allowed: boolean; reason: string | null }
export type MaterialCheckItemPayload = { spool_revision_material_id: string; piping_material_record_id: string }
export interface MaterialCheckPayload { target_spool_revision_id: string; checked_on: string; items: MaterialCheckItemPayload[]; qc13_form_id: string | null }

/** Why Record is unavailable. Eligibility of a trace is the server's rule: the picker only offers eligible ones. */
export function describeMaterialCheckGate(lines: readonly BillLine[], entries: readonly TraceEntry[], startFabOn: string | null): Gate {
  if (lines.length === 0) return { allowed: false, reason: "This spool revision has no bill of materials to check." }
  if (!startFabOn) return { allowed: false, reason: "Record Start Fab before recording material traces." }
  if (entries.length === 0) return { allowed: false, reason: "Select at least one registered material trace." }
  return { allowed: true, reason: null }
}

export function toMaterialCheckPayload(draft: MaterialCheckDraft): MaterialCheckPayload {
  return {
    target_spool_revision_id: draft.spoolRevisionId,
    checked_on: draft.checkedOn,
    items: draft.entries.map((entry) => ({
      spool_revision_material_id: entry.spoolRevisionMaterialId,
      piping_material_record_id: entry.pipingMaterialRecordId,
    })),
    qc13_form_id: draft.qc13FormId,
  }
}
```

`record-field-material-check.ts`:
- same shape with the checks `canRecord` → `lines` → `toSiteOn` → `entries`, using the existing reason strings;
- drop `reconcileMaterialCheck`, `allowEmptyWhenAllAccepted` and `acceptedLineIds`;
- update the doc comment: it differs from the shop gate only in the To Site prerequisite and the capability.

`material-check-draft.ts`: `MaterialDraftChoice` is `TraceEntry & { traceNumber; mrrNumber }`. `clearSavedMaterialDrafts` deletes `next[sent.spoolRevisionMaterialId]` when `value.pipingMaterialRecordId === sent.pipingMaterialRecordId`.

`domain/material-check.ts`: exactly the four types from **Interfaces**, nothing else.

`supabase-construction-errors.ts`: delete the `case "PQC58":` branch.

- [ ] **Step 4: Scripts**

Create `scripts/demo/material-check-items.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../../lib/supabase/database.types"

/**
 * Fixture-only: the first eligible PML record for every BOM row of a spool revision. Operators
 * choose evidence in the UI; seed scripts take the first eligible one so a stage can be seeded.
 */
export async function materialCheckItemsFor(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<{ spool_revision_material_id: string; piping_material_record_id: string }[]> {
  const { data, error } = await client
    .from("material_trace_candidates")
    .select("spool_revision_material_id, piping_material_record_id")
    .eq("spool_revision_id", spoolRevisionId)
    .order("spool_revision_material_id")
    .order("piping_material_record_id")
  if (error) throw new Error(`Material candidates for ${spoolRevisionId}: ${error.message}`)
  const firstByRow = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.spool_revision_material_id && row.piping_material_record_id && !firstByRow.has(row.spool_revision_material_id)) {
      firstByRow.set(row.spool_revision_material_id, row.piping_material_record_id)
    }
  }
  return [...firstByRow].map(([bom, pml]) => ({ spool_revision_material_id: bom, piping_material_record_id: pml }))
}
```
If other scripts import `database.types` through the `@/` alias, use the same alias. Check `scripts/bootstrap-showcase-dataset.ts` imports first.

In `bootstrap-showcase-dataset.ts`, replace the `spool_revision_materials` select and the `target_items` map with `target_items: await materialCheckItemsFor(operator, revisionId)`. In `bootstrap-track07-browser-fixtures.ts:119-120`, do the same with `imported` and `spool.id`. Update the three comments so they say the fixture takes the first eligible PML record per BOM row, not "matches on ident code and trace number".

- [ ] **Step 5: Run the unit tests**

Run: `node --import tsx --test modules/construction/application/*.test.ts modules/construction/infrastructure/supabase-construction-errors.test.ts scripts/demo/*.test.ts`
Expected: PASS. A full `npm run typecheck` may still fail in UI files until Task 5.

- [ ] **Step 6: Commit**

```bash
git add modules/construction/domain modules/construction/application modules/construction/infrastructure/supabase-construction-errors*.ts scripts/demo/material-check-items.ts scripts/bootstrap-showcase-dataset.ts scripts/bootstrap-track07-browser-fixtures.ts scripts/demo/showcase-dataset.ts scripts/demo/showcase-dataset.test.ts
git commit -m "refactor(material-check): id-only payload, plain gates, fixtures pick eligible PML"
```

---

### Task 5: Client reads — typed selects, simple picker, no Reconfirm

**Files:**
- Rewrite: `modules/construction/infrastructure/supabase-material-check-repository.ts`, `supabase-material-check-repository.test.ts`
- Modify: `modules/construction/infrastructure/supabase-construction-repository.ts:12-28,357-371`
- Modify: `modules/construction/ui/use-material-check-workspace.ts`
- Rewrite: `modules/construction/ui/material-trace-picker.tsx`
- Modify: `components/ui/reference-combobox.tsx`
- Modify: `modules/construction/ui/fabrication/material-check-screen.tsx`, `modules/construction/ui/erection/field-material-check-screen.tsx`

**Interfaces:**
- Consumes: the types from Task 4 and the views from Task 2.
- Produces, in `supabase-material-check-repository.ts`:
```ts
export interface MaterialQc13Form { id: string; formNumber: string; requestedOn: string }
export interface MaterialCheckWorkspace {
  lines: BillLine[]
  accepted: AcceptedMaterialEvidence[]
  record: { id: string; checkedOn: string; qc13Form: MaterialQc13Form | null } | null
  latestQc13Form: MaterialQc13Form | null
}
export function toMaterialCheckWorkspace(input: { lines: LineRow[]; record: RecordRow | null; forms: FormRow[] }): MaterialCheckWorkspace
export async function loadMaterialCheckWorkspace(client: SupabaseClient<Database>, spoolRevisionId: string): Promise<MaterialCheckWorkspace>
export async function loadMaterialTraceCandidates(client: SupabaseClient<Database>, spoolRevisionMaterialId: string): Promise<MaterialCandidate[]>
```
where `LineRow = Database["public"]["Views"]["material_check_lines"]["Row"]`, `RecordRow = Pick<Tables<"material_check_records">, "id" | "checked_on" | "qc13_form_id">`, `FormRow = Pick<Tables<"qc13_progress_forms">, "id" | "form_number" | "requested_on">`.

- [ ] **Step 1: Write the failing repository test**

Replace `supabase-material-check-repository.test.ts` with:
```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { toMaterialCheckWorkspace } from "./supabase-material-check-repository"

const baseLine = {
  spool_revision_material_id: "bom-1", spool_revision_id: "rev-1", ident_code: "ID-1", description: "Pipe",
  quantity: 1, unit: "ea", expected_trace_number: "Heat-ab12",
  accepted_piping_material_record_id: null, accepted_trace_number: null, accepted_mrr_number: null, accepted_status: null,
}

test("lines map to BOM lines and accepted evidence keeps exact case", () => {
  const ws = toMaterialCheckWorkspace({
    lines: [{ ...baseLine, accepted_piping_material_record_id: "pml-1", accepted_trace_number: "Heat-ab12", accepted_mrr_number: "MRR-1", accepted_status: "active" }],
    record: null, forms: [],
  })
  assert.equal(ws.lines[0].expectedTraceNumber, "Heat-ab12")
  assert.deepEqual(ws.accepted, [{ spoolRevisionMaterialId: "bom-1", pipingMaterialRecordId: "pml-1", traceNumber: "Heat-ab12", mrrNumber: "MRR-1", status: "active" }])
})

test("accepted evidence whose PML row is not readable keeps the id with null labels", () => {
  const ws = toMaterialCheckWorkspace({ lines: [{ ...baseLine, accepted_piping_material_record_id: "pml-9" }], record: null, forms: [] })
  assert.deepEqual(ws.accepted[0], { spoolRevisionMaterialId: "bom-1", pipingMaterialRecordId: "pml-9", traceNumber: null, mrrNumber: null, status: null })
})

test("the recorded QC-13 and the latest QC-13 are told apart", () => {
  const forms = [
    { id: "f2", form_number: "QC13-2", requested_on: "2026-10-04" },
    { id: "f1", form_number: "QC13-1", requested_on: "2026-10-01" },
  ]
  const ws = toMaterialCheckWorkspace({ lines: [], record: { id: "r1", checked_on: "2026-10-02", qc13_form_id: "f1" }, forms })
  assert.equal(ws.record?.qc13Form?.formNumber, "QC13-1")
  assert.equal(ws.latestQc13Form?.formNumber, "QC13-2")
})
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --import tsx --test modules/construction/infrastructure/supabase-material-check-repository.test.ts`
Expected: FAIL, because `toMaterialCheckWorkspace` is not exported.

- [ ] **Step 3: Implement the repository**

Replace `supabase-material-check-repository.ts` with:
```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Tables } from "@/lib/supabase/database.types"
import type { AcceptedMaterialEvidence, BillLine, MaterialCandidate } from "../domain/material-check"
import { mapSupabaseConstructionError } from "./supabase-construction-errors"

type Client = SupabaseClient<Database>
type LineRow = Database["public"]["Views"]["material_check_lines"]["Row"]
type RecordRow = Pick<Tables<"material_check_records">, "id" | "checked_on" | "qc13_form_id">
type FormRow = Pick<Tables<"qc13_progress_forms">, "id" | "form_number" | "requested_on">

export interface MaterialQc13Form { id: string; formNumber: string; requestedOn: string }
export interface MaterialCheckWorkspace {
  lines: BillLine[]
  accepted: AcceptedMaterialEvidence[]
  record: { id: string; checkedOn: string; qc13Form: MaterialQc13Form | null } | null
  latestQc13Form: MaterialQc13Form | null
}

function fail(error: { code?: string; message?: string } | null): void {
  if (error) throw new Error(mapSupabaseConstructionError(error))
}

const toForm = (form: FormRow): MaterialQc13Form => ({ id: form.id, formNumber: form.form_number, requestedOn: form.requested_on })

/** `forms` must be ordered newest first, as `loadMaterialCheckWorkspace` reads them. */
export function toMaterialCheckWorkspace(input: { lines: LineRow[]; record: RecordRow | null; forms: FormRow[] }): MaterialCheckWorkspace {
  const lines: BillLine[] = input.lines.map((row) => ({
    spoolRevisionMaterialId: row.spool_revision_material_id ?? "",
    identCode: row.ident_code ?? "",
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    expectedTraceNumber: row.expected_trace_number,
  }))
  const accepted: AcceptedMaterialEvidence[] = input.lines
    .filter((row) => row.accepted_piping_material_record_id !== null)
    .map((row) => ({
      spoolRevisionMaterialId: row.spool_revision_material_id ?? "",
      pipingMaterialRecordId: row.accepted_piping_material_record_id ?? "",
      traceNumber: row.accepted_trace_number,
      mrrNumber: row.accepted_mrr_number,
      status: row.accepted_status,
    }))
  const recorded = input.record?.qc13_form_id ? input.forms.find((form) => form.id === input.record?.qc13_form_id) : undefined
  return {
    lines,
    accepted,
    record: input.record ? { id: input.record.id, checkedOn: input.record.checked_on, qc13Form: recorded ? toForm(recorded) : null } : null,
    latestQc13Form: input.forms[0] ? toForm(input.forms[0]) : null,
  }
}

export async function loadMaterialCheckWorkspace(client: Client, spoolRevisionId: string): Promise<MaterialCheckWorkspace> {
  const [lines, record, forms] = await Promise.all([
    client.from("material_check_lines").select("*").eq("spool_revision_id", spoolRevisionId)
      .order("ident_code").order("expected_trace_number").order("spool_revision_material_id"),
    client.from("material_check_records").select("id, checked_on, qc13_form_id").eq("spool_revision_id", spoolRevisionId).maybeSingle(),
    client.from("qc13_progress_forms").select("id, form_number, requested_on").eq("spool_revision_id", spoolRevisionId)
      .order("requested_on", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }),
  ])
  fail(lines.error)
  fail(record.error)
  fail(forms.error)
  return toMaterialCheckWorkspace({ lines: lines.data ?? [], record: record.data, forms: forms.data ?? [] })
}

/** Every eligible PML record for one BOM row: the server's rule, read from `material_trace_candidates`. */
export async function loadMaterialTraceCandidates(client: Client, spoolRevisionMaterialId: string): Promise<MaterialCandidate[]> {
  const { data, error } = await client.from("material_trace_candidates")
    .select("piping_material_record_id, trace_number, mrr_number")
    .eq("spool_revision_material_id", spoolRevisionMaterialId)
    .order("trace_number").order("piping_material_record_id")
  fail(error)
  return (data ?? []).map((row) => ({
    id: row.piping_material_record_id ?? "",
    traceNumber: row.trace_number ?? "",
    mrrNumber: row.mrr_number ?? "",
  }))
}
```
If `Tables` is not exported from `database.types.ts`, use `Database["public"]["Tables"]["material_check_records"]["Row"]` instead. If the view row column for `accepted_status` has a different generated type, use the generated one.

In `supabase-construction-repository.ts`:
- delete the import/re-export block of the material repository (lines 12–28);
- delete `loadBillOfMaterials` and `loadMaterialCheckItems` (lines 357–371);
- remove `AcceptedMaterialEvidence` / `BillLine` imports if they become unused.

Run `grep -rn "loadBillOfMaterials\|loadMaterialCheckItems\|searchMaterialTraceCandidates\|MaterialCandidateCursor\|MaterialCandidatePage" modules app components scripts` and fix every hit.

- [ ] **Step 4: Picker, combobox, hook, screens**

`components/ui/reference-combobox.tsx`: delete the `loadingMore`, `onLoadMore` and `hasMore` props and the «Load more» block (lines ~149–162). Nothing else changes.

`modules/construction/ui/material-trace-picker.tsx`: replace the file with:
```tsx
"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { ReferenceCombobox } from "@/components/ui/reference-combobox"
import type { BillLine, MaterialCandidate } from "../domain/material-check"
import type { MaterialDraftChoice } from "../application/material-check-draft"
import { loadMaterialTraceCandidates } from "../infrastructure/supabase-material-check-repository"

export interface MaterialTracePickerProps {
  line: BillLine
  selectedDraft?: MaterialDraftChoice
  disabled?: boolean
  pmlHref?: string
  onChoose: (line: BillLine, candidate: MaterialCandidate) => void
  onClear: (spoolRevisionMaterialId: string) => void
}

/** Loads the row's eligible PML records once, when first opened, and filters them locally. */
export function MaterialTracePicker({ line, selectedDraft, disabled = false, pmlHref, onChoose, onClear }: MaterialTracePickerProps) {
  const [attempt, setAttempt] = useState(0)
  const [candidates, setCandidates] = useState<MaterialCandidate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (attempt === 0) return
    let ignore = false
    setError(null)
    loadMaterialTraceCandidates(getSupabaseBrowserClient(), line.spoolRevisionMaterialId)
      .then((rows) => { if (!ignore) setCandidates(rows) })
      .catch((err: unknown) => { if (!ignore) setError(err instanceof Error ? err.message : "Material traces could not be loaded.") })
    return () => { ignore = true }
  }, [attempt, line.spoolRevisionMaterialId])

  const open = () => { if (attempt === 0) setAttempt(1) }
  const needle = query.trim().toLowerCase()
  const visible = useMemo(
    () => (candidates ?? []).filter((c) => !needle || c.traceNumber.toLowerCase().includes(needle) || c.mrrNumber.toLowerCase().includes(needle)),
    [candidates, needle],
  )

  return (
    <div className="flex flex-col gap-1 w-full" onClick={open} onFocus={open}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
        <span className="truncate">{line.expectedTraceNumber ? `BOM trace: ${line.expectedTraceNumber}` : "BOM does not specify a trace"}</span>
        {pmlHref ? (
          <Link href={pmlHref} className="shrink-0 text-[10px] uppercase tracking-wider text-primary hover:underline">Open PML</Link>
        ) : (
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">Source: PML</span>
        )}
      </div>
      <ReferenceCombobox
        label={`Material trace for ${line.identCode}`}
        selectedId={selectedDraft?.pipingMaterialRecordId ?? null}
        selectedLabel={selectedDraft ? `${selectedDraft.traceNumber} (MRR ${selectedDraft.mrrNumber})` : null}
        options={visible.map((c) => ({ id: c.id, label: `${c.traceNumber} · MRR ${c.mrrNumber}` }))}
        query={query}
        loading={attempt > 0 && candidates === null && error === null}
        error={error}
        onQueryChange={setQuery}
        onChoose={(id) => { const candidate = candidates?.find((c) => c.id === id); if (candidate) onChoose(line, candidate) }}
        onClear={() => onClear(line.spoolRevisionMaterialId)}
        onRetry={() => setAttempt((n) => n + 1)}
        disabled={disabled}
        emptyMessage={needle ? "No matching traces" : "No active PML evidence matches this BOM row"}
        placeholder="Select registered trace"
      />
    </div>
  )
}
```

`use-material-check-workspace.ts`:
- `choose(line, candidate)` stores `{ spoolRevisionMaterialId: line.spoolRevisionMaterialId, pipingMaterialRecordId: candidate.id, traceNumber: candidate.traceNumber, mrrNumber: candidate.mrrNumber }`. Remove the `lineExists` / `status` / `expectedTraceNumber` checks: candidates come from the server's eligible list.
- `entries` maps drafts to `{ spoolRevisionMaterialId, pipingMaterialRecordId }`.
- Everything else stays.

Both screens (`material-check-screen.tsx`, `field-material-check-screen.tsx`):
- Delete `isReconfirmMode`, the `reconfirm-date` pending action, the «Reconfirm check date» label and its toast. The button label is always `Record traces` (shop) or `Record field traces` (field).
- When every BOM row has accepted evidence (`accepted.length >= lines.length && lines.length > 0`), do not render the record button. Keep the existing completion and next-step content.
- Call the gates with the new signatures:
  - `describeMaterialCheckGate(lines, entries, spool?.dates.start_fab ?? null)`;
  - `describeFieldMaterialCheckGate({ lines, entries, toSiteOn, canRecord })`.
  Drop the `acceptedLineIds` memo if nothing else uses it.
- Send `qc13FormId: latestQc13Form?.id ?? null`. The server keeps the first link.
- `<MaterialTracePicker>`: remove the `targetKey` prop. Make sure the element's `key` is `line.spoolRevisionMaterialId`, so a different spool remounts the picker.

- [ ] **Step 5: Typecheck, lint and unit tests**

Run: `npm run typecheck && npx eslint modules/construction components/ui/reference-combobox.tsx scripts/demo && npm run test:unit`
Expected: all exit 0.

- [ ] **Step 6: Commit**

```bash
git add modules/construction components/ui/reference-combobox.tsx
git commit -m "refactor(material-check): typed view reads, one-query picker, drop Reconfirm"
```

---

### Task 6: Verify end to end, update the live stand without a reset, report

**Files:**
- Modify: `scripts/verify-material-traceability-workbench.ts`. Remove `ARTIFACT_DIR` and its writes; evidence goes only to `docs/superpowers/specs/screenshots/`. The scenario must be **read-only**: it never presses `Record traces` / `Record field traces`, because SHOWCASE-1 is the owner's live demo data.
- Modify: `docs/acceptance/2026-10-06-material-traceability-workbench.md`, `docs/audits/2026-10-06-backend-simplification.md`

- [ ] **Step 1: Checks that do not touch any database**

Run: `npm run lint && npm run typecheck && npm run test:unit`
Expected: exit 0 (lint may print warnings, no errors).

- [ ] **Step 2: pgTAP on the isolated stack**

Run: `bash tasks/material-check/pgtap.sh check`
Expected: `OK   pgTAP suite: no failures beyond the 13 known environment ones`.

- [ ] **Step 3: Apply the new migration to the live stand — no reset**

Run: `npx supabase migration up --local`
Expected: it applies exactly `20261007090000_material_check_simplify.sql`, and SHOWCASE-1 keeps its data:
```zsh
npx supabase db query --local "select (select count(*) from public.spools) spools, (select count(*) from public.material_check_records) material_checks, to_regclass('public.material_check_lines') is not null new_view, to_regprocedure('public.read_material_check_workspace(uuid,uuid,integer)') is null old_reads_gone"
```
shows `spools` = 16, `material_checks` = 15, `new_view` = true, `old_reads_gone` = true.
Then `npm run demo:check` → exit 0.

- [ ] **Step 4: Browser check (read-only)**

The dev server is already running on http://127.0.0.1:3000 — do not stop it. Log in as `track01.platform-admin@example.test`; the password comes from `.env.local` through the verify script, never typed into a command. On `SHOWCASE-1`:
1. Fabrication → a spool with Start Fab recorded and Material not complete (for example `SP-1008-B`) → Material operation: BOM rows are listed; recorded rows show trace and MRR.
2. Open one unrecorded row's trace picker: only eligible records are listed; typing filters the list without a network request per keystroke.
3. Choose a trace: the row shows it as a draft and the record button becomes enabled. **Do not press it.** Clear the choice again (the clear action of the picker).
4. Erection → the same spool → Field material: rows and the QC-13 form are visible.

Update `scripts/verify-material-traceability-workbench.ts` to cover 1–4 exactly like this (no click on a Record button), then run:
`npx tsx --env-file-if-exists=.env.local scripts/verify-material-traceability-workbench.ts`
Expected: exit 0, screenshots saved. Afterwards the counts from Step 3 are unchanged.

- [ ] **Step 5: Measure the simplification**

Run: `git diff --shortstat f52cd03..HEAD -- supabase/migrations modules components lib scripts ':!lib/supabase/database.types.ts'`
Record the insertions and deletions. Expected: net negative.

- [ ] **Step 6: Update the documents**

In the acceptance document, add a section `## Simplification (2026-10-06)` with:
- the commit list;
- the line delta from Step 5;
- the replaced acceptance rows:
  - A08: «Load more» removed — one query per row, filtered locally;
  - A14: Reconfirm removed; it was failing with 23514 because it sent an empty item list;
  - A24: no pagination;
  - PQC58 removed.
- the command outputs from Steps 1–4.

In the audit document, mark B1, B2, B3, B4 and B8 as done with the commit hashes.

- [ ] **Step 7: Commit**

```bash
git add scripts/verify-material-traceability-workbench.ts docs/acceptance/2026-10-06-material-traceability-workbench.md docs/audits/2026-10-06-backend-simplification.md docs/superpowers/specs/screenshots
git commit -m "docs(material-check): record the simplification and its verification"
```

---

## Self-Review

- **Spec coverage:**
  - B1 → Task 3, Task 4.
  - B2 → Task 2.
  - B3 → Task 5.
  - B4 → Task 2 and Task 5 (no cursors anywhere).
  - B8 → Task 4.
  - Rule 2 guard → Task 1.
  - The two cancelled rules (Reconfirm, first QC-13) → Task 3 and Task 5.
- **Review Focus coverage:**
  - item 1 → Task 2 tests (erection contributor lines, candidates, QC-13);
  - item 2 → Task 2 (no membership, other PDS area);
  - item 3 → Task 3 (resubmit, switch, case);
  - item 4 → Task 3 (QC-13 kept);
  - item 5 → Task 6, Step 4 (picker empty state; checked in the browser on a row whose Ident has no active PML, if SHOWCASE-1 has one — otherwise covered by the `emptyMessage` code path).
- **Types:**
  - `TraceEntry`, `MaterialCandidate` and `AcceptedMaterialEvidence` are defined once in Task 4 and used unchanged in Task 5.
  - `loadMaterialTraceCandidates` (Task 5) replaces `searchMaterialTraceCandidates` everywhere.
  - `describeMaterialCheckGate(lines, entries, startFabOn)` has three arguments in both Task 4 and Task 5.
