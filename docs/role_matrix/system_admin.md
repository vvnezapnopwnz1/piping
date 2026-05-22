> **Matrix discipline:** This role matrix describes target-state PipeQC
> behavior derived from Easy Piping manual + presentation research.
> It is **not** limited to currently implemented app screens.
> Each function tagged with implementation status.
> Triage decisions (Priority / Decision / Track) consolidated in Gap
> triage table at end of B-section — not duplicated per function.
>
> **Status discipline:** ✅ live = route + UI + described interaction +
> state persistence в store. Anything less = ⚠ partial.

## Роль: System Admin

**One-line:** В PipeQC merged Project Admin + Site Admin + System Admin
(per CC-3 role hierarchy). Owner всей setup-фазы проекта: Project
Definition → System Referential → Project Referential → Access Rights →
Import Settings. Активен на ramp-up phase с максимальной нагрузкой, после
setup — config maintainer + access rights guardian на протяжении проекта.

**Lifecycle scope:** Pre-project setup ramp (heavy load — все referentials,
access matrix, import templates) → maintenance throughout project (low
cadence: новый subcontractor mid-project, новый welder added, NDE Matrix
amendment) → close-out (project archive). Единственная роль, у которой
нет "operational daily loop" — вся активность tied to configuration events,
не production events.

**Source:**

- Manual: §1 Project Definition (activity code, owner/contractor identity,
  logos, max transit time), §2 System Referential (§§2.1–2.4: Material Type
  / Film Qty per Diameter / UT Calculation / Torquing Requirement), §3
  Project Referential (§§3.1–3.26 + 6 unnumbered = 32 items: subcontractors,
  PDS areas, WPS, welder qualifications, NDE Matrix, rework codes, joint
  categories, spooling refs, testpack teams/systems, spool tracking devices),
  §4 Access Rights (role CRUD, project role assignment, subcontractor scope
  lock), §5 Import Settings (6 Excel templates: Weld Thickness/Flange, NDE
  Matrix, Project Piping Material List, Spooling Images ZIP, Spooling
  Material Type, Spooling Class Material).
- Presentations: #2 Administration (definitive source — CC-3 role hierarchy
  merging Prj Admin / Sys Admin / Site Admin; 5 sub-section breakdown;
  system vs project referential split; CC-4 subcontractor scope lock pattern
  — _"When the Subcontractor user logs in, the subcontractor dropdown is
  disabled and forced to their own ID"_).
- IA sitemap: `r0` chip (Prj Admin / Sys Admin) appears on 35+ screens in
  Module 1 Administration. Highest screen coverage of any admin role.
- Code: `app/admin/*` — 5 sub-pages exist (`project-definition`,
  `system-referential`, `project-referential`, `access-rights`,
  `import-settings`). `project-referential/page.tsx` embeds `<AdminTabs />`
  with 7 tabs (teams, subcontractors, welder-qualifications, wps, nde-matrix,
  rework-codes, joint-categories). `SubcontractorsTab` + `TeamsTab` have
  real store-backed CRUD. All other pages: `AdminPageHeader` +
  `AdminDemoTable` / `ReferentialGroup` / `ImportPlaceholder` with static
  demo data — no user interaction or persistence.

---

### A. Real-world responsibilities (вне приложения)

System Admin на EPC piping construction project:

- **Define project identity** — создаёт project record: activity code,
  owner name, contractor name, logos, contract reference, maximum transit
  time parameter (days before overdue flag в spool tracking). Без этого
  запись в систему невозможна — это gate #1.
- **Populate System Referential** — заполняет cross-project master tables:
  Material Type list (CS, LTCS, SS 304, SS 316, CrMo P11/P22, PVC, FRP и
  т.д.), Film Quantity per Diameter matrix (RT — сколько films для каждого
  diameter / thickness combo), UT Calculation coefficients, Torquing
  Requirement table (flange management). Эти таблицы shared across all
  projects in the installation, поэтому scope = System Admin (не Project
  Admin).
