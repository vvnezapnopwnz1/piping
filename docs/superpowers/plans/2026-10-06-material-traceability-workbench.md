# PML → BOM → Material Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. В этой сессии владелец передаёт документ другому агенту самостоятельно; автоматически запускать исполнителя не требуется.

**Goal:** Связать существующий PML со строками BOM и проверкой материала в Fabrication/Erection: оператор выбирает допустимое подтверждение, видит его источник и сохраняет его отдельной командой.

**Architecture:** Единица проверки — `spool_revision_materials.id`, как в существующих FK, unique constraint и серверных счётчиках. Узкие read-only RPC читают материалы только разрешённой текущей spool revision; общий domain model и picker используются в двух существующих экранах. Write RPC сохраняет нынешние фазовые guards, immutable evidence, ledger и idempotency, но принимает явные ID строки BOM и источника PML внутри JSON items.

**Tech Stack:** Next.js/React/TypeScript, Supabase/PostgreSQL, существующие Radix Popover + cmdk, `node:test`, pgTAP. Новые UI-библиотеки и тестовые фреймворки не нужны.

---

## 1. Передача задачи и границы

Этот документ — задание на реализацию **первой очереди** из [исследования связей модулей](../../audits/2026-10-06-module-connections-and-field-sources.md), пункты M01–M05 и относящиеся к материалам G01–G03. Из M06 включается только прозрачность источника QC-13; новый workflow выбора/исправления форм не создаётся.

Владелец уже выбрал передачу внешнему агенту и последующую независимую проверку. Исполнитель делает реализацию и предоставляет доказательства; своё сообщение о завершении не считать приёмкой владельцем.

- **Assembly не реализовывать.** WPS/welders, NDE, Flange, Tracking и полный пересмотр всех referentials — следующие самостоятельные очереди.
- Не создавать ветки/worktree/коммиты, не выполнять push/PR/merge/deploy без отдельного указания владельца. Совет навыка про Git не является разрешением.
- В shared workspace идёт отдельная работа по Test Pack. Не переписывать `modules/pressure-test/**`, shell и общий unsaved guard. Использовать существующие hooks. Повторно прочитать затрагиваемые файлы непосредственно перед изменением.
- Не расширять `spooling.view`, `project_referential.manage` или admin права ради dropdown. Browser использует обычную пользовательскую сессию; service-role key в UI запрещён.
- Не изменять исторические миграции. Создать новую миграцию. Не нормализовать массово trace/Ident, не объединять PML records и не перепривязывать accepted evidence.
- Не делать reset/seed реального локального или hosted стенда. Не заполнять engineering tables TRACK01-A/B. Для DB-тестов использовать изолированный локальный экземпляр с пустыми engineering tables; browser fixture — отдельный непроизводственный проект, не TRACK01-A/B и не чужой SHOWCASE-1.
- Прочитать AGENTS.md. Скрипты сами читают `.env.local`; не изобретать пароль, не передавать/экспортировать локальные секреты, не печатать их. При отсутствии обязательного значения остановить зависимый шаг и запросить значение у владельца.

## 2. Что подтверждено текущим кодом

| Факт | Источник | Следствие для реализации |
| --- | --- | --- |
| BOM допускает один Ident в разных строках с разными trace | `supabase/migrations/20260803090000_engineering_entities.sql`, unique index `spool_revision_materials_key` | State, selection, accepted map и counters индексировать по BOM UUID |
| Evidence уникален по record + BOM row; сервер завершает проверку по всем BOM row IDs | `20260804091000_material_traceability.sql`, `20260810093000_erection_progress_commands.sql` | Не проектировать несколько heats на одну строку; исправить неверный domain-комментарий/тест |
| Domain считает строки по Ident, UI хранит значения по Ident | `modules/construction/domain/material-check.ts`, оба material screens | Два ID-1/H1 и ID-1/H2 сейчас могут считаться complete после одной записи |
| PML create сохраняет `Heat-ab12`, payload Material Check делает uppercase | `welding-quality-reference.ts`, `record-material-check.ts` | Выбор должен сериализовать точные значения источника, сохраняя регистр |
| PML view доступен стандартным access-ролям editor/reader и не требует functional role | `20260731090000_access_capability_catalog.sql`, `20260731091000_access_capability_security.sql` | Не заявлять отсутствие reference-view только по списку functional role |
| Прямой BOM SELECT требует `spooling.view`; erection_contributor и qc_engineer не получают его своей functional role | `20260803091000_engineering_revisions.sql:264`, capability catalog | Для рабочих ролей нужен узкий operational read contract, а не выдача Engineering read |
| Текущий loader evidence использует inner BOM/PML joins и теряет source IDs | `supabase-construction-repository.ts`, `loadMaterialCheckItems` | Read contract возвращает UUID и исторические labels независимо от active status |
| Один material record общий для shop/field, фазовые события отдельные | `record_material_check` и wrapper `record_field_material_check`; test `073_material_check_phase_naming` | Не разделять record на два; сохранить фазовые prerequisite и ledger |

Это выводы из текущих файлов, **не подтверждение применённых миграций или browser acceptance стенда**. При drift использовать актуальный код и сообщить о расхождении; устаревший roadmap не считается доказательством.

## 3. Фиксированные правила продукта

1. Для новой строки требуется осознанный выбор **active PML record** того же проекта и точного Ident. Если BOM содержит expected trace, подходят только записи с этим точным trace.
2. Search может быть case-insensitive по trace/MRR. Identity, display и payload сохраняют исходный регистр. `Heat-ab12` и `HEAT-AB12` могут быть двумя разными существующими записями.
3. Выбор из списка не выполняет write RPC. Свободный текст — только поиск, не новое evidence. Даже единственный вариант не выбирается автоматически при загрузке/blur.
4. Записанная строка read-only: accepted trace, MRR, source status, checked quantity. Inactive/archived evidence остаётся видимым и учитывается в записанных строках, но не попадает в новые варианты.
5. Новые выборы хранятся отдельно от accepted evidence. Partial check сохраняется; требовать выбора всех строк перед Record нельзя.
6. Record отправляет только новые выбранные строки. Если уже есть accepted record, его QC-13 связь сохраняется; новая issued form не заменяет эту связь автоматически.
7. Возможность повторно подтвердить дату не теряется: отдельный `Reconfirm check date` без редактирования evidence. Он отправляет точный accepted snapshot и существующую QC-13 связь. Если source недоступен или не active, действие disabled с объяснением; существующий server active requirement не обходить.
8. Для новой записи отображать `Latest issued QC-13`, номер/дата/spool revision. Для существующей — `Recorded with QC-13`; если последняя issued form другая, отображать её отдельно. Не выдавать latest за принятый источник.
9. При смене project/spool/BOM строки старые асинхронные ответы не меняют новый экран. Ошибка записи сохраняет draft. Успех очищает только отправленный snapshot и не затрагивает другой target.
10. Search не dirty. Выбранный PML/date draft dirty. Закрытие Drawer, смена spool/project, переход в PML и назад используют существующий unsaved guard. При подтверждённом уходе draft может быть отброшен; бесшумная потеря запрещена.

