## Роль: NDE Inspector

**One-line:** Координатор non-destructive examination loop'а. Принимает
NDE batch от QC Engineer, организует examination (RT / UT / MT / PT / PMI
/ HT) силами own staff или через subcontractor lab (Bureau Veritas, SGS,
TÜV Rheinland, Intertek), регистрирует результаты per-weld, ведёт rework
re-examination cycle до acceptance. Plus penalty shoot / tracer cascade
когда rejections compound. **Edit-heavy** в other ритме чем QC: длинные
sessions для batch-level entries, не quick single-weld updates.

**Lifecycle scope:** Активен с момента первого NDE-готового batch'а в
shop'е (после first welds) до closeout test pack'а (последняя rework
re-examination). Пиковая нагрузка — middle-to-late fabrication peak
(массовая волна batch'ей по shop welds) и erection field weld phase
(field tie-ins idут отдельным flow). После hydrotest роль фактически
exits проект — все NDE history передаётся в test pack dossiers.

**Source:**

- Manual: §11 NDE Management — §11.1 Batch status, §11.2 Batch Management,
  §11.3 NDE100, §11.4 Issue Examination Process, §11.5 Examination
  Progress, §11.6 Client Examination Progress, §11.7 Fabrication Dash
  Board (NDE side), §11.8 NDE Reports (8 mgmt + 4 welder reports).
- Presentations: #4 Fabrication / NDE deep dive (most detailed NDE
  treatment — batch = welder × NDE category formula, S/SS/NR/T status
  enums, penalty shoot rule, rejected joint cascade R1/R2/R3, NDE100 vs
  NDE10/20 dual state machine, 4 preparation sub-functions); #6 Erection
  / NDE (same patterns на field side); #2 Administration (CC-3 Editor
  tier: _"Batches, results"_); CC-17 (Issue Examination = PDF dispatch
  pattern); CC-19 (Numeric status code + RAG color); CC-N4 candidate
  (penalty shoot automation = flagship demo moment).
- IA sitemap: `r2` chip (NDE Insp) появляется на 10+ экранах в Module 5
  (NDE Management): batch lifecycle (3) + examination process (4) +
  dashboard & reports (3+). Самая ограниченная в скоупе, но самая
  глубокая по logic роль.

---

### A. Real-world responsibilities (вне приложения)

NDE Inspector на EPC piping construction:

- **Receive NDE batch from QC** — QC Engineer создаёт batch (B4 в QC
  matrix): method + welds selected per NDE Matrix sampling rate. NDE
  Inspector accepts batch на свою queue. Batch attribute formula
  (CC-4 from #4): _batch = (welder × NDE category)_ — selection всегда
  внутри batch, не cross-batch.
- **Perform examination** — RT (X-ray with film развороткой), UT
  (ultrasonic with crystal probes), PT (penetrant), MT (magnetic
  particle), PMI (positive material identification, alloy verification),
  HT (hardness test, обычно follow-up на PWHT). Own staff для VT and
  basic surface methods, **subcontractor lab** (BV / SGS / TÜV / Intertek
  + national labs) для RT + UT + PMI requiring certified personnel
  (ASNT Level II/III).
- **Per-weld result recording** — для каждого weld в batch'е: `Is Accepted
  = A` (Accepted) или `R` (Rejected). On Rejection: **mandatory fields**
  — Defect Code (POR/CRK/LOF/SLG/UNC/INC/OTH) + Location of Defect
  (root / cap / fill / side specification). Inspector remarks free-text.
- **Maintain examination history per joint** — каждый weld может пройти
  через несколько exam cycles (original + R1 + R2 + R3). Inspector ведёт
  complete trace: который exam method, который lab, который inspector
  signed off, дата, accept/reject, defect codes per cycle.
- **Rework re-examination cycle** — после rejection QC dispatches rework
  → welder fixes → новый weld # (`J-1029-R1`) — это **new weld в same
  joint location**. NDE Inspector ре-examines automatically в NDE100
  category (per CC-4 cascade rule: any rejection → R1 joint goes to 100%
  NDE regardless of original sampling rate). Plus all other welds в same
  batch flip в T1 (tracer 1) status.
- **Tracer hierarchy management** — если T1 weld тоже fails: T1-1 + T1-2
  (level 2 tracers) created automatically. Если T2 path triggers: T2-1
  + T2-2. Это formal penalty-shoot tree, не optional convention. Tracer
  joints are **additional welds added to the batch beyond original
  sampling** — economic argument from #4: _"3 additional joints have to
  be examined for each weld defect of the welder"_ (1 repair + 2 tracers).
- **Penalty shoot trigger** — auto-cascade rule (verbatim from #4): _"In
  a Batch When 2nd level Tracer (T1-1, T1-2, T2-1, T2-2) or 4 joints
  are rejected in the examination, all the remaining welds in this
  batch should be examined."_ — все remaining welds в batch flip в SS
  (Selected and awaiting examination). Это flagship NDE business logic.
- **Issue Examination Program** — formal dispatch к lab. Per CC-17
  pattern: generate PDF request с unique Request No, list of joints,
  examination method, NDE category, special instructions. Send (email /
  printout / portal upload to lab). Used for billing и lab scheduling.
- **Client examination coordination** — periodic re-exams инициированные
  client representative (audit witnessing, dispute on result). NDE
  Inspector schedules joint(s) для client exam → records result similar
  flow + chip "Client request" в history.
- **NDE Matrix application** — sampling rate rules per piping class /
  fluid service / pressure class. e.g. _Class 150 LP CS = 10% RT spot_;
  _Class 300+ HP SS = 100% RT_. NDE Matrix referential управляет default
  selection. NDE100 categories (joints requiring 100% exam) — separate
  state machine (H / HS statuses, не S / SS).
- **PWHT status tracking** — для CrMo / heavy CS joints: post-weld heat
  treatment release blocks NDE для thickness-driven joints. NDE Inspector
  cross-references PWHT release с batch'ами before exam (CC-18 RFT gate
  feeder).
- **Reports generation** — 8 management reports (Batch status,
  Radiographic status, Outstanding Repairs, Service class wise, Spool
  wise, Outstanding NDE, Radiographic film qty est, Weld History sheet)
  + 4 welder monitoring reports (Perf Control Sheet, Rej. and Repaired,
  Rej. and Tracers, Batch status per welder). Weld History sheet — the
  critical one — inserted в final test pack dossier per CC-18.
- **Reports up** to QC Engineer (rework dispatch decisions) and to
  Project Manager (acceptance rate trends, lab subcontractor performance).
- **Reports to client QC** — monthly NDE acceptance summary, ad-hoc
  for rejection rate spikes.

Ключевая характеристика: NDE — **edit-heavy** like QC, но в other
cadence. QC trogает joint-by-joint много раз в день (5-min entries).
NDE trogает batch-by-batch несколько раз в день (15-30 min sessions per
batch entry). Self-stamps как domain expert — defect code calls require
expertise, не просто data entry.

---

### B. Application functions (PipeQC scope)

14 функций. Status legend — ✅ live · ⚠ partial · ❌ missing · 📋 planned.

1. **✅ View batch list / filter** — `/nde` показывает все batches с
   status pills (Created / Issued / In Progress / Results Received /
   Rework / Closed) + filter chips по method (RT/UT/MT/PT/PMI/HT) +
   source (Shop / Field, after F2+E2.4 merged).
2. **✅ Issue batch (Created → Issued)** — batch row dropdown menu →
   "Issue" → subcontractor + inspector preselected from batch metadata →
   confirm → status flip + history entry _"Issued to [subcontractor]"_.
3. **✅ Receive results per weld** — batch row dropdown → "Receive
   Results" → per-weld dialog: Accept / Reject + rework code dropdown
   (mandatory when Reject) + inspector remarks → Submit (~700ms) →
   cascade в welds-store (rejected welds → Rework status).
4. **✅ Close batch** — после all welds в batch'е Accepted: dropdown
   "Close" → status Closed, batch goes в archive view. Если хоть один
   weld Rejected → status flips в Rework instead.
5. **⚠ Issue Examination Program (PDF dispatch)** — current C1 placeholder
   `/reports` имеет "NDE Batch Summary" + "NDE Overdue" reports.
   Полноценный Request No assignment + per-batch PDF generation с
   joint list отсутствует. Mock-toast download только.
6. **❌ NDE100 sub-flow** — joints в 100% NDE categories имеют other
   state machine (H = to select, HS = selected awaiting). Сейчас все
   joints через single S/SS/NR enum (mixed status, see CC-N4 finding).
   Track N candidate.
7. **❌ Penalty shoot trigger / tracer cascade** — auto-flip всех
   remaining welds в batch в SS status on (4 rejections OR 2nd-level
   tracer existence). Auto-creation R1 joint в NDE100 category on each
   rejection. Tracer hierarchy T1 → T1-1/T1-2 → T2-1/T2-2. **Flagship
   demo moment** per CC-N4 finding. Полностью отсутствует.
8. **❌ Client examination request flow** — "Client request exam"
   button с separate workflow для client-initiated re-exams. Не
   реализовано. Niche but present in EasyPiping per §11.6.
9. **⚠ NDE acceptance rate report** — placeholder в C1 (RPT-N-001 Batch
   Summary, RPT-N-002 Overdue). Reаl acceptance rate computation per
   subcontractor / welder / period не surfaced. Mock-toast only.
10. **❌ Batch reports — 8 management reports** — Batch status,
    Radiographic status, Outstanding Repairs, Service class wise NDE
    status, Spool wise NDE status, Outstanding NDE, RT film qty
    estimation, Weld History sheet. None implemented natively. **Weld
    History sheet** — critical для test pack closeout (per CC-18 RFT
    gate feeder), main gap.
11. **❌ Welder monitoring reports — 4 reports** — Perf. Control Sheet
    (~25% covered via existing Welder Performance Log in /reports), Rej.
    and Repaired joints (per welder backlog), Rej. and Tracers joints
    (penalty shoot backlog), Batch status per welder. Mostly missing.
12. **⚠ NDE dashboard / KPI tiles** — Fabrication NDE dashboard from
    §11.7 (NDE section внутри fab dashboard). Existing
    `/fabrication/dashboard` имеет partial — welds awaiting NDE / rework
    queue KPI tiles из welds-store. Нет separate dedicated NDE dashboard
    с acceptance rate trends / lab performance / defect type Pareto.
13. **❌ NDE 100% override** — per IA sitemap, allows NDE Insp + Prj
    Admin to override sampling rate (e.g. client request all welds
    examined for specific period / specific welder). Niche, low priority.
14. **❌ Examination History per joint** — single weld view с full
    history (original → R1 → R2 → R3 cycles, who examined, when, results,
    defect codes per cycle). Сегодня batch-level history есть в batch
    detail panel, но joint-level deep history view отсутствует.

**Gap summary:** 4 функции ✅ live, 3 ⚠ partial, 7 ❌ missing.

**Gap density observation:** в отличие от QC Engineer (где gaps размазаны
по edge cases), NDE Inspector gaps cluster'ятся в two zones: **(a) deep
NDE logic** (penalty shoot + tracer cascade + NDE100 dual state machine
= B6, B7, B14) и **(b) reports catalog** (B10, B11). Track N (NDE
upgrade) с фокусом на penalty shoot automation per CC-N4 — это самый
высокий ROI слайс для роли NDE Inspector **и** одновременно flagship
demo moment для investor pitch ("watch this welder's 4th joint fail —
no human intervention, all remaining welds auto-selected for examination").
Track C extension для NDE-specific reports закрывает B10/B11.

---

### C. Function → Screen → Interaction

| #   | St  | Функция                                  | Экран                                  | Что нажимает / делает                                                                                                                                                                                                                                                  |
| --- | --- | ---------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | ✅  | View batch list / filter                 | `/nde`                                 | Method chips (RT/UT/MT/PT/PMI/HT) + status chips + source chip (Shop/Field) → table updates. Row click → batch detail panel в Sheet (full welds list + history tab).                                                                                                  |
| B2  | ✅  | Issue batch                              | `/nde` (row dropdown)                  | Batch row "..." menu → "Issue" → toast _"BTH-XXXX issued to [subcontractor]"_ → status flip Created → Issued. History entry added.                                                                                                                                       |
| B3  | ✅  | Receive results per weld                 | `/nde` (row dropdown)                  | "Receive Results" → per-weld: Accept (default) / Reject + rework code dropdown (mandatory on Reject) + inspector remarks → Submit (~700ms) → cascade: rejected welds → Rework status в welds-store + notification feed update.                                          |
| B4  | ✅  | Close batch                              | `/nde` (row dropdown)                  | "Close" — enabled only if all welds Accepted → status Closed → archive view. Если хоть один Rejected — option becomes "Mark for Rework" → status Rework.                                                                                                              |
| B5  | ⚠   | Issue Examination Program                | `/reports` (mock today)                | Today: download mock-toast в /reports. Planned: from batch detail panel → "Issue Exam Program" button → dialog: lab + special instructions + Generate → PDF (mock) с Request No.                                                                                       |
| B6  | ❌  | NDE100 sub-flow                          | (no screen — planned `/nde/nde100`)    | Planned: separate tab from main batch list. Pick NDE category → grid of joints в 100% category → status H/HS → "Mark Selected" → bulk action → batch generated automatically with HS-status joints.                                                                  |
| B7  | ❌  | Penalty shoot / tracer cascade           | (no screen — auto-trigger logic)       | Planned auto-behavior: on each Reject in B3 → welder rejection counter ++ → если counter ≥4 в same batch OR T1-1/T1-2/T2-1/T2-2 created → all remaining welds в batch flip S/SS → notification _"Penalty shoot triggered for [batch] — N additional welds auto-selected"_. |
| B8  | ❌  | Client examination request               | (no screen yet)                        | Planned: batch detail panel → "Client request" button → opens dialog для client-initiated re-exam: list welds + reason → creates separate "Client" sub-batch с tag.                                                                                                     |
| B9  | ⚠   | NDE acceptance rate report               | `/reports`                             | Filter Category=NDE → row "NDE Batch Summary" or "NDE Overdue" → Download → mock-toast. Real per-welder/per-sub acceptance rate computation отсутствует — это mock.                                                                                                        |
| B10 | ❌  | 8 management reports                     | `/reports` (placeholder)               | Today: 2 NDE rows mocked. Planned: add 6 more — Radiographic status, Outstanding Repairs, Service class NDE status, Spool wise NDE status, Outstanding NDE, Weld History sheet. Weld History sheet — main test-pack-dossier deliverable.                                  |
| B11 | ❌  | 4 welder monitoring reports              | `/reports` (placeholder)               | Planned: Perf Control Sheet (full version vs ~25% Welder Perf Log сегодня), Rej. and Repaired joints, Rej. and Tracers joints, Batch status per welder.                                                                                                                  |
| B12 | ⚠   | NDE dashboard / KPI                      | `/fabrication/dashboard` (mixed)       | Сейчас "awaiting NDE" + "rework queue" tiles в fab dashboard. Нет dedicated `/nde/dashboard` с acceptance rate trends, lab performance per-sub, defect Pareto. Planned для Track N phase 2.                                                                                |
| B13 | ❌  | NDE 100% override                        | (no screen)                            | Per IA sitemap (Examination Process / NDE 100% override). Override sampling rate для welder × period × WPS. Niche.                                                                                                                                                       |
| B14 | ❌  | Examination History per joint            | (no screen yet — would be deep panel)  | Planned: weld detail panel → "Examination History" tab → timeline view: original exam + R1 + R2 + ... с per-cycle Accept/Reject + inspector + defect code. Track N candidate.                                                                                          |

---

### D. Deep dive — user stories

Самые consequential функции для NDE Inspector ежедневно: **B3** (Receive
results — основной daily input, batch-level entries сессиями) и **B7**
(Penalty shoot trigger — flagship business logic, отличительный demo
moment per CC-N4, отсутствует сегодня). Первая ✅ live, вторая ❌ —
top Track N candidate.

---

#### Story для B3: Receive results per weld — mixed accept/reject session

**Context:** Четверг, 14:00. Bureau Veritas только что отправил по email
RT film readings для BTH-2025-0156 (4 welds RT-examined, dispatched 4
дня назад). Lab report — PDF + raw films в digital archive. Михаил
(NDE Inspector lead) садится за десктоп для batch entry.

**Happy path:**

1. Михаил открывает `/nde`
2. Filter chip "Issued" → видит BTH-2025-0156 в top of table (oldest
   issued, status = Issued, subcontractor = Bureau Veritas, 4 welds)
3. Row click → batch detail Sheet открывается справа
4. Видит 4 welds: J-1028 (4" CS), J-1029 (4" CS), J-1030 (6" SS),
   J-1031 (4" CS) — все status Pending
5. Click "Receive Results" → dialog
6. J-1028: Accept (default radio) → inspector remark _"No reportable
   indications. Released."_
7. J-1029: Accept → inspector remark _"Minor surface roughness, within
   spec."_
8. J-1030: **Reject** → rework code dropdown → выбирает POR (Porosity)
   → location of defect text _"Cap pass at 12 o'clock, 6mm cluster"_ →
   inspector remark _"Pinhole porosity cluster on external cap. Grinding
   + re-weld required."_
9. J-1031: Accept → inspector remark _"Acceptable per ASME B31.3."_
10. Click "Submit" → ~700ms delay → toast _"BTH-2025-0156 results
    received · 3 accepted, 1 rejected"_
11. Cascade происходит:
    - Batch status → "Results Received" (mixed) → история entry
    - J-1030 weld в welds-store flip в Rework status + rework code POR
    - Notification feed: _"BTH-2025-0156: 1 weld rejected (J-1030 POR)
      — awaiting QC engineer rework dispatch"_
12. Sheet остаётся open → Михаил видит updated weld list
13. Click "Close" — disabled с tooltip _"Cannot close — 1 weld in
    Rework status. Close requires all welds Accepted."_
14. Михаил продолжает к next batch (BTH-2025-0162 в queue)

**Edge cases (status-conditional):**

- **Все 4 welds Rejected**: на шаге 11 cascade — batch status flips
  в "Rework" (не Results Received). Notification получает severity red:
  _"BTH-2025-0156: ALL 4 welds rejected — escalate to QC + welder
  review"_. Если все 4 от same welder — banner на batch detail _"Welder
  WLD-019: 4 rejections in single batch — penalty shoot trigger
  pending (Track N)"_. Сегодня banner не появляется, planned для B7.

- **Все 4 welds Accepted (best case)**: cascade тот же formula, но
  status flips к "Results Received" → можно сразу click "Close" →
  batch архивируется. Скорее всего most common case в healthy project
  (~92% acceptance rate per CC-N4 economics).

- **Partial save / interrupt**: если Михаил entered результаты 2 welds
  и закрыл browser (e.g. lunch) — Submit не fired, **draft не
  сохраняется**. В реальной EasyPiping есть partial save; в PipeQC
  сейчас all-or-nothing. Gap — может быть partial save TBD в Track N.

- **Joint already в active rework cycle (R1)**: если J-1030 уже было
  rejected ранее (это его R1 cycle, не original) — batch detail чётко
  показывает chip _"R1 — original rejected 2026-05-10 (POR cap pass)"_.
  При новом rejection на R1 → создаётся J-1030-R2. Если pattern
  продолжается до R3, R4 — QC должен принимать decision "scrap & re-fab"
  vs "continue rework". В UI это soft warning (planned), не block.

- **Inspector signature missing / wrong**: если result был от
  third-party inspector, а Михаил вводит результат от своего lica — на
  Submit warning banner _"Inspector mismatch: batch issued to BV,
  receiving by [Michael name] — confirm receipt method (e.g. paper
  report)"_. Soft warning, save proceeds но flag в history.

- **Penalty shoot threshold approaching** (B7 missing today): если
  welder WLD-019 already has 3 rejections в проекте (включая прошлые
  batches) и сейчас наставшая 4-я (J-1030) — auto-cascade should fire:
  status WLD-019 → SS, все его future welds 100% NDE, banner _"Welder
  WLD-019 reached penalty shoot threshold — auto-flagged SS"_. **Сегодня
  не fire** — это самый critical gap per CC-N4. Track N priority 1.

- **NDE Matrix mismatch — wrong method tested**: если batch был issued
  как RT, но lab returned UT report (e.g. RT источник blocked, lab
  switched method) — на dialog шаг 5 dropdown "Examination method
  used" → user picks alternate method → save с chip _"Method override:
  RT → UT"_. History entry preserves both planned and actual.

- **Client witness present**: если client representative was present
  на exam (witnessed examination) — на dialog есть checkbox "Client
  witnessed" + name field. Audit trail + special report inclusion для
  client deliverable. Sometimes mandatory per contract.

- **PWHT pending block**: если в batch один из welds is on PWHT-required
  joint (CrMo, heavy CS) и PWHT release не done yet — на dialog banner
  _"J-1031 requires PWHT release before NDE — confirm temporary exam
  or hold"_. Two-tier validation per CC-28: soft warn если client allows
  pre-PWHT exam (rare); BLOCK иначе. Currently in PipeQC это field в
  weld panel (B13 in QC matrix), не surfaced в NDE flow — Track N gap.

---

#### Story для B7: Penalty shoot trigger — auto-cascade на 4-й rejection

**Context (planned post-Track N):** Среда, 16:30. Welder WLD-099 имел
сложную неделю — 3 rejections подряд за последние 5 days: BTH-2025-0142
(LOF), BTH-2025-0148 (CRK), BTH-2025-0153 (POR). QC engineer Анна знает,
welder под наблюдением. Сейчас Михаил вводит results BTH-2025-0162 (RT,
4 welds, WLD-099 wedded 2 из 4) — это его 4-й rejection threshold.

**Happy path (planned post-Track N):**

1. Михаил открывает `/nde` filter "Issued" → BTH-2025-0162 row
2. Видит warning chip на row _"WLD-099 at 3 rejections (penalty shoot
   threshold pending)"_
3. Row click → batch detail panel
4. Click "Receive Results" → 4 welds dialog
5. J-1034 (WLD-099): Accept → remark _"OK, no indications"_
6. J-1037 (WLD-033): Accept → remark _"Acceptable"_
7. J-1038 (WLD-099): **Reject** → rework code CRK → location _"Root crack,
   3 o'clock position"_ → remark _"Hot crack at root, full grind out
   required"_
8. На шаге 7 в dialog появляется **immediate red banner**: _"WLD-099
   reached penalty shoot threshold (4th rejection). On Submit: all
   remaining welds in batch auto-selected for examination (SS),
   J-1038 will create R1 in NDE100 category, WLD-099 all future welds
   will be 100% NDE."_
9. J-1039 (WLD-022): Accept → remark _"OK"_
10. Click "Submit" → ~700ms delay → toast _"BTH-2025-0162 results
    received · 3 accepted, 1 rejected · PENALTY SHOOT TRIGGERED for
    WLD-099"_
11. **Auto-cascade fires:**
    - J-1038 → Rework status + rework code CRK
    - J-1038-R1 weld auto-created в NDE100 RT category (status H)
    - WLD-099 attribute → SS (all future welds 100% NDE forced)
    - Welder dropdown в future weld entries показывает chip _"SS"_
      возле WLD-099 ID (B14 в QC matrix также updates)
    - 3 remaining welds в BTH-2025-0162 status flip от Accepted to
      SS (Selected, awaiting re-examination) — penalty shoot rule
    - Notification (red severity): _"WLD-099: penalty shoot triggered
      after 4 rejections. 3 welds in BTH-0162 auto-selected for
      re-examination. 5 future welds queued at 100% NDE."_
    - Project Manager notification: _"NDE escalation: WLD-099 penalty
      shoot. Consider welder review / re-qualification."_
12. Sheet refreshes — видно 4 welds, 1 Rejected + 3 SS (chip "Penalty
    shoot — re-exam pending")
13. Михаил знает: нужно coordinate с QC engineer для welder review
    meeting (offline, не в приложении). Phone call to Anna.

**Edge cases (status-conditional, planned for Track N phase 2):**

- **2nd-level tracer trigger (T1-1, T1-2, T2-1, T2-2 path)**: если в
  batch уже есть T1 welds (tracers from prior rejection в same batch)
  и one of T1 itself fails — auto-create T1-1 + T1-2 → penalty shoot
  trigger via 2nd-level tracer path (not just 4-rejection threshold).
  Tree: original fail → T1 (1) → T1 fails → T1-1, T1-2 → if T2 path →
  T2-1, T2-2. CC-N4 explicit rule from #4.

- **Cross-batch penalty shoot accumulation**: WLD-099 не имел 4 fails
  в same batch — но 4 over 3 different batches over month. Это **also
  triggers** penalty shoot (welder-level threshold, не batch-level).
  Sub-rule from #4: penalty shoot тригер на batch-level OR welder-level
  per project policy. PipeQC должен поддержать оба formula — admin
  config in NDE Matrix referential.

- **Welder previously SS, all welds 100%**: если WLD-099 уже на SS
  status (penalty shoot из прошлого месяца, not released) — на step 8
  banner вместо trigger: _"WLD-099 already on SS status (since
  2026-04-12). All his welds already 100% NDE. No additional action."_
  Penalty shoot escalation already в action. Possible further escalation:
  welder review / re-qualification flag.

- **Manager override / waiver**: PM / Project Admin can override
  penalty shoot trigger в exceptional cases (e.g. defects были lab
  attribution errors, не welder fault). UI: PM на batch detail row →
  "Override penalty shoot" → reason mandatory → audit entry _"Penalty
  shoot waived by [PM name] · reason: lab calibration drift confirmed
  retroactively"_. Tracer welds released back to normal status. Niche
  but real-world.

- **Penalty shoot release / welder re-qualification**: as part of follow-up,
  welder может re-qualify (new WPS, additional training, supervised
  welds with 100% acceptance over N period). After re-qualification, PM
  can release SS status: welder returns to normal sampling rate. UI:
  welder dropdown chip flips от SS to "Re-qualified [date]". Tracking
  in Welder Qualification admin tab (B14 in QC matrix overlaps here).

- **Auto-trigger вместо human entry**: penalty shoot fully automated
  — no human decision required. Михаил's role здесь — observer +
  notifier, не editor. Это **the** flagship demo moment: investor sees
  Михаил нажимает Submit, banner flashes red, cascade fires, multiple
  welds auto-update. _"Watch what happens when this welder's 4th joint
  fails — the system pre-selects all remaining welds for examination,
  no human intervention."_ — verbatim demo script от CC-N4.

- **Acceptance rate dashboard impact**: penalty shoot для individual
  welder pushes project-level acceptance rate calc — anomaly chart
  на NDE dashboard (B12) показывает spike. PM сразу видит pattern.
  Это feedback loop в PM роль (B5 в PM matrix).