- **Populate Project Referential** — 32 items, scope — только этот проект.
  Ключевые domain groups: subcontractor registry + PDS area assignments
  (linked to scope lock), WPS list (сварочные процедуры, approved per ASME
  IX), welder qualification records (welder ID + WPS coverage + expiry
  date), NDE Matrix (service class × weld type × method × sampling %),
  rework codes, joint categories, spooling check lists, testpack team
  registry (blinding / finishing / reinstatement / line checker), system +
  sub-system hierarchy, pressure unit list, line service list.
- **Configure NDE Matrix sampling rules** — NDE Matrix определяет сколько
  % welds идут на RT/UT/PT/MT в зависимости от service class (Class 1 →
  20% RT, Class 3 → 5% RT). Это критическая compliance config: неправильный
  matrix = неправильный sampling = regulatory non-compliance. Admin
  настраивает + версионирует при amendment.
- **Manage welder qualifications** — добавляет новых welders с их WPS scope
  (qualified materials, thickness ranges, positions), expiry date. При
  expiry — system soft-alerts QC Engineer (CC-28). Admin renews или
  деактивирует welder record. New welder mid-project = common maintenance
  event.
- **Setup Access Rights** — создаёт user accounts в системе, assigns project
  role (QC Engineer, NDE Inspector, PM, Subcontractor...). Для subcontractor
  users — assigns subcontractor ID (source of CC-4 scope lock: subcontractor
  dropdown forced to this ID на всех операционных экранах). PDA User и
  Project Reader — planned roles, не реализованы.
- **Configure Import Settings** — до bulk Excel import (ISO list, spool
  list, weld list, material list) настраивает template mappings: какая
  колонка Excel = какое поле в системе, required fields, validation rules.
  Запускает import и разбирает ошибки.
- **Ongoing config maintenance** — на протяжении проекта: добавить нового
  subcontractor (mid-project additional scope), добавить welder, amend NDE
  Matrix (client/engineering request), reset user password, deactivate
  departed user.
- **Project archive / close-out** — после hydrotest completion и dossier
  handover: архивирует проект (read-only mode), может экспортировать
  complete history for owner QA records. System Admin only — не PM.

Ключевая характеристика: System Admin — это **low-frequency, high-stakes**
роль. Редко заходит в систему, но каждое его действие блокирует или
разблокирует других пользователей. Ошибка в NDE Matrix = неправильный
sampling на 1000+ welds. Ошибка в scope lock = subcontractor видит чужие
данные.

---

### B. Application functions (PipeQC scope)

16 функций. Status legend: ✅ live · ⚠ partial · ❌ missing · 📋 planned.

1. **⚠ Project Definition setup** — создать / редактировать project record:
   activity code, owner, contractor, logos, max transit time. Route
   `/admin/project-definition` существует. UI: `AdminPageHeader` +
   поле-плейсхолдеры + `AdminDemoTable` со static demo rows. Нет формы с
   реальными input'ами, нет store persistence. Вся страница — visual
   demo scaffold.

2. **⚠ Project Definition — active project selection** — в Easy Piping
   Admin может держать несколько project records и переключать активный.
   В PipeQC demo table на project-definition показывает 2 rows (PQ-001 /
   PQ-002), но нет select/activate flow — нет кнопки, нет state. Concept
   присутствует, logic отсутствует.

3. **📋 System Referential CRUD** — 4 cross-project tables: Material Type,
   Film Qty per Diameter, UT Calculation, Torquing Requirement. Route
   `/admin/system-referential` существует. UI: 4 cards с `AdminDemoTable`
   (static "REF-001 / REF-002 Demo rows"). Нет CRUD: нет Add row, нет Edit,
   нет Delete. Полностью static display. Нет store backing. Полная
   placeholder страница. Closest thing to ⚠ partial: route + section labels
   exist, но любой интерактив отсутствует.