## 4. Карта файлов

Пути относительно корня репозитория. Если файл появился у другого исполнителя, перечитать его, а не создавать поверх.

| Действие | Файл | Ответственность |
| --- | --- | --- |
| Modify | `modules/construction/domain/material-check.ts` | UUID identity, reconciliation, candidate/evidence types |
| Modify | `modules/construction/domain/material-check.test.ts` | Duplicate Ident, exact case, accepted counters |
| Modify | `modules/construction/application/record-material-check.ts` | Gate и новый JSON payload |
| Modify | `modules/construction/application/record-field-material-check.ts` | Тот же material validation, field-specific prerequisite |
| Modify | `modules/construction/application/record-material-check.test.ts` | Payload/source identity/partial |
| Modify | `modules/construction/application/record-field-material-check.test.ts` | Field gate/capability/partial |
| Create | `supabase/migrations/20261006120000_material_check_workbench.sql` | Narrow reads и UUID write validation |
| Create | `supabase/tests/database/108_material_check_workbench.test.sql` | Read access, same-Ident rows, compatibility, evidence guards |
| Modify | `lib/supabase/database.types.ts` | Generated RPC types |
| Create | `modules/construction/infrastructure/supabase-material-check-repository.ts` | Paged workspace/candidate loaders, explicit decoder |
| Create | `modules/construction/infrastructure/supabase-material-check-repository.test.ts` | Paging, exact labels, missing evidence, safe search |
| Modify | `modules/construction/infrastructure/supabase-construction-repository.ts` | Existing BOM/evidence wrappers делегируют новый read contract |
| Modify | `modules/construction/infrastructure/supabase-construction-errors.ts` | Ambiguous legacy command message |
| Modify | `modules/construction/infrastructure/supabase-construction-errors.test.ts` | Новый error mapping |
| Modify | `modules/construction/infrastructure/construction-select-columns.test.ts` | Сохранить проверку реальных remaining SELECTs после переноса read path |
| Create | `modules/construction/application/material-check-draft.ts` | Snapshot-safe draft cleanup и request ownership helpers |
| Create | `modules/construction/application/material-check-draft.test.ts` | Race/failed save/snapshot cleanup |
| Create | `modules/construction/ui/use-material-check-workspace.ts` | Shared load/refresh/draft state для обоих экранов |
| Create | `components/ui/reference-combobox.tsx` | Presentation primitive; без Supabase/доменных правил |
| Create | `modules/construction/ui/material-trace-picker.tsx` | Material search, eligibility и объяснения |
| Modify | `modules/construction/ui/fabrication/material-check-screen.tsx` | Integrate общий workspace/picker, сохранить shop commands |
| Modify | `modules/construction/ui/erection/field-material-check-screen.tsx` | Integrate общий workspace/picker, сохранить field commands |
| Create | `modules/construction/application/material-reference-link.ts` | Project/spool/BOM/return address для PML |
| Create | `modules/construction/application/material-reference-link.test.ts` | Deep link/context/safe return |
| Modify | `modules/project-setup/ui/project-referential-screen.tsx` | Addressable PML inner tab |
| Modify | `modules/project-setup/ui/welding-quality-tabs.tsx` | Controlled inner tab и входящий Ident filter |
| Modify | `modules/project-setup/infrastructure/supabase-welding-quality-reference-repository.ts` | Полная paged загрузка только PML ветки, optional exact Ident filter |
| Create | `modules/project-setup/infrastructure/piping-material-records-loading.test.ts` | PML paging/filter, остальные reference branches не меняются |
| Create | `docs/acceptance/2026-10-06-material-traceability-workbench.md` | Доказательства, ограничения, итоговая матрица |

Имя migration/test свободно на момент подготовки. Если другой агент занял timestamp/номер, выбрать следующий свободный, отразить замену в acceptance. Старые migration files не редактировать.

## 5. Задачи реализации

### Task 1: Зафиксировать baseline и безопасный стенд

**Files:** Read AGENTS.md, audit выше, текущие files из карты, `package.json`, `supabase/config.toml`; create acceptance document.

- [ ] Записать baseline: текущие definitions read/write RPC, effective capabilities нужных ролей, существующие guards в обоих экранах и состояние параллельной работы. Для DB окружения указать адрес без секретов, isolation и список применённых migrations.
- [ ] Создать acceptance документ с разделами `Scope`, `Baseline`, `Changes`, `Commands and exit codes`, `Database`, `Browser`, `Acceptance matrix`, `Open issues`. Пока проверки не выполнены, использовать `not run`, а не `passed`.
- [ ] Прочитать package scripts и проверить baseline typecheck/unit. Не запускать DB/reset на общем populated stand:

```sh
npm run typecheck
node --import tsx --test modules/construction/domain/material-check.test.ts modules/construction/application/record-material-check.test.ts modules/construction/application/record-field-material-check.test.ts modules/construction/infrastructure/supabase-construction-repository.test.ts
```

Expected: exit 0, либо конкретный baseline failure с файлом/ошибкой. Не исправлять посторонний Test Pack в рамках этого плана. Прежде чем применять миграцию, удостовериться, что CLI обращается к изолированному local DB; никакого `--linked`/hosted apply.

### Task 2: Единица проверки и точная identity в domain/application

**Files:** domain/application material files и их tests из карты.

- [ ] Добавить regression test до изменения реализации. Существующие fixture entries обновить до обязательных UUID полей; старый тест «несколько heats удовлетворяют одну строку» заменить тестом запрета повторной строки в одном command.

```ts
const bill: BillLine[] = [
  { spoolRevisionMaterialId: "b1", identCode: "ID-1", description: null,
    quantity: 1, unit: "ea", expectedTraceNumber: "Heat-ab12" },
  { spoolRevisionMaterialId: "b2", identCode: "ID-1", description: null,
    quantity: 1, unit: "ea", expectedTraceNumber: "H2" },
]
const first: TraceEntry = { spoolRevisionMaterialId: "b1",
  pipingMaterialRecordId: "p1", identCode: "ID-1",
  traceNumber: "Heat-ab12", quantity: 1 }
const result = reconcileMaterialCheck(bill, [first])
assert.equal(result.checkedCount, 1)
assert.equal(result.isComplete, false)
assert.deepEqual(result.outstanding.map(x => x.spoolRevisionMaterialId), ["b2"])
assert.equal(toMaterialCheckPayload({ spoolRevisionId: "s1", checkedOn: "2026-10-06",
  qc13FormId: null, entries: [first] }).items[0].trace_number, "Heat-ab12")
```

