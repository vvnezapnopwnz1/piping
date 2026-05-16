Обновлённый список треков

✅ Merged (closed)

#: 1
Track / Phase: A1
Что: Line Check Preparation + Progress
────────────────────────────────────────
#: 2
Track / Phase: A2  
 Что: Item Clearance Preparation + Progress
────────────────────────────────────────
#: 3
Track / Phase: A3
Что: Explorer live gates (Release Tracking)
────────────────────────────────────────
#: 4
Track / Phase: A4
Что: Blinding Preparation + Progress
────────────────────────────────────────
#: 5
Track / Phase: A5
Что: Testing & Pre-comm Progress
────────────────────────────────────────
#: 6
Track / Phase: A6
Что: Reinstatement Preparation + Progress
────────────────────────────────────────
#: 7
Track / Phase: B1
Что: Admin shell + Teams + Subcontractors + Welder Qualifications
────────────────────────────────────────
#: 8
Track / Phase: B2
Что: WPS / NDE Matrix / Rework Codes / Joint Categories (read-only)
────────────────────────────────────────
#: 9
Track / Phase: E2.1
Что: Erection store (persistence)
────────────────────────────────────────
#: 10
Track / Phase: E2.3
Что: Spool readiness gate (F↔E handoff)
────────────────────────────────────────
#: 11
Track / Phase: N1
Что: Create Batch wizard
────────────────────────────────────────
#: 12
Track / Phase: N2
Что: Per-weld Receive Results

🔜 Next (priority order)

#: 13
Phase: E2.5
Что: ISO weld rollup + Track A bridge
Демо-вес: ⭐⭐⭐ замыкает upstream→Anna
Размер: 0.5д ← next
────────────────────────────────────────
#: 14
Phase: F2
Что: "Send to NDE" из weld detail panel
Демо-вес: ⭐⭐⭐ handoff F→N
Размер: 0.5д
────────────────────────────────────────
#: 15
Phase: E2.4
Что: "Send field weld to NDE"
Демо-вес: ⭐⭐ handoff E→N (step 9)
Размер: 0.5д
────────────────────────────────────────
#: 16
Phase: F1
Что: Live fabrication dashboard
Демо-вес: ⭐⭐ полировка
Размер: 1д
────────────────────────────────────────
#: 17
Phase: E2.2
Что: Live erection dashboard
Демо-вес: ⭐⭐ полировка
Размер: 0.5д
────────────────────────────────────────
#: 18
Phase: F3
Что: /fabrication landing
Демо-вес: ⭐
Размер: 0.25д
────────────────────────────────────────
#: 19
Phase: N3
Что: Source filter (Shop/Field) на NDE batches
Демо-вес: ⭐
Размер: 0.25д
────────────────────────────────────────
#: 20
Phase: N4
Что: Усиленные NDE notifications
Демо-вес: ⭐
Размер: 0.25д
────────────────────────────────────────
#: 21
Phase: B3
Что: Systems/Subsystems + Material Class admin tabs
Демо-вес: ⭐ полировка breadth
Размер: 0.5д

🆕 Что я нашёл по итогам пересмотра PDF (ранее не учтено)

Полный список 20 модулей manual'а и наш покрытие:

§: 1
Modul: Project Definition
Status: ⛔ Не нужно для демо (single project)
────────────────────────────────────────
§: 2
Modul: System Referential (Material Type, Film/Diameter, UT calc,
Torquing req)
Status: ⛔ Не нужно
────────────────────────────────────────
§: 3
Modul: Project Referential (26 sub-items)
Status: 🟡 B1+B2 (7/26); B3 для оставшихся
────────────────────────────────────────
§: 4
Modul: Access Rights
Status: 🟡 Роли есть, admin UI нет — не критично
────────────────────────────────────────
§: 5
Modul: Import Settings (NDE Matrix import, PMC import)
Status: ⛔ Демо не показывает импорт
────────────────────────────────────────
§: 6
Modul: Spooling (Ident Code, Bolting, Marian, Browse
Latest/History,
Manual Revision)
Status: ❌ Track D — placeholder
────────────────────────────────────────
§: 7
Modul: Spool Fabrication lifecycle (Start Fab → Material Check →
Weld Progress → Fabricated → QC Release → Sent to Paint →
Painted/Final QC/Laydown)
Status: 🟡 Только Weld Progress. Остальные 6 стадий — нет. Это
полноценный лайфсайкл спула, не покрытый. Кандидат на новый
Track
G.
────────────────────────────────────────
§: 8
Modul: Import Progress Module
Status: ⛔ Не нужно для демо
────────────────────────────────────────
§: 9
Modul: Fabrication Reports
Status: ❌ Track C
────────────────────────────────────────
§: 10
Modul: Spool Tracking (Dashboard / Data Analysis / Barcode / PDA
Mobile / Offline Sync)
Status: 🟢 Dashboard ✅; Barcode/PDA — out of scope
────────────────────────────────────────
§: 11
Modul: NDE Management (Batch lifecycle / NDE 100 / Issue /
Examination / Client Examination Progress / Reports)
Status: 🟢 N1+N2; §11.6 Client Examination не покрыто (owner's rep
sign-off — отдельная роль)
────────────────────────────────────────
§: 12
Modul: Erection Module (Spool Erection / Material Check / To Site /

    Erected / Welded/Bolted / Supported / RFT / Dashboard)