4. **⚠ Project Referential — General group** — 4 items: Subcontractor List,
   Progress Weight Factor, Area Classification, PDS Area / Subcontractor.
   Route `/admin/project-referential` существует, tab "General" exists.
   `<AdminTabs />` встроен в General tab и содержит реальные CRUD-capable
   tabs (Subcontractors, Teams — оба с store backing). PDS Area /
   Subcontractor assignment (источник scope lock) — **нет**: это критическая
   функция CC-4, требует специального UI для mapping user → subcontractor →
   PDS area. Только subcontractor list CRUD реально работает.

5. **⚠ Project Referential — WPS & Welder Qualification group** — WPS list
   - Welder Qualification records. `<WpsTab />` и `<WelderQualificationsTab
/>` существуют и рендерятся в General tab через `<AdminTabs />`. WPS Tab
     — читает из static `lib/engineering-references` данных, нет store write.
     Welder Qualifications Tab — читает из `WELDER_QUALIFICATIONS` lib
     constant, тоже read-only display (нет Add welder form, нет Edit expiry).
     Реальный add/expire workflow отсутствует.

6. **⚠ Project Referential — NDE Matrix & Rework Codes** — NDE Matrix
   (service class × weld type → method + sampling %) + Rework Code list.
   `<NdeMatrixTab />` рендерит read-only matrix из `NDE_MATRIX` lib constant
   (не store). `<ReworkCodesTab />` аналогично. Нет CRUD: нет Add sampling
   rule, нет Edit %. Данные static. Для compliance это критично — любой
   amendment требует edit, которого нет.

7. **⚠ Project Referential — Spooling refs** — 9 items: Service Class /
   Material Type, Weld Type List, NDE Matrix (shared с B6), Rework Code
   (shared с B6), Thickness, Project Piping Material List, Spooling Material
   Type, Spooling Piping Class Material, Spooling Check List. Tab "Spooling"
   в project-referential рендерит `<ReferentialGroup />` с 9 items listed —
   visual inventory только. Нет CRUD ни для одного. Project Piping Material
   List особенно критична: это источник heat number validation (CC-28 hard
   block в QC release — без этого списка heat trace checklist blocked).

8. **⚠ Project Referential — Fabrication & Erection refs** — 7 items: WPS
   List (уже B5), Welder Qualification (уже B5), Joint Category Definition,
   Jointer List, Location Category, Location, Unit Classification. Tab
   "Fabrication & Erection" рендерит ReferentialGroup — labels только, нет
   CRUD. `<JointCategoriesTab />` существует в AdminTabs и рендерится — это
   единственный из группы с реальным display, но также read-only из lib
   constant.

9. **📋 Project Referential — Testpack refs** — 9 items: Unit of Time
   Reference, Blinding Team, Finishing Team, Reinstatement Team, System,
   Sub System, Line Checker Team, Pressure Unit, Line Service. Tab "Testpack"
   рендерит ReferentialGroup — labels только. Нет store. Нет CRUD. Особенно
   Team refs (Blinding / Finishing / Reinstatement / Line Checker) напрямую
   used в testpack module dropdowns — когда тот будет реализован, потребует
   реального source из referential store.

10. **📋 Project Referential — Spool Tracking refs** — 5 items: Devices
    (barcode scanner / PDA hardware registry), PDA Users, Location Category,
    Location, Maximum Transit Time reference. Tab "Spool Tracking" рендерит
    ReferentialGroup — labels только. Нет store. PDA Users = planned role
    (Track J). Devices = barcode/RFID hardware tracking.

11. **⚠ Access Rights — User CRUD & role assignment** — создать user, assign
    project role (из 11 roles listed в access-rights page), deactivate user.
    Route `/admin/access-rights` существует. UI показывает role list card +
    `AdminDemoTable` с role → PipeQC mapping (Manual Role / PipeQC Role /
    Note). Нет user CRUD form: нет Add user, нет Edit role, нет Deactivate
    user. Subcontractor scope lock описан в amber card как concept (text
    explanation) но без UI для настройки mapping user → subcontractor.