- [ ] Заменить `TraceEntry` и reconciliation на следующие контракты. `BillLine` оставить с нынешними полями. Удалить uppercase normalization и обновить импорты/комментарии/тесты всех её потребителей.

```ts
export interface TraceEntry {
  spoolRevisionMaterialId: string
  pipingMaterialRecordId: string
  identCode: string
  traceNumber: string
  quantity: number | null
}
export interface MaterialCandidate {
  id: string
  identCode: string
  traceNumber: string
  mrrNumber: string
  status: "active"
}
export interface AcceptedMaterialEvidence {
  materialCheckItemId: string
  spoolRevisionMaterialId: string
  pipingMaterialRecordId: string
  traceNumber: string | null
  mrrNumber: string | null
  status: "active" | "inactive" | "archived" | null
  quantity: number | null
}
export interface MaterialCheckReconciliation {
  lineTotal: number
  checkedCount: number
  isComplete: boolean
  outstanding: BillLine[]
  invalidEntries: { spoolRevisionMaterialId: string; reason: string }[]
}
export function reconcileMaterialCheck(
  lines: readonly BillLine[], entries: readonly TraceEntry[],
  acceptedLineIds: readonly string[] = [],
): MaterialCheckReconciliation {
  const byId = new Map(lines.map(line => [line.spoolRevisionMaterialId, line]))
  const satisfied = new Set(acceptedLineIds.filter(id => byId.has(id)))
  const submitted = new Set<string>()
  const invalidEntries: MaterialCheckReconciliation["invalidEntries"] = []
  for (const entry of entries) {
    const id = entry.spoolRevisionMaterialId
    const line = byId.get(id)
    let reason: string | null = null
    if (!line) reason = "The material row is not in this spool revision BOM."
    else if (submitted.has(id)) reason = "Select one trace per BOM row."
    else if (!entry.pipingMaterialRecordId || !entry.traceNumber.trim())
      reason = "Select a registered PML trace."
    else if (entry.identCode.trim() !== line.identCode)
      reason = "The selected trace belongs to a different Ident code."
    else if (line.expectedTraceNumber !== null &&
      entry.traceNumber.trim() !== line.expectedTraceNumber)
      reason = "The selected trace does not match the BOM trace."
    else if (entry.quantity !== null &&
      (!Number.isFinite(entry.quantity) || entry.quantity < 0))
      reason = "Material quantity must be a non-negative finite number."
    submitted.add(id)
    if (reason) invalidEntries.push({ spoolRevisionMaterialId: id, reason })
    else satisfied.add(id)
  }
  const outstanding = lines.filter(line => !satisfied.has(line.spoolRevisionMaterialId))
  return { lineTotal: lines.length, checkedCount: satisfied.size,
    isComplete: lines.length > 0 && outstanding.length === 0 && invalidEntries.length === 0,
    outstanding, invalidEntries }
}
```

- [ ] В обоих gates проверять `invalidEntries[0]?.reason`, сохранив нынешний порядок capability/пустой BOM/prerequisite/нет entries. Пустой выбор объяснять `Select at least one registered material trace.` Partial остаётся allowed. Payload items:

```ts
// MaterialCheckPayload.items и toMaterialCheckPayload используют один shape.
type MaterialCheckItemPayload = {
  spool_revision_material_id: string
  piping_material_record_id: string
  ident_code: string
  trace_number: string
  quantity: number | null
}
const items: MaterialCheckItemPayload[] = draft.entries.map(entry => ({
  spool_revision_material_id: entry.spoolRevisionMaterialId,
  piping_material_record_id: entry.pipingMaterialRecordId,
  ident_code: entry.identCode.trim(),
  trace_number: entry.traceNumber.trim(),
  quantity: entry.quantity,
}))
```

- [ ] Проверить дополнительно: два distinct BOM IDs одного Ident complete только после двух entries; неизвестный row UUID; wrong Ident; wrong expected trace; duplicate row; empty BOM; accepted inactive row counts через `acceptedLineIds`; null expected trace позволяет любой registered trace того же Ident; mixed-case import/create/command не uppercase.
- [ ] Запустить focused unit command Task 1. Expected: exit 0 после обновления fixtures и assertions. До integration TypeScript может указывать старых экранных callers; перечислить их, а не вводить optional UUID для обхода ошибок.

### Task 3: Write RPC принимает BOM/PML IDs и сохраняет legacy compatibility

**Files:** create migration из карты; modify construction error mapper/test; create pgTAP file.

- [ ] В pgTAP transaction добавить строки одного Ident с H1/H2 и untraced/traced ambiguity. Assertions: explicit distinct IDs принимаются в одном command; одна строка дважды — 23514; ambiguous legacy payload — PQC58; unique legacy payload работает; foreign BOM/PML ID — отказ.
- [ ] В новой миграции скопировать **актуальное полное тело** шестипараметрического `record_material_check` через `create or replace`; исходник на момент плана — `20260810093000_erection_progress_commands.sql:101`. Не менять signature/wrapper/grants, фазовые guards, receipts, advisory lock, audit snapshots и derivation. Добавить declarations:

```sql
item_bom_id uuid;
item_pml_id uuid;
bom_match_count integer;
seen_bom_ids uuid[] := array[]::uuid[];
```

Удалить `seen_ident_codes` declaration и запрет повторного Ident. В loop после чтения trim ident/trace добавить parsing, а прежний `select bom_row ... order ... limit 1` заменить полностью:

```sql
begin
  item_bom_id := nullif(item_value ->> 'spool_revision_material_id', '')::uuid;
  item_pml_id := nullif(item_value ->> 'piping_material_record_id', '')::uuid;
exception when invalid_text_representation then
  raise exception 'Material reference IDs must be UUIDs' using errcode = '23514';
end;
if (item_value ? 'spool_revision_material_id' and item_bom_id is null)
   or (item_value ? 'piping_material_record_id' and item_pml_id is null) then
  raise exception 'Provided material reference IDs must not be empty' using errcode = '23514';
end if;
if item_bom_id is null then
  select count(*) into bom_match_count
  from public.spool_revision_materials material
  where material.spool_revision_id = target_spool_revision_id
    and material.ident_code = item_ident_code
    and (material.trace_number is null or material.trace_number = item_trace_number);
  if bom_match_count > 1 then
    raise exception 'Specify the BOM row for this material check' using errcode = 'PQC58';
  end if;
  select material.id into item_bom_id
  from public.spool_revision_materials material
  where material.spool_revision_id = target_spool_revision_id
    and material.ident_code = item_ident_code
    and (material.trace_number is null or material.trace_number = item_trace_number);
end if;
select * into bom_row from public.spool_revision_materials material
where material.id = item_bom_id
  and material.spool_revision_id = target_spool_revision_id
  and material.ident_code = item_ident_code
  and (material.trace_number is null or material.trace_number = item_trace_number);
if not found then
  raise exception 'Material row is not in this spool revision BOM' using errcode = 'PQC30';
end if;
if bom_row.id = any(seen_bom_ids) then
  raise exception 'Each BOM row may appear only once per command' using errcode = '23514';
end if;
seen_bom_ids := array_append(seen_bom_ids, bom_row.id);
```