Status: 🟢 Weld Progress + Dashboard. Стадии живут как badges на
field welds — workflow per stage минимальный.
────────────────────────────────────────
§: 13
Modul: Erection Reports
Status: ❌ Track C
────────────────────────────────────────
§: 14
Modul: Testpack Management
Status: 🟢 Explorer
────────────────────────────────────────
§: 15
Modul: Testpack Preparation (Testpack Builder, Testpack Import)
Status: ❌ Testpack Builder отсутствует. Сейчас testpack-и — seed.
По manual'у это UI где QC вручную собирает ISO в testpack.
Кандидат на Track H.
────────────────────────────────────────
§: 16
Modul: Pressure Test (5 activities × 2 screens)
Status: 🟢 ✅ A1–A6
────────────────────────────────────────
§: 17
Modul: Testpack Homepage
Status: 🟢 ✅
────────────────────────────────────────
§: 18
Modul: Testpack Explorer
Status: 🟢 ✅ (Release Tracking live для store testpacks)
────────────────────────────────────────
§: 19
Modul: Flange Management (Browse / Manual Revision / Progress
Template / Import method / Input method)
Status: 🟡 Browse ✅; progress import/input не реализовано — flange

    workflow незавершён

────────────────────────────────────────
§: 20
Modul: Testpack Management Reports
Status: ❌ Track C

3 содержательных gap'а, которые ранее не обсуждались:

1. §7 Spool Fabrication lifecycle (Track G) — у нас есть только
   weld progress, но manual описывает 7-стадийный pipeline спула. Не
   критично для текущего демо-нарратива (он живёт на welds, не на
   spools-as-objects), но если зритель спросит "а как вы трекаете
   покраску/QC release/laydown спула" — ответа нет.
2. §15 Testpack Builder (Track H) — QC engineer должен иметь UI для
   сборки testpack из ISO. Сейчас это статичный seed. Если зритель —
   QC manager, он спросит первым.
3. §11.6 Client Examination Progress — owner's rep / клиент
   подписывает результаты NDE. Это вторая подпись после N2. Можно
   добавить как N5 (опционально).

---

Полный список user stories (по персонам и треку)

Persona: Anna — QC Engineer, Pressure Test (Track A — downstream)

- A1.1 Открыть Pressure Test Homepage, увидеть bar chart по
  активностям и priority testpacks
- A1.2 Назначить Line Checker team на eligible ISO → видеть запрос
  (CR-YYYY-NNN)
- A1.3 Записать line check date + punch items (X/Y/Z категории) для
  ISO
- A2.1 Назначить Finishing team на punch items (категория X) для
  расчистки
- A2.2 Отметить punch items cleared with timestamp/team
- A3.1 Посмотреть live release-tracking gates по testpack-у в
  Explorer
- A4.1 Назначить Blinding team когда все X-items clear → testpack
  становится Eligible for blinding
- A4.2 Записать blinding date — testpack переходит в Ready For Test
- A5.1 Записать testing start / testing done / pre-comm dates
- A6.1 Назначить Reinstatement team на Y-items punch list
- A6.2 Записать reinstatement complete с jointer/report/tag

Persona: Sergey — Fabrication Shop Foreman (Track F)

- F1.1 ✅ Видеть live KPI welds на /home: total, completed,
  rejected, rework, acceptance rate
- F1.2 ✅ Открыть weld в /fabrication/weld-progress, edit
  welder/date/result