12. **⚠ Access Rights — Subcontractor scope lock setup** — CC-4 pattern:
    admin assigns subcontractor user to a specific subcontractor ID. Runtime
    effect: subcontractor dropdown на всех operational screens disabled и
    forced к assigned ID. Concept document'd в access-rights page amber card.
    В коде: `useRole()` returns role, и subcontractor scope applied globally
    в operational screens через context. **Но**: механизма настройки mapping
    user → subcontractor через UI не существует. Это hardcoded в demo context
    — не runtime-configurable. Главный gap для Track J.

13. **📋 Import Settings — core templates** — 3 ключевых template: Weld
    Thickness / Flange, NDE Matrix, Project Piping Material List. Route
    `/admin/import-settings` существует. 6 `<ImportPlaceholder />` cards
    рендерятся с badge _"Not implemented / planned"_ и disabled Upload button.
    Нет upload handler, нет validation, нет preview, нет import store action.
    Честный placeholder — правильный статус. Project Piping Material List
    import — самый критический из 6 (heat number source).

14. **📋 Import Settings — spooling templates** — Spooling Images ZIP +
    Spooling Material Type + Spooling Piping Class Material (оставшиеся 3
    из 6). Те же `ImportPlaceholder` cards. Spooling Images ZIP — нетривиальный
    import (ZIP содержит по одному PNG/PDF на spool ID, используется в
    spooling module). Отдельная функция потому что tech complexity significantly
    выше (binary upload vs tabular Excel).

15. **❌ NDE Matrix amendment workflow** — mid-project amendment сценарий:
    client/engineering запрашивает изменение sampling rate. Admin должен:
    (1) открыть NDE Matrix, (2) изменить % для конкретного service class ×
    weld type, (3) сохранить с audit trail (кто, когда, что изменил, на
    каком basis), (4) система пересчитывает ongoing batches. Нет ничего из
    этого. NDE Matrix сейчас полностью static constant. Нет edit, нет audit,
    нет recalculation cascade. Нишевый, но compliance-critical feature.

16. **❌ Project archive / close-out** — после completion: Admin переводит
    project в Archive mode (read-only для всех operational roles, но history
    accessible). Export complete project dossier for owner handover. Не
    реализовано, нет route, нет store action. System-admin-only function
    с низкой frequency но важным close-out ceremony значением.

**Gap summary:** 0 функций ✅ live, 9 ⚠ partial, 3 📋 planned, 2 ❌ missing.
Самый высокий процент partial/missing из всех ролей: 100% функций требуют
доработки.

**Gap density observation:** Все 16 функций Admin роли — на уровне thin
shell / placeholder. Это системная картина: Admin module был спроектирован
как IA backbone (navigation, page titles, section groupings, referential
inventory display) и получил два полноценных CRUD-capable tabs (Subcontractors

- Teams), остальное — static display или disabled placeholders. Этого
  достаточно для демонстрации структуры и domain knowledge, но недостаточно
  для operational use. Весь module живёт в **Track A — Admin IA / Referentials
  build-out**: при правильной приоритизации этот track закроет 12 из 16
  функций роли за один цикл. B12 (scope lock setup UI) частично пересекается
  с **Track J — Roles / Access / Subcontractor Scope**. B15 (NDE Matrix
  amendment) — **Track N** candidate. B16 (archive) — **Track A** closeout
  phase.

**Gap triage (consolidated):**