PML SELECT сохраняет точное project/Ident/trace/status равенство и получает дополнительное условие:

```sql
and (item_pml_id is null or pml.id = item_pml_id)
```

Непереданный ID поддерживается **только для старого JSON contract**; явно переданный null/пустой ID отвергается. Новый UI всегда отправляет оба ID. Wrong ID не должен fallback-иться к другой строке. SQL remains authoritative даже при ручной подмене client payload.

- [ ] Добавить error mapper case и unit assertion:

```ts
case "PQC58":
  return "More than one BOM row matches this material. Reload and select the specific material row."
```

- [ ] Тестировать atomic rollback для batch с одним valid и одним invalid item, immutable PML/quantity, active-only new evidence, отсутствие Start Fab/To Site, wrong project, stale revision, idempotency replay и derived event только после **всех** BOM IDs. Existing tests `050_material_traceability`/`073_material_check_phase_naming` должны остаться зелёными; не ослаблять security assertions.

### Task 4: Узкий operational read contract вместо Engineering privileges

**Files:** та же новая migration и pgTAP file; generated database types.

- [ ] Создать private read guard. SECURITY DEFINER здесь необходим: существующий BOM RLS требует `spooling.view`. Guard использует actual membership capabilities и тот же target/PDS/current-revision guard, что construction. Он не принимает доверенный browser projectId и не выполняет записей.

```sql
create function public.assert_material_check_read_target(target_spool_revision_id uuid)
returns public.spool_context
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  project_id uuid;
  required_view text;
  context public.spool_context;
begin
  select iso.project_id into project_id
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = target_spool_revision_id;
  if project_id is null then
    raise exception 'Construction target is missing' using errcode = 'PQC30';
  end if;
  if public.current_user_has_capability(project_id, 'fabrication.view') then
    required_view := 'fabrication.view';
  elsif public.current_user_has_capability(project_id, 'erection.view') then
    required_view := 'erection.view';
  else
    raise exception 'Material target is outside your authorized scope' using errcode = '42501';
  end if;
  context := public.assert_construction_target(target_spool_revision_id, required_view);
  if not public.current_user_has_capability(context.project_id, 'project_referential.view') then
    raise exception 'Project referential read is unavailable' using errcode = '42501';
  end if;
  return context;
end;
$$;
revoke all on function public.assert_material_check_read_target(uuid) from public, anon, authenticated;
```

В текущем BOM/PML contract нет subcontractor FK для дополнительного material filter. Не выдумывать такую связь; сохранить существующие scope checks, не менять subcontractor policies на справочниках других сущностей. PDS guard обязательно тестировать ordinary scoped account.

- [ ] Добавить paged workspace RPC. Header возвращается и при пустом BOM; left joins сохраняют accepted item ID даже если label недоступен. Никакого фильтра `pml.status = active` на accepted evidence.

```sql
create function public.read_material_check_workspace(
  target_spool_revision_id uuid,
  after_id uuid default null,
  page_size integer default 200
)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  context public.spool_context;
  take_count integer := greatest(1, least(coalesce(page_size, 200), 500));
  result jsonb;
begin
  context := public.assert_material_check_read_target(target_spool_revision_id);
  with page as (
    select material.* from public.spool_revision_materials material
    where material.spool_revision_id = target_spool_revision_id
      and (after_id is null or material.id > after_id)
    order by material.id limit take_count + 1
  ), visible as (
    select * from page order by id limit take_count
  )
  select jsonb_build_object(
    'lines', coalesce((select jsonb_agg(jsonb_build_object(
      'spoolRevisionMaterialId', material.id, 'identCode', material.ident_code,
      'description', material.description, 'quantity', material.quantity,
      'unit', material.unit, 'expectedTraceNumber', material.trace_number,
      'accepted', case when checked.id is null then null else jsonb_build_object(
        'materialCheckItemId', checked.id, 'spoolRevisionMaterialId', material.id,
        'pipingMaterialRecordId', checked.piping_material_record_id,
        'traceNumber', pml.trace_number, 'mrrNumber', pml.mrr_number,
        'status', pml.status, 'quantity', checked.checked_quantity
      ) end
    ) order by material.id)
    from visible material
    left join public.material_check_records record
      on record.spool_revision_id = target_spool_revision_id
    left join public.material_check_items checked
      on checked.material_check_record_id = record.id
      and checked.spool_revision_material_id = material.id
    left join public.piping_material_records pml
      on pml.id = checked.piping_material_record_id and pml.project_id = context.project_id
    ), '[]'::jsonb),
    'record', (select jsonb_build_object(
      'id', record.id, 'checkedOn', record.checked_on,
      'qc13Form', case when form.id is null then null else jsonb_build_object(
        'id', form.id, 'formNumber', form.form_number, 'requestedOn', form.requested_on
      ) end
    ) from public.material_check_records record
    left join public.qc13_progress_forms form
      on form.id = record.qc13_form_id and form.project_id = context.project_id
    where record.spool_revision_id = target_spool_revision_id),
    'latestQc13Form', (select jsonb_build_object(
      'id', form.id, 'formNumber', form.form_number, 'requestedOn', form.requested_on
    ) from public.qc13_progress_forms form
    where form.spool_revision_id = target_spool_revision_id and form.project_id = context.project_id
    order by form.requested_on desc, form.created_at desc, form.id desc limit 1),
    'hasMore', (select count(*) > take_count from page),
    'nextAfterId', case when (select count(*) > take_count from page)
      then (select id from visible order by id desc limit 1) else null end
  ) into result;
  return result;
end;
$$;
```

- [ ] Добавить server-side search с literal substring match. Запрос пользователя не вставляется в PostgREST filter/string SQL. Cursor ordering стабилен; RPC возвращает `page_size + 1`, loader отдаёт ровно page_size и cursor последнего показанного варианта.