- F1.3 ✅ Smart-validation welder qualification (WLD-099 case)
- F1.4 ⛔ TODO (F1): Drill-down с fabrication dashboard на
  weld-progress по KPI tile
- F1.5 ⛔ TODO (F1): Live fabrication dashboard (KPI вместо static)
- F2.1 ⛔ TODO (F2): "Send to NDE" из weld detail panel → переход в
  Create Batch с пред-выбранными welds
- F2.2 ⛔ TODO (F2): Bulk send (выбор several welds → один batch)
- F3.1 ⛔ TODO (F3): /fabrication landing с 4 карточками + live
  counts
- G1.x ⛔ NEW (Track G): Stage workflow по спулу: Start Fab →
  Material Check → QC Release → Paint → Laydown

Persona: Mikhail — QC Engineer, NDE (Track N)

- N1.1 ✅ Создать NDE batch (2-step wizard): метод + subcontractor

* matrix + inspector → выбор welds

- N1.2 ✅ Issue batch
- N2.1 ✅ Per-weld Receive Results (Accept/Reject + Rework Code из
  REWORK_CODES)
- N2.2 ✅ Close batch
- N2.3 ✅ Cascade rejected → welds-store markForRework + home
  notification
- N3.1 ⛔ TODO (N3): Filter Shop/Field в batch table
- N4.1 ⛔ TODO (N4): Enriched notification на receive results
- N5.1 ⛔ NEW (опц.): §11.6 Client Examination Progress — owner's
  rep подпись после N2

Persona: Hassan — Erection Superintendent (Track E)

- E2.1 ✅ Изменения field weld erection status персистятся (store,
  не useState)
- E2.2 ✅ Spool delivery readiness card в /erection/dashboard
  (E2.3)
- E2.3 ✅ Deep-link ?spool= в /fabrication/weld-progress с
  clearable chip
- E2.5.1 🔜 E2.5: Видеть на /home notification "ISO-XXXX welded —
  RFLC"
- E2.5.2 🔜 E2.5: TP-201 testpack показывает eligibility live в
  Explorer
- E2.4.1 ⛔ TODO (E2.4): "Send field weld to NDE" из
  field-weld-detail-panel
- E2.2.1 ⛔ TODO (E2.2): Live erection dashboard (charts вместо
  static)
- E2.x.x ⛔ Manual §12: workflow per erection stage (Spool Erection
  / Material Check / To Site / etc.) минимальный

Persona: System Admin (Track B)

- B1.1 ✅ View Teams, Subcontractors, Welder Qualifications
- B1.2 ✅ Add team / subcontractor → отражается в Track A pickers
- B1.3 ✅ Toggle subcontractor active
- B2.1 ✅ View WPS / NDE Matrix / Rework Codes / Joint Categories
  (read-only)
- B3.1 ⛔ TODO (B3): Systems / Subsystems / Material Class
  read-only tabs

Persona: Project Manager / Stakeholder (Track C — reports)

- C1 ⛔ TODO: Fabrication Progress Report
- C2 ⛔ TODO: Erection Progress Report
- C3 ⛔ TODO: Testpack Readiness Report
- C4 ⛔ TODO: NDE Summary, Welder Performance, Joint History

Persona: Spooling Team (Track D — §6)

- D1 ⛔ TODO: Spooling browse Latest / History
- D2 ⛔ TODO: Ident Code lookup
- D3 ⛔ TODO: Bolting Report import (fake dialog)
- D4 ⛔ TODO: Manual revision management

Persona: Flange Joint Engineer (Track §19)

- §19.1 ✅ Browse flange joints + detail panel
- §19.2 ⛔ TODO: Flange progress template / import / input —
  torquing progress workflow

Новые предложенные треки

- Track G — Spool Fabrication Lifecycle (§7): Start Fab → Material
  Check → QC Release → Paint → Laydown stages workflow
- Track H — Testpack Builder (§15): QC собирает testpack из ISO
  вручную (сейчас seed-only)

---

Что предлагаю дальше: после E2.5 двигаемся по приоритету в F2 (Send
to NDE) + E2.4 (Send field weld to NDE) — они вместе закрывают
шаги 4–5 и 8–9 демо-нарратива, и оба слайса по 0.5 дня. После них
upstream-демо проходит end-to-end полностью на пользовательских
действиях, без seed-магии.