| #   | Function                             | St  | Pr  | Decision | Track   |
| --- | ------------------------------------ | --- | --- | -------- | ------- |
| B1  | Project Definition form + persist    | ⚠   | P1  | build    | Track A |
| B2  | Active project select / switch       | ⚠   | P2  | build    | Track A |
| B3  | System Referential CRUD              | 📋  | P2  | build    | Track A |
| B4  | Proj Ref General — PDS area assign   | ✅  | P1  | build    | Track A |
| B5  | WPS + Welder Qual CRUD (add/edit)    | ✅  | P1  | build    | Track A |
| B6  | NDE Matrix CRUD (sampling % edit)    | ⚠   | P0  | build    | Track A |
| B7  | Spooling refs CRUD (Piping Mat List) | ✅  | P1  | build    | Track A |
| B8  | Fabrication refs CRUD (Joint Cat)    | ✅  | P2  | build    | Track A |
| B9  | Testpack team refs CRUD              | ✅  | P1  | build    | Track A |
| B10 | Spool Tracking refs (Devices/PDA)    | 📋  | P2  | defer    | Track A |
| B11 | User CRUD + role assignment form     | ⚠   | P1  | build    | Track J |
| B12 | Scope lock setup (user→sub mapping)  | ⚠   | P0  | build    | Track J |
| B13 | Import core templates (upload+parse) | 📋  | P1  | build    | Track A |
| B14 | Import spooling templates (ZIP)      | 📋  | P2  | defer    | Track A |
| B15 | NDE Matrix amendment + audit trail   | ❌  | P2  | build    | Track N |
| B16 | Project archive / close-out export   | ❌  | P3  | defer    | Track A |

---

### C. Function → Screen → Interaction