```sql
create function public.search_material_trace_candidates(
  target_spool_revision_material_id uuid,
  search_text text default '',
  after_trace text default null,
  after_id uuid default null,
  page_size integer default 25
)
returns table(id uuid, ident_code text, trace_number text, mrr_number text,
  status public.project_reference_status)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  material public.spool_revision_materials;
  context public.spool_context;
  needle text := lower(trim(coalesce(search_text, '')));
  take_count integer := greatest(1, least(coalesce(page_size, 25), 100));
begin
  select * into material from public.spool_revision_materials
  where spool_revision_materials.id = target_spool_revision_material_id;
  if not found then
    raise exception 'Material target is missing' using errcode = 'PQC30';
  end if;
  context := public.assert_material_check_read_target(material.spool_revision_id);
  if (after_trace is null) <> (after_id is null) then
    raise exception 'Both material cursor fields are required' using errcode = '23514';
  end if;
  return query
  select pml.id, pml.ident_code, pml.trace_number, pml.mrr_number, pml.status
  from public.piping_material_records pml
  where pml.project_id = context.project_id and pml.ident_code = material.ident_code
    and pml.status = 'active'
    and (material.trace_number is null or pml.trace_number = material.trace_number)
    and (needle = '' or strpos(lower(pml.trace_number), needle) > 0
      or strpos(lower(pml.mrr_number), needle) > 0)
    and (after_id is null or (pml.trace_number, pml.id) > (after_trace, after_id))
  order by pml.trace_number, pml.id limit take_count + 1;
end;
$$;
revoke all on function public.read_material_check_workspace(uuid, uuid, integer),
  public.search_material_trace_candidates(uuid, text, text, uuid, integer) from public, anon;
grant execute on function public.read_material_check_workspace(uuid, uuid, integer),
  public.search_material_trace_candidates(uuid, text, text, uuid, integer) to authenticated;
```

- [ ] Add pgTAP tests для editor+qc_engineer и editor+erection_contributor **без spooling.view/manage/admin**, project_reader с подходящим functional view, scoped subcontractor, wrong project/PDS, inactive membership, anonymous role, stale/removed revision. Read-only viewer получает данные, но write command — 42501. Candidate RPC возвращает только target project/Ident/expected trace active subset; inactive accepted source виден через workspace.
- [ ] Никаких новых PERMISSIVE read policies для engineering tables. Если реализация всё же требует narrowing policy, она `AS RESTRICTIVE` с отдельным regression; обосновать отличие от выбранного RPC решения.
- [ ] Применить миграцию **только к подтверждённому изолированному local DB** и сгенерировать types из него:

```sh
supabase migration up --local
supabase gen types typescript --local > lib/supabase/database.types.ts
supabase test db supabase/tests/database/108_material_check_workbench.test.sql
```

Expected: migration applied без data reset; generated read functions присутствуют; pgTAP exit 0 и нет `not ok`. Если этот CLI context не изолирован, шаг не выполнять; подготовленные SQL и проверенные unit changes можно продолжить независимо.

### Task 5: Repository loading без обрезания и потери evidence

**Files:** new material repository/tests; existing construction repository wrappers/select tests.

- [ ] Реализовать typed decoder JSON workspace. Не делать `as Workspace` для произвольного JSON. Validate object/arrays/required UUID strings, nullable fields и numeric conversion; malformed payload — явная load error. Null accepted labels — `Evidence source unavailable`, не «не проверено».
- [ ] Экспортировать точные API:

```ts
export interface MaterialCheckWorkspace {
  lines: BillLine[]
  accepted: AcceptedMaterialEvidence[]
  record: { id: string; checkedOn: string; qc13Form: MaterialQc13Form | null } | null
  latestQc13Form: MaterialQc13Form | null
}
export interface MaterialQc13Form { id: string; formNumber: string; requestedOn: string }
export interface MaterialCandidateCursor { traceNumber: string; id: string }
export interface MaterialCandidatePage {
  options: MaterialCandidate[]
  nextCursor: MaterialCandidateCursor | null
}
// Реализовать обе функции в supabase-material-check-repository.ts.
// client: SupabaseClient<Database>
// loadMaterialCheckWorkspace(client, spoolRevisionId): Promise<MaterialCheckWorkspace>
// searchMaterialTraceCandidates(client, { spoolRevisionMaterialId, query,
//   cursor: MaterialCandidateCursor | null }): Promise<MaterialCandidatePage>
```

Workspace loader вызывает RPC pages до `hasMore=false`, сортирует presentation по Ident/expected trace/UUID и сохраняет исходные строки. Header брать из последней page, accepted объединять по item UUID, BOM по row UUID. Проверять advancing cursor; повторённый cursor или inconsistent header — load error/retry, не infinite loop. Загруженный набор >1000 BOM rows не обрезать.

Candidate loader использует эти именованные RPC параметры:

```ts
const requestedPageSize = 25
const { data, error } = await client.rpc("search_material_trace_candidates", {
  target_spool_revision_material_id: input.spoolRevisionMaterialId,
  search_text: input.query,
  after_trace: input.cursor?.traceNumber,
  after_id: input.cursor?.id,
  page_size: requestedPageSize,
})
if (error) throw new Error(mapSupabaseConstructionError(error))
const rows = data ?? []
const visible = rows.slice(0, requestedPageSize)
const options: MaterialCandidate[] = visible.map(row => {
  if (row.status !== "active") throw new Error("Unexpected inactive material candidate.")
  return { id: row.id, identCode: row.ident_code, traceNumber: row.trace_number,
    mrrNumber: row.mrr_number, status: "active" }
})
const last = options.at(-1)
return { options, nextCursor: rows.length > requestedPageSize && last
  ? { traceNumber: last.traceNumber, id: last.id } : null }
```

- [ ] Existing `loadBillOfMaterials`/`loadMaterialCheckItems` делегируют workspace loader и возвращают lines/accepted UUID objects. Два обновлённых экрана используют **один** workspace load, а не два wrapper вызова с повторным paging. Read path не зависит от implicit engineering join visibility. Старые imports переобновить по `rg`; не оставлять Ident-keyed return shape.
- [ ] Mock RPC tests проверяют параметры и результат: 1001 BOM rows доступны полностью; два одинаковых Ident не схлопываются; accepted null/inactive labels остаются записью; строка поиска `A%,_()'` передаётся как literal parameter; mixed-case сохраняется; cursor advances; second-page failure не выдаётся за complete workspace; error 42501 отличается от нулевых вариантов.
- [ ] Run:

```sh
node --import tsx --test modules/construction/infrastructure/supabase-material-check-repository.test.ts modules/construction/infrastructure/supabase-construction-repository.test.ts modules/construction/infrastructure/construction-select-columns.test.ts modules/construction/infrastructure/supabase-construction-errors.test.ts
```