| #   | St  | Функция                         | Экран                                                                   | Что нажимает / делает                                                                                                                                                                                                                                                                                                                  |
| --- | --- | ------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | ⚠   | Project Definition setup        | `/admin/project-definition`                                             | Открывает страницу → форма с полями (Activity Code, Project Title, Owner, Contractor, Owner Logo upload, Contractor Logo upload, Max Transit Time days) → Fill + Save (~700ms) → toast _"Project saved"_ → row появляется в project table. **Сейчас:** поля — visual placeholders, Save disabled.                                      |
| B2  | ⚠   | Active project switch           | `/admin/project-definition`                                             | В project table → row с кнопкой "Set Active" → click → активный project record переключается → banner в шапке показывает активный activity code. **Сейчас:** table static, кнопки нет.                                                                                                                                                 |
| B3  | 📋  | System Referential CRUD         | `/admin/system-referential`                                             | Открывает card (напр. "Material Type") → "Add" кнопка → inline form row: Code + Description → Save → row в table. Edit row: inline edit. Delete: confirmation dialog. **Сейчас:** static demo table, нет Add/Edit/Delete.                                                                                                              |
| B4  | ✅  | PDS Area / Subcontractor assign | `/admin/project-referential` → General → **PDS Areas** tab              | `PdsAreaTab`: 6 seeded areas, assign/reassign/clear subcontractor, add area, deactivate. Store `pdsAreas` persist v3.                                                                                                                                                                                                                    |
| B5  | ✅  | WPS + Welder Qualification CRUD | `/admin/project-referential` → General → WPS / Welder Qual tabs         | WPS: `add-wps-dialog` + supersede. Welder Qual: add/edit expiry/deactivate (prior slice). Store `wpsList` + `welderQualifications`.                                                                                                                                                                                                    |
| B6  | ⚠   | NDE Matrix edit                 | `/admin/project-referential` → General tab → NDE Matrix sub-tab         | Matrix table: rows = Service Class × Weld Type, columns = RT / UT / PT / MT % inputs → click cell → inline number input → Tab через cells → Save All → store update + audit entry. **Сейчас:** read-only matrix render from static constant.                                                                                           |
| B7  | ✅  | Spooling refs — Piping Mat List | `/admin/project-referential` → Spooling tab                             | `PipingMaterialListTab`: 8 seed heats, add/deactivate, `useActivePipingMaterialList()` for Phase 2. CSV import deferred.                                                                                                                                                                                                                 |
| B8  | ✅  | Fabrication refs                | `/admin/project-referential` → General → Rework / Joint Categories tabs   | Rework codes: full CRUD from store. Joint categories: edit description + examples only (X/Y/Z fixed). Jointer list lives in Teams tab (B9).                                                                                                                                                                                          |
| B9  | ✅  | Testpack team refs CRUD         | `/admin/project-referential` → General → **Teams** tab                  | `TeamsTab`: 5 collapsible sections (line check, blinding, finishing, reinstatement, jointer) with per-section Add + deactivate. Store `teams` unchanged.                                                                                                                                                                                 |
| B10 | 📋  | Spool Tracking refs             | `/admin/project-referential` → Spool Tracking tab                       | Devices: barcode scanner / RFID list → Add device (ID + type + location). PDA Users: planned role. **Сейчас:** ReferentialGroup labels only. Low priority — Track A deferred phase.                                                                                                                                                    |
| B11 | ⚠   | User CRUD + role assignment     | `/admin/access-rights`                                                  | Users table → "Add User" button → dialog: username + email + project role select (dropdown) + optional subcontractor ID (if role = subcontractor) → Save → user appears in table. Edit: role change. Deactivate: soft-delete (не delete — audit trail). **Сейчас:** static mapping table, нет form.                                    |
| B12 | ⚠   | Subcontractor scope lock setup  | `/admin/access-rights`                                                  | Раздел "Scope Lock" → table: User × Subcontractor ID × PDS Areas assigned → Admin maps sub user → sub ID → area set → Save → runtime scope lock active. **Сейчас:** amber card с text description, нет UI для настройки mapping.                                                                                                       |
| B13 | 📋  | Import core templates           | `/admin/import-settings`                                                | Card "Project Piping Material List" → "Select file" → file chooser (`.xlsx`) → client-side validation (required columns check) → preview table (first 10 rows) → "Import" → progress bar → "Imported N rows, K errors" → error details expandable. **Сейчас:** disabled Upload button.                                                 |
| B14 | 📋  | Import spooling templates       | `/admin/import-settings`                                                | Card "Spooling Images ZIP" → "Select file" → file chooser (`.zip`) → upload → server extracts (spool_id.png per entry) → stores image refs per spool. Spooling Material Type / Class Material: analogous Excel flow. **Сейчас:** disabled Upload button. Deferred — binary upload complexity.                                          |
| B15 | ❌  | NDE Matrix amendment + audit    | (no screen — planned `/admin/nde-matrix-audit` or modal in B6)          | Admin opens NDE Matrix (B6) → edits sampling % → before Save: system shows diff preview _"Class 1 RT: 20% → 25%"_ → confirms with mandatory audit note field (reason: "Client letter REV-3") → Save → audit entry created with timestamp + user + before/after values + reason. Ongoing batches flag if affected. **NOT IMPLEMENTED.** |
| B16 | ❌  | Project archive / close-out     | (no screen — planned `/admin/project-archive`)                          | In project table → row → "Archive" action → confirmation dialog → project enters read-only mode for all roles → export button: _"Download project dossier (ZIP)"_ — NDE history + QC release records + test pack records. System Admin only. **NOT IMPLEMENTED.**                                                                      |

---

### D. Deep dive — user stories

Самые consequential функции для System Admin роли: **B12** (subcontractor
scope lock setup — это makes-or-breaks для multi-tenant security story) и
**B5 + B6** (project referential bulk setup на ramp-up — WPS list + welder
qualifications + NDE Matrix это backbone для всего operational data quality).

---

#### Story для B12: Initial access matrix setup (subcontractor scope lock)

**Context:** Проект начинается. Admin onboards первого subcontractor user.
NDE subcontractor "Bureau Veritas" получает доступ. Admin должен: создать
user account, назначить роль "Subcontractor", привязать к BV subcontractor
ID, ограничить PDS area scope (BV отвечает только за Area A2 и A3).

**Happy path (target-state — B11 + B12):**

1. Admin открывает `/admin/access-rights`
2. Clicks "Add User" button → dialog открывается
3. Fills: username `bv.inspector@bvl.com` / display name `BV NDE Inspector`
4. Role select dropdown → выбирает "Subcontractor"
5. Subcontractor ID field появляется (conditional) → выбирает `BV` из dropdown
6. Click Next → шаг 2: PDS Area scope assignment
7. Список всех PDS Areas в проекте (AR-1, AR-2, AR-3, AR-4)
8. Admin чекает AR-2, AR-3
9. Click "Create User" (~700ms) → toast _"User created. Scope: BV, areas AR-2, AR-3"_
10. User row появляется в users table с chip _"Subcontractor · BV · 2 areas"_
11. Система создаёт session record: при логине с bv.inspector@bvl.com →
    `currentSubcontractor = "BV"`, `pdsAreaFilter = ["AR-2", "AR-3"]`
12. Runtime effect: BV user открывает `/nde/batches` → видит только batches
    в AR-2 и AR-3 + subcontractor dropdown disabled с "Bureau Veritas (BV)"
    locked

**Edge cases (status-conditional):**

- **Role changed mid-project** (B11 Edit): Admin меняет user с "Subcontractor"
  на "QC Engineer" (BV inspector promoted to internal QC). Scope lock
  automatically lifted. Confirmation dialog: _"Role change will remove
  subcontractor scope lock. Confirm?"_ → на confirm: user теперь видит все
  areas, все subcontractor dropdowns become editable. Audit entry created.

- **New subcontractor added mid-project**: Новый NDE sub "TÜV Rheinland"
  не в referential. Admin должен: сначала B4 (добавить TUV в subcontractor
  list) → потом B12 (create user, assign TUV scope). Если пытается create
  user с subcontractor ID не существующим в referential → validation error:
  _"Subcontractor TUV not found in project referential — add to Subcontractors
  tab first"_. Это enforced cross-reference integrity.

- **PDS area scope expanded**: Mid-project BV scope расширяется на AR-4.
  Admin opens BV user row → Edit → adds AR-4 to scope set → Save → immediate
  runtime effect: BV user при следующем action видит AR-4 data. Нет session
  invalidation required (scope enforced on each API call, не cached in token).

- **Two subcontractor users same sub**: Двое инспекторов от BV. Admin создаёт
  оба с `subcontractorId = BV` и разными area subsets (bv.inspector1 →
  AR-2; bv.inspector2 → AR-3). Оба видят только свои areas. При попытке
  bv.inspector1 открыть batch в AR-3 → 403 / redirect с banner _"This
  record is outside your assigned scope"_. Это correct isolation behavior.

- **Subcontractor scope lock vs. read operations**: scope lock применяется
  только к write operations (submitting results, creating batches) или ко
  всему? Target: **filtering** на read (видит только свои area records) +
  **lock** на write (cannot submit for another sub). Read isolation важна
  для confidentiality — sub A не должен видеть NDE results sub B.

- **User without subcontractor assignment**: Admin создаёт user с role
  "Subcontractor" но забывает выбрать subcontractor ID (если поле optional).
  При логине: system shows error banner _"Your account has no subcontractor
  scope assigned — contact System Admin"_. User видит empty state на всех
  screens, не может создавать records. Admin receives notification
  _"Unscoped subcontractor user: bv.inspector@bvl.com"_. **Gap: currently
  no validation preventing this at creation time** — should be required field.

---

#### Story для B5 + B6: Project referential bulk setup — WPS & NDE Matrix

**Context:** Ramp-up phase, day 2. Engineering handed over approved WPS list
(14 procedures) + client-approved NDE sampling matrix (Excel). Admin нужно
за 1–2 hours загрузить всё и верифицировать, чтобы QC Engineer мог завтра
начать вводить первые welds без blockers.

**Happy path (target-state):**