Expected: exit 0. Проверку существующих SELECT columns сохранять содержательной; не отключать тест ради переезда loader.

### Task 6: Shared draft state и принадлежность async результата

**Files:** new `material-check-draft.ts`/test и `use-material-check-workspace.ts`.

- [ ] Extract helpers с такими типами. Cleanup сравнивает полный отправленный snapshot, включая source UUID/количество, а не только Ident или trace label:

```ts
export interface MaterialDraftChoice extends TraceEntry { mrrNumber: string }
export type MaterialDrafts = Record<string, MaterialDraftChoice>
export function clearSavedMaterialDrafts(current: MaterialDrafts,
  submitted: readonly TraceEntry[]): MaterialDrafts {
  const next = { ...current }
  for (const sent of submitted) {
    const value = next[sent.spoolRevisionMaterialId]
    if (value && value.pipingMaterialRecordId === sent.pipingMaterialRecordId &&
      value.identCode === sent.identCode && value.traceNumber === sent.traceNumber &&
      value.quantity === sent.quantity) delete next[sent.spoolRevisionMaterialId]
  }
  return next
}
export function createMaterialRequestOwner() {
  let generation = 0
  return {
    begin: () => ++generation,
    invalidate: () => { generation += 1 },
    isCurrent: (token: number) => token === generation,
  }
}
```

- [ ] Hook owns workspace loading/error/retry, drafts by BOM UUID, date baseline и `refresh`. Command ownership остаётся в существующих screen command wrappers. Hook API:

```ts
// useMaterialCheckWorkspace({ projectId, spoolRevisionId }) returns:
// { targetKey, loadState, error, workspace, drafts, entries, checkedOn,
//   setCheckedOn, choose, clearChoice, refresh, applySaved, applyRecordedDate, isDirty }
// targetKey = JSON.stringify([projectId, spoolRevisionId])
// choose(line, candidate) -> MaterialDraftChoice with both source IDs,
// candidate.mrrNumber and line.quantity.
// applySaved({ targetKey, entries, checkedOn }) -> snapshot-only cleanup.
// applyRecordedDate({ targetKey, checkedOn }) -> date baseline only,
// used after successful Start Fab / QC-13 issue on the same target/date.
```

Use effect cleanup/invalidate на target change/unmount. Initial load и refresh используют **один** owner/generation, включая successful-save refresh. `loadedKey` включает target и generation. До ready Record disabled. Choose проверяет line UUID принадлежит текущему workspace, expected trace и active candidate; никаких drafts от прежнего target. Старые labels/choices не рисовать в новом target даже на один render.

Успех write для A после открытия B не вызывает `setWorkspace/setDrafts/setCheckedOn/markRecorded` для B. Его receipt остаётся успехом A; показывать target-specific result, если требуется toast. Error/failed refresh после accepted write не сообщать, что запись не состоялась; отдельное `Recorded; refresh failed` и Retry.

- [ ] Deferred-promise unit tests для owner/cleanup: запрос A завершился после B; старый search после нового query; saved snapshot не удаляет более новый выбор; failed write вообще не вызывает cleanup; accepted refresh не возвращает уже сохранённое значение в editable draft. Не подменять эти проверки поиском текста в TSX.
- [ ] Run:

```sh
node --import tsx --test modules/construction/application/material-check-draft.test.ts
```

Expected: exit 0. UI race behavior дополнительно доказать в browser Task 10.

### Task 7: Общий searchable picker с отдельным search text

**Files:** new `reference-combobox.tsx`, `material-trace-picker.tsx`.

- [ ] Presentation primitive принимает controlled selected ID и label, options, query, loading/error, onQueryChange/onChoose/onClear, loadMore callback, disabled. Не содержит Supabase или eligibility rules. Собрать из существующих компонентов:

```tsx
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button type="button" variant="outline" role="combobox"
      aria-label={label} aria-expanded={open} aria-controls={listId} disabled={disabled}>
      {selectedLabel ?? "Select registered trace"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[min(30rem,calc(100vw-2rem))] p-0" align="start">
    <Command shouldFilter={false}>
      <CommandInput type="search" aria-label={`Search ${label}`}
        value={query} onValueChange={onQueryChange} />
      <CommandList id={listId} aria-label={label}>
        {loading ? <div role="status">Searching registered materials…</div> : null}
        {error ? <div role="alert">{error}</div> : null}
        {options.map(option => (
          <CommandItem key={option.id} value={option.id}
            onSelect={() => { onChoose(option.id); setOpen(false) }}>
            <span className="min-w-0 whitespace-normal">{option.label}</span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

Здесь `label/listId/selectedLabel/options` — props/control-local values, `listId` из `useId`, `open` из useState. Добавить separate `Clear selection`, Retry и Load more buttons с `type=button`, явными callbacks и disabled while pending. Loading-more не убирает уже показанные options. Disabled/accepted control не содержит активного clear.

- [ ] Domain picker знает BOM UUID/project+revision key, получает options из candidate RPC **только при открытии/поиске**, debounce 200 ms, scoped request generation. При новом query очистить page cursor. Load more append deduplicated IDs только для того же target/query. Один `onChoose` создаёт committed candidate; search/blur/закрытие не создают choice. Выбранный candidate хранится object snapshot и не исчезает, когда отсутствует на текущей странице.
- [ ] Label каждого варианта: точный trace + `MRR <number>` + Ident; active-only выдача. Над полем показать `BOM trace: <value>` либо `BOM does not specify a trace`, и `Source: project PML`. Если вариантов нет при пустом query: `No active PML evidence matches this BOM row`; с query: `No matching traces`; 42501: `Material reference is unavailable for your access`; request failure: Retry. Не утверждать, что справочник пуст, на основании forbidden/error.
- [ ] Проверить keyboard arrows/Enter/Escape, focus return, длинные labels и popover внутри существующего Erection Drawer/Dialog. Escape сначала закрывает список, не теряя committed draft. Не расширять общие overlay primitives без конкретно воспроизведённой необходимости.

### Task 8: Подключить оба Material Check экрана

**Files:** existing Fabrication и Erection material screens.

- [ ] Удалить Ident-keyed traces/recordedTraces/ref maps и duplicate BOM/evidence loading; использовать shared hook. Существующие Start Fab, QC-13 issue, To Site navigation, readiness refresh, embedded spool behavior и command lock сохранить. В rows использовать:

```tsx
const accepted = workspace.accepted.find(item =>
  item.spoolRevisionMaterialId === line.spoolRevisionMaterialId)
return (
  <TableRow key={line.spoolRevisionMaterialId}>
    <TableCell>{line.identCode}</TableCell>
    <TableCell>{line.expectedTraceNumber ?? "Not specified in BOM"}</TableCell>
    <TableCell>
      {accepted ? (
        <div>
          <span>{accepted.traceNumber ?? "Evidence source unavailable"}</span>
          <span className="block text-xs text-muted-foreground">
            MRR {accepted.mrrNumber ?? "unavailable"} · {accepted.status ?? "unavailable"}
          </span>
        </div>
      ) : (
        <MaterialTracePicker targetKey={material.targetKey} line={line}
          value={material.drafts[line.spoolRevisionMaterialId] ?? null}
          disabled={!canRecord || pending || material.loadState !== "ready"}
          onChoose={candidate => material.choose(line, candidate)}
          onClear={() => material.clearChoice(line.spoolRevisionMaterialId)} />
      )}
    </TableCell>
  </TableRow>
)
```

`MaterialTracePicker.value` — `MaterialDraftChoice | null`; candidate callback — `MaterialCandidate`. Selected label включает точный trace/MRR из сохранённого choice object и не зависит от текущей search page. Props above обязательны в Task 7. `pending/canRecord` берутся из текущего screen access/command model. Accepted quantity выводить из accepted, новую expected quantity — из BOM, с unit. Completeness на экране использует accepted BOM IDs + новые entries и не заменяет server projection до успешной записи.

- [ ] Для Fabrication добавить явный capability guard `fabrication.progress.record`; для field сохранить `canRecord`, `dataCurrent` и `commands.run`. В обеих формах save guard включает current ready target, phase prerequisite, valid date, selected entries, synchronously acquired pending ref. Второй click не отправляет второй RPC. Capture snapshot до await:

```ts
const snapshot = {
  targetKey: material.targetKey,
  spoolRevisionId,
  checkedOn: material.checkedOn,
  entries: material.entries.map(entry => ({ ...entry })),
  qc13FormId: material.workspace.record
    ? material.workspace.record.qc13Form?.id ?? null
    : material.workspace.latestQc13Form?.id ?? null,
}
const payload = toMaterialCheckPayload(snapshot)
// recordMaterialCheck / recordFieldMaterialCheck остаются существующими wrappers.
// После подтверждённого success: material.applySaved(snapshot), затем guarded refresh.
```

Нельзя вызывать cleanup/markRecorded на failed write. `useRegisterUnsavedState(material.isDirty)` защищает committed picker вне native input tracking; search input `type=search` не dirty. DOM baseline date отмечается записанным только для того же target/sent date. После successful Start Fab/QC-13 issue вызвать `applyRecordedDate` для их date snapshot; выбранные material drafts при этом не очищаются. Не изменять общий guard.

- [ ] Добавить explicit `Reconfirm check date` при существующих accepted rows. Собрать entries из accepted UUID/source/quantity snapshot и BOM canonical Ident; не из line.quantity. Не включать новые drafts в reconfirm; при их наличии предлагать Record selected traces, reconfirm disabled с причиной. Если accepted labels missing или status не active, reconfirm disabled. Допускается повторное подтверждение partial record — не требовать complete.
- [ ] Показать actual recorded QC-13 отдельно от latest issued. Issue QC-13 продолжает existing команду и обновляет latest header; accepted source не меняется автоматически. User-facing пояснение one shared record/shop-field сохраняется и соответствует date-reconfirm поведению.
- [ ] Run `npm run typecheck` и focused unit tests Tasks 2/5/6. Expected exit 0; никаких `any`/optional UUID для скрытия несовместимых callers.

### Task 9: PML deep link и сохранение контекста

**Files:** new material-reference-link helper/test; project referential screen и welding tabs; PML branch существующего reference repository и новый loading test из карты.

- [ ] Сделать link helper через существующие `withProject`, `linkFrom`, `safeReturnPath`, не конкатенируя raw query. Runtime project code брать из active access context, а не UUID проекта:

```ts
export function materialReferenceHref(input: {
  activityCode: string; spoolRevisionId: string; bomRowId: string;
  identCode: string; from: string;
}): string {
  const params = new URLSearchParams({ tab: "fabrication", reference: "pml",
    spool: input.spoolRevisionId, material: input.bomRowId, ident: input.identCode })
  return linkFrom(withProject(`/admin/project-referential?${params.toString()}`,
    input.activityCode), safeReturnPath(input.from) ?? "/")
}
```

- [ ] В WeldingQualityTabs добавить optional controlled `value`/`onValueChange` без изменения default поведения других callers. ProjectReferentialScreen читает validated `reference` для welding inner tab; при click обновляет этот query через router.replace, сохраняя `p/spool/material/ident/from`. Deep link `reference=pml` открывает именно PML, а не Service Classes. Invalid reference использует default.
- [ ] Для PML показать входящий exact Ident filter и Clear filter. Текущий `loadWeldingQualityReferences` не делает paging PML, поэтому локальный filter по первым1000 не подходит. Extract только PML query в paged helper с optional `identCode`; остальные семь referential branches не переписывать. Полное тело query helper, которое подключается в прежний `Promise.all` вместо одиночного PML SELECT:

```ts
export async function loadPipingMaterialRecordRows(
  client: SupabaseClient<Database>, projectId: string, identCode: string | null,
): Promise<Database["public"]["Tables"]["piping_material_records"]["Row"][]> {
  const result: Database["public"]["Tables"]["piping_material_records"]["Row"][] = []
  const pageSize = 200
  let afterId: string | null = null
  for (;;) {
    let query = client.from("piping_material_records").select("*")
      .eq("project_id", projectId).order("id").limit(pageSize)
    if (identCode !== null) query = query.eq("ident_code", identCode)
    if (afterId !== null) query = query.gt("id", afterId)
    const { data, error } = await query
    if (error) throw new Error(mapSupabaseReferenceError(error))
    const rows = data ?? []
    result.push(...rows)
    if (rows.length < pageSize) return result
    const nextId = rows.at(-1)!.id
    if (nextId === afterId) throw new Error("PML pagination did not advance.")
    afterId = nextId
  }
}
```

`loadWeldingQualityReferences(client, projectId, pmlIdentCode = null)` передаёт third argument только в этот helper, сохраняет существующий mapping PML rows. После helper результата убрать прежний `pmlRes.error/data` access, поскольку теперь это rows array. WeldingQualityTabs перечитывает данные при изменении validated Ident filter с тем же request-version guard. Clear filter удаляет `ident` из URL, сохраняя остальной контекст. Created PML record добавляется в visible list только если соответствует текущему filter. Tests: >1000 rows, exact mixed-case Ident, clear filter full reload, page failure not treated as empty result.
- [ ] `Open PML` доступен при `canVisit('/admin/project-referential', can)`. Create/Add остаётся только `project_referential.manage`; operator не получает manage. Возврат через safeReturnPath ведёт к исходному project/spool/operation; in-drawer `from` должен включать текущие drawer query params. Existing guard спрашивает о discard draft, возврат не восстанавливает молча отброшенный выбор.
- [ ] Unit tests: Ident содержит `&/+`; проект/spool/row/from round-trip; external `https://…`/`//…` return отвергнуты; unknown inner tab fallback. Browser: Material → PML → back, Cancel leave retains selection; Confirm leave follows explained discard.