1. Admin открывает `/admin/project-referential` → General tab → WPS sub-tab
2. Видит пустую WPS table (только headers)
3. Click "Import from Excel" → file chooser → выбирает `WPS_List_Rev2.xlsx`
4. Preview: 14 rows, columns mapped (WPS-Code, Description, Material Type,
   Thickness Min-Max, Positions, P-Numbers)
5. Click "Import" → 14 rows imported → toast _"14 WPS records imported"_
6. Spot-check: click row WPS-007 → details panel → correct
7. Switch to Welder Qualifications sub-tab
8. Click "Add Welder" → dialog → WLD-001: name, qualified WPS checkboxes
   (WPS-001, WPS-003, WPS-007), expiry date 2027-01-15 → Save
9. Repeats for 8 welders on register
10. Switch to NDE Matrix sub-tab
11. Click "Import NDE Matrix" → loads `NDE_Matrix_Rev1.xlsx` → matrix
    preview: 4 service classes × 6 weld types × 4 NDE methods → verify Class
    1 RT = 20%, Class 2 RT = 10% → correct → Confirm Import
12. Toast _"NDE Matrix imported — 24 sampling rules active"_
13. Switch to Spooling tab → "Project Piping Material List" → import
    `Material_List.xlsx` → 847 heat records imported
14. Admin saves progress note and notifies QC Engineer: "System ready — can
    start weld entry"

**Edge cases (status-conditional):**

- **WPS import column mismatch**: Excel имеет колонку "P-Number Groups"
  вместо ожидаемого "P-Numbers". Import preview показывает mapping warning:
  _"Column 'P-Number Groups' does not match known field — map manually or
  skip"_. Admin маппит через dropdown. Import proceeds. Unmapped columns
  ignored.

- **Duplicate WPS code on re-import**: Engineering выслал Rev3 WPS list.
  Admin imports снова. System detects duplicates (WPS-007 уже существует).
  Dialog: _"14 records — 12 new, 2 duplicate (WPS-007, WPS-011). Overwrite
  duplicates?"_ → Overwrite → 2 records updated, audit entries created
  (_"WPS-007 updated by [Admin] from Rev2 to Rev3 — thickness range changed
  12mm→16mm"_). QC Engineer gets notification: _"WPS-007 updated — review
  active welds"_.

- **Welder expiry during active project**: WLD-004 expiry = 2026-06-01.
  Admin logs in on 2026-05-28 → dashboard banner _"2 welder qualifications
  expiring within 30 days"_. Opens Welder Qual tab → WLD-004 row with amber
  chip "Expires Jun 1" → Admin renews via extension dialog (new expiry date
  - endorsement ref) → Save → amber chip clears. If Admin does NOT renew
    and QC Engineer selects WLD-004 on weld entry after Jun 1 → soft alert
    fires (B14 в QC Engineer matrix, Track N gap).

- **NDE Matrix import with service class not in referential**: Excel matrix
  contains "Class 4" row but Service Class list в System Referential не
  содержит "Class 4". Import validation error: _"Unknown service class 'Class
  4' in row 7 — add to System Referential first, then re-import NDE Matrix"_.
  Cross-reference dependency enforced. Admin добавляет Class 4 в System
  Referential (B3) → re-imports NDE Matrix.

- **Project Piping Material List — partial import errors**: 847 heat records
  import, но 12 rows malformed (missing grade, or duplicate heat #). System
  imports 835 valid rows, показывает error log: _"12 rows skipped — download
  error report (CSV)"_. Admin fixes Excel и re-imports только failed rows.
  Partial import committed (не rollback entire batch).

- **Welder qual: WPS not yet in list**: Admin adds WLD-009 with qualified
  WPS = WPS-014, but WPS-014 not imported yet. System validation: _"WPS-014
  not found in project WPS list — import WPS list first"_. Enforces
  dependency order. If Admin skips this and QC Engineer tries to use WLD-009
  - WPS-014 → weld entry dropdown doesn't show WPS-014 as option for WLD-009
    (valid WPS filter based on qualifications).