```sh
node --import tsx --test modules/construction/application/material-reference-link.test.ts modules/project-setup/infrastructure/piping-material-records-loading.test.ts
```

Expected: exit 0.

### Task 10: Независимо проверяемый результат и evidence packet

**Files:** acceptance document; tests/migration из предыдущих tasks.

- [ ] Выполнить lint/typecheck/unit/build после integration. Записать exact commands/exit codes; для baseline failures показать отдельно затронутые ошибки и существующие. Build не считать browser acceptance:

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

- [ ] На **изолированном пустом** локальном DB выполнить focused pgTAP, затем full DB suite. Full `npm run verify` требует empty engineering tables; выполнить до какого-либо showcase seeding. На populated shared stand не запускать verify с последующим «починим reset».

```sh
supabase test db supabase/tests/database/108_material_check_workbench.test.sql
supabase test db supabase/tests/database/050_material_traceability.test.sql
supabase test db supabase/tests/database/073_material_check_phase_naming.test.sql
supabase test db supabase/tests/database/014_pds_area_scope_rls.test.sql
npm run verify
```

Expected: all exit 0/no `not ok`. Нельзя добиться green удалением/ослаблением security или duplicate-row tests. Не запускать prepare/showcase/hosted seed в рамках этого плана на существующем стенде.

- [ ] Browser acceptance выполнить на отдельном разрешённом локальном fixture project, используя обычные accounts, включая **erection contributor без spooling.view** и scoped role. При невозможности получить браузер/credentials явно оставить соответствующие пункты `not run`; не объявлять workflow полностью проверенным. Fixture data/setup описать воспроизводимо без реальных секретов и без изменения demo empty-at-start проектов.
- [ ] Проверить матрицу ниже. Для write-сценариев показать безопасный request/receipt/evidence IDs, phase/event и projection counters после refresh. Для scopes проверять denial/absence данных чужого объекта, а не только наличие disabled кнопки. Screenshots не должны содержать секреты.

| ID | Сценарий | Ожидаемое доказательство |
| --- | --- | --- |
| A01 | Field Material внутри Erection Drawer | Registered trace picker, source PML/MRR и expected BOM trace понятны |
| A02 | Fabrication Material standalone/embedded | Тот же picker/model; existing Start Fab/QC-13 работают |
| A03 | PML `Heat-ab12` | Поиск/выбор/write/accepted label сохраняют точный регистр |
| A04 | PML одновременно содержит `Heat-ab12` и `HEAT-AB12` | IDs и labels различимы; не объединяются |
| A05 | BOM ID-1/H1 и ID-1/H2 | После первого Record accepted1/total2; после второго accepted2/total2 |
| A06 | Один Ident в двух distinct rows в одном command | При explicit row IDs принимаются оба; counters/ledger корректны |
| A07 | BOM trace задан/не задан | Exact compatibility или доступные active traces того Ident |
| A08 | Поиск по MRR, special characters, Load more | Полный поиск; literal handling; стабильные pages без дублей |
| A09 | Единственный candidate | Не selected и не recorded до осознанного действия |
| A10 | Search without selection / clear selection | Search не dirty; committed selection dirty; clear не пишет RPC |
| A11 | Partial Record | Только новые selected rows, accepted evidence не отправляется для изменения |
| A12 | Accepted active/inactive/archived | Read-only labels/status/quantity; historical evidence не исчезает |
| A13 | Missing evidence label | Явная unavailable запись с ID; не editable и не silently unrecorded |
| A14 | Reconfirm date | Отдельное действие; exact accepted IDs/quantity/QC-13; ledger phase сохраняется |
| A15 | Existing QC-13 и новая issued form | Actual recorded source отдельно; автоматической перепривязки нет |
| A16 | Editor + erection_contributor без spooling.view | Workspace/candidates/save по своей фазе работают без admin |
| A17 | Editor + qc_engineer / read-only viewer | Correct read/write capability separation |
| A18 | Wrong project/PDS, inactive membership, anonymous | Узкие reads/commands не раскрывают/не меняют чужой target |
| A19 | Loading/error/forbidden/no matching options | Разные состояния/пояснения и уместный Retry |
| A20 | A→B target и out-of-order load/search/save refresh | Поздний ответ A не меняет B, draft не переезжает |
| A21 | Double click / failed write / accepted write + failed refresh | Один command; draft сохранён на отказ; честный partial-refresh status |
| A22 | Keyboard/long labels/Drawer portal | Enter выбирает, Escape закрывает list, focus виден и возвращается |
| A23 | Material→PML→back; spool/project/Drawer close | URL context верен; Cancel leave сохраняет draft; Confirm явно discard |
| A24 | >1000 BOM rows / legacy ambiguous command | Все строки загружены; ambiguity rejected, unique legacy accepted |
| A25 | Regression текущих phase guards/idempotency/immutability | Existing suites + новые negative cases проходят |

- [ ] Заполнить acceptance document: changed file list; applied migration identity/environment; focused/full checks; результаты A01–A25 с evidence links; unresolved baseline/runtime limitations. Любой непроверенный пункт отметить явно. Не маскировать частичное завершение общей фразой `task_complete`.
- [ ] Финальный отчёт исполнителя владельцу: что изменено, какие команды реально прошли, какой стенд использовался, какие browser cases подтверждены, что осталось непроверенным. Git publication/deploy сюда не входят.

## 6. Условия последующей проверки

Проверяющий получает этот план и acceptance packet, сверяет актуальный код/SQL независимо от отчёта исполнителя. Приоритетные блокеры: freeSolo вместо FK choice; Ident-keyed state; uppercase evidence; definer read без target/scope guard; выдача spooling/admin права; исчезновение inactive accepted evidence; draft leakage между targets; пропажа partial-check/date-reconfirm семантики; обход immutable source/quantity; claimed browser success без evidence.

Завершение реализации означает выполненные Tasks 1–10 и честно заполненную матрицу. Продуктовая приёмка остаётся за владельцем после независимой проверки; никаких новых модулей, включая Assembly, этот план не требует.
