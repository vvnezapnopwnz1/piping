## Роль: Spooling Team

**One-line:** Owner engineering→site iso document workflow'а. Принимает isos
от engineering через transmittal, назначает spooler'у на cutting в SpoolGen,
ведёт multi-round verification, управляет holds (Spool Team / Engineering),
отправляет outbound batch'и на site. После IA1-reframe (CC-22) это
**document workflow**, не shop-floor cutting. Самая upstream роль в проекте
— до Spooling Team в системе ничего нет.

**Lifecycle scope:** Активен с самого engineering ramp (первые isos из
3D model → SpoolGen → PipeQC) до закрытия проекта (последний transmittal
to site). Пиковая нагрузка — engineering ramp (массовая первичная обработка
isos в начале проекта) и revision cascade waves (когда engineering выпускает
rev для большой группы линий из-за client change или design fix).

**Source:**

- Manual: §6 Spooling (Ident Code, Marian, Browse), §3 Preparation module
  (Spooling 4-file import + Marian + Browse + Test pack builder), §3.12
  Project Piping Material List (heat → mill cert pipeline).
- Presentations: #8 Spooling (full 8-sub-module walkthrough, iso state
  machine, 4-tab Spooling Explorer), #3 Preparation (SpoolGen 4-file
  import: weld.txt / trace.txt / bolt.txt / supp.txt), #2 Administration
  (CC-3 Editor tier: _"Spooling, revisions"_), CC-21 (Iso lifecycle =
  first-class state machine), CC-22 (Spooling = engineering→site handoff,
  NOT shop floor), CC-23 (live activity feed pattern), CC-25 (SpoolGen
  connector — manual today, potential auto-poll differentiator).
- IA sitemap: `r4` chip (Spooling) появляется на 8+ экранах в Module 2
  (Preparation · Spooling) — плюс 2 cross-import экрана в Module 3
  (Fabrication import erection / weld progress).

---

### A. Real-world responsibilities (вне приложения)

Spooling Team lead на EPC piping construction:

- **Receive engineering transmittals** — engineering выдаёт batch'и isos
  с rev # и source team. Spooling Team accepts batch → каждый iso
  получает статус Received и попадает в backlog для checkout. Frequency:
  daily-to-weekly batches размером 5–50 isos каждый. Tot project volume:
  3000–20000 isos (CC-6 PMP benchmark: 5003 isos).
- **Checkout iso to spooler** — назначает iso конкретному spooler'у
  (junior/mid drafter, 3–5 в команде на крупном проекте). Spooler
  открывает iso в SpoolGen (external CAD tool — not part of PipeQC),
  режет line на физические spools (определяется fab shop capacity,
  transport limits, weld optimization). SpoolGen output — 4 файла:
  `weld.txt`, `trace.txt`, `bolt.txt`, `supp.txt`.
- **Multi-round verification (checking)** — после first checkout senior
  spooler / checker reviews результат. Если spools поломаны / неправильно
  размечены / heat numbers не сходятся → reject с комментарием → spooler
  fixes → checker re-reviews. Tot. Round counter увеличивается. Typical
  iso: 1–3 rounds. Problem iso: 5+ rounds.
- **Hold management — 2 источника:**
  - **Spool Team hold:** обнаружена inconsistency в iso (e.g. пропущенный
    weld point, ошибка в material spec) → нужно вернуть engineering на
    clarification. Hold reason + holder name записаны.
  - **Engineering hold:** engineering сами reissue iso (новый rev coming) →
    блокируется spooling этого iso до получения rev.
- **Outbound transmittal composition** — released isos группируются в
  batch'и по target system / PDS area / target completion date. Batch
  получает `Spl. Trans. No.` и отправляется в Fabrication module как
  готовый workload. Это формальный handoff на shop floor.
- **File-bridge management** — манипуляция со SpoolGen output: ingest
  через Browser sub-module (filtering by Spooling Transmittal Batch no /
  Spl. Trans. No / Iso No / Type of Files), валидация, archive history.
  Это **manual integration step** (CC-25) — не auto-pipeline.
- **Marian (SmartPlant Material) sync** — periodic CSV upload (`FAH CODE,
  Run Number, ... , Completion Status, Completion Date`) обновляет
  material readiness в spool aggregate. Spooling Team owns эту pipeline,
  потому что materials визуально появляются вместе с iso info.
- **Revision management (R0→R1→R2)** — когда engineering issues new rev
  на iso, который уже spooled или даже в shop'е fab'е — Spooling Team
  координирует impact analysis: какие spools остались актуальны, какие
  идут в scrap, какие require modification. Это самая painful operation
  в lifecycle.
- **Reports up** to Project Manager (Spooling progress curves, hold
  backlog) и to Engineering (request closure rates, hold release SLA).
- **Hand-off down** to Fabrication module (через outbound transmittal),
  to Erection module (когда field tie-in isos идут directly to field).

Ключевая характеристика: Spooling Team — **document workflow editor**,
не shop floor. Не варит, не режёт металл. Trogает только PDF/CAD/CSV/Excel
файлы. **Edit-heavy** но в другом ритме чем QC: длинные thoughtful sessions
с iso reviews, не быстрые daily entries.

---

### B. Application functions (PipeQC scope)

12 функций. Status legend — ✅ live · ⚠ partial · ❌ missing · 📋 planned.

1. **⚠ Demo import + validation table** — текущий SpoolingView под
   `/spooling/iso-workflow` (post-IA1). Mock import одного weld file,
   validation rules таблица, "Latest" и "History" panels. Реальный
   парсер SpoolGen output отсутствует.
2. **⚠ Revision management (R0→R1→R2)** — есть UI на shell-уровне для
   manual revision changes, но без полной cascade-logic (impact analysis
   что blow up'нется ниже). Tot. Round counter не surfaced.
3. **❌ Engineering Transmittals receipt** — placeholder
   `/spooling/engineering-transmittals` создан в IA1. Empty state с
   table headers (Transmittal #, Received Date, Source, ISO Count,
   Status). Реальный flow приёма batch'а isos отсутствует.
4. **❌ ISO checkout to spooler** — flow назначения iso члену команды
   (Spooled By column в data). Сейчас iso просто появляются в системе,
   без attribution. Track K candidate.
5. **❌ Multi-round checking** — N rounds verification cycle (Tot. Round
   counter, Checker name, Last Checking date, Checker Comments). Сейчас
   iso либо есть, либо нет, без verification state machine.
6. **❌ Hold management (2 sources)** — Hold Type (Spool Team /
   Engineering), Holder, Hold Date, Release Date, Hold reason taxonomy.
   Сейчас "HOLD" статус как одно слово, без structured workflow.
7. **❌ Spooling Transmittal (outbound batches)** — placeholder
   `/spooling/spooling-transmittal` создан в IA1. Empty state table
   (Spl. Trans. No., Generated Date, Target System/Area, ISO Count,
   Released By). Реальный flow composition + dispatch отсутствует.
8. **❌ SpoolGen Browser sub-module** — file import bridge с filtering
   (Spooling Transmittal Batch no, Spl. Trans. No., Iso Number, Type
   of Files). Сейчас файлы либо paste'нуты в demo import, либо нет.
9. **✅ Latest accepted / Issues / History views** — внутри SpoolingView
   на `/spooling/iso-workflow`. Базовые list views работают и persist'ятся.
10. **❌ Marian (SmartPlant Material) status import** — CSV upload
    pipeline для material completion status. Сейчас material info
    seed-only в `lib/spool-data.ts`, без external sync.
11. **⚠ Spooling Home dashboard** — `/spooling` (после IA1) показывает
    static cards + optional KPI strip из `useSpoolingStore`. Нет S-curve
    chart (Received / Spooled / Transmitted by date — Amont/Cumul toggle
    per #8), нет live activity feed (per CC-23).
12. **📋 Real SpoolGen connector / auto-poll** — потенциальный
    differentiator против EasyPiping (там manual integration only per
    CC-25). Stub-config screen на `/spooling/iso-workflow` для пилотных
    клиентов. Не demo-ready, но pitch material.

**Gap summary:** 1 функция ✅ live, 3 ⚠ partial, 7 ❌ missing, 1 📋 planned.

**Gap density observation:** Spooling — это самый "тонкий" модуль в
PipeQC сегодня. 7 из 12 функций отсутствуют целиком. После IA1 (CC-22
reframe) ground truth наконец понятен, но build ещё впереди. Естественный
консолидированный трек: **Track K — Iso lifecycle state machine**
(per CC-21) — закрывает 5 из 7 missing функций (B3, B4, B5, B6, B7).
Это самый высокий ROI track для роли Spooling Team. **Track D — SpoolGen
real parser** добирает B8 + B1 upgrade.

---

### C. Function → Screen → Interaction

| #   | St  | Функция                          | Экран                                  | Что нажимает / делает                                                                                                                                                                                                                                                                |
| --- | --- | -------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | ⚠   | Demo import + validation         | `/spooling/iso-workflow`               | "Load demo import" button → mock SpoolGen weld file parsing → validation table показывает rows с PASS / WARN / FAIL chips → клик на FAIL row → side panel с error detail (e.g. "Heat number HT-9999 missing from project material list") → "Acknowledge" / "Hold" / "Send to issues". |
| B2  | ⚠   | Revision management              | `/spooling/iso-workflow` (Revision panel) | "Manual revision" button → dialog: source iso # → current rev → new rev (R0/R1/R2) → reason text → "Apply" → row updates, history entry created. Cascade impact analysis НЕ показан (gap).                                                                                              |
| B3  | ❌  | Engineering Transmittal receipt  | `/spooling/engineering-transmittals`   | Placeholder сегодня. Planned: "New Transmittal" button → upload batch metadata (transmittal #, source team, iso list CSV) → preview taw isos → "Accept" → все isos появляются в `/spooling/iso-workflow` со статусом Received.                                                       |
| B4  | ❌  | ISO checkout to spooler          | `/spooling/iso-workflow` (planned)     | Planned: row click → side panel → "Checkout" button → spooler dropdown (project team members) → "Assign" → iso status flip Received → Checked Out, `first_checkout_date` + `Spooled By` filled.                                                                                          |
| B5  | ❌  | Multi-round checking             | `/spooling/iso-workflow` (planned)     | Planned: после spooler check-in → row click → "Open for checking" → review panel (preview SpoolGen output) → "Accept" или "Reject with comment" (Tot. Round ++ , Checker Comments field). Iterative: reject → spooler fixes → re-checks. Accept → status flip → Released bucket.        |
| B6  | ❌  | Hold management                  | `/spooling/iso-workflow` (planned Hold tab) | Planned: "Hold" button on iso row → dialog: Hold Type (Spool Team / Engineering) → Holder dropdown → Hold reason from taxonomy → "Apply". Iso disappear из active queue → попадает в Hold tab. Release: "Release" button на hold row → reason → status restores.                |
| B7  | ❌  | Spooling Transmittal (outbound)  | `/spooling/spooling-transmittal`       | Placeholder сегодня. Planned: "Compose batch" → select isos в Released bucket → group by Target System / PDS area → confirm composition → assign Spl. Trans. No. → "Send" → batch появляется в Fabrication module backlog.                                                            |
| B8  | ❌  | SpoolGen Browser                 | (no screen — planned `/spooling/browser`) | Planned: filter bar (Spl. Trans. Batch no / Spl. Trans. No. / Iso No / File Type) → grid of files в network folder → multi-select → "Import" → cascade в /iso-workflow + ident code update.                                                                                            |
| B9  | ✅  | Latest / Issues / History views  | `/spooling/iso-workflow` tabs           | Click tab "Latest accepted" → list of recently approved imports. Click "Issues" → list of validation FAILs awaiting acknowledgment. Click "History" → audit log всех import sessions с filter by date/user.                                                                                |
| B10 | ❌  | Marian material status import    | `/spooling/iso-workflow` (planned tab)  | Planned: "Material Import" tab → upload CSV file (Marian export schema) → preview rows mapping iso/spool to material completion status → "Apply" → cascade в spool aggregate (material readiness updates).                                                                              |
| B11 | ⚠   | Spooling Home dashboard          | `/spooling`                            | Static cards: Total Received / In Spooling / In Checking / Currently on HOLD (Spool Team + Engineering breakdown). Если есть data в `useSpoolingStore` — KPI strip ("Latest accepted: N · Pending issues: M"). Нет S-curve, нет live activity feed.                                       |
| B12 | 📋  | SpoolGen auto-poll connector     | (no screen — planned config screen)     | Planned pilot-feature: config "auto-poll SpoolGen output folder every N min" + "auto-accept rows passing validation". Не demo-ready. Pitch slide differentiator vs EasyPiping manual integration.                                                                                       |

---

### D. Deep dive — user stories

Самые consequential функции для Spooling Team ежедневно: **B3**
(receipt engineering transmittal — это первая дверь любого iso в систему,
без неё ничего не существует downstream) и **B5** (multi-round checking
— это где реально lives quality of spooling output, тут самый высокий
human-judgment input). Обе ❌ missing — главные кандидаты для **Track K**.

---

#### Story для B3: Engineering Transmittal receipt — новый batch isos

**Context:** Понедельник утром. Engineering выпустили T-2026-018 — batch
из 23 isos для Unit 2 process gas system. Сергей (Spooling Team lead)
ожидает этот transmittal по weekly cadence. Email от engineering уже
пришёл в пятницу вечером со списком + ссылкой на SpoolGen output folder.

**Happy path (planned post-Track K):**

1. Сергей открывает `/spooling/engineering-transmittals`
2. Видит badge "1 new transmittal" над таблицей
3. Top row: `T-2026-018 · Eng Team Unit-2 · 23 ISOs · Received 2026-05-19 ·
   status Pending`
4. Click на row → side panel со preview:
   - Source team: Engineering Unit-2 (Mehmet Yıldız, lead drafter)
   - Iso count: 23
   - Rev breakdown: 18 × R0 (new) + 5 × R1 (revision)
   - Target shop completion: 2026-08-15
   - SpoolGen folder link: `\\network\spoolgen\T-2026-018\`
5. Сергей просматривает preview — checks количество, sample iso #
6. Click "Accept" → ~700ms delay → toast _"T-2026-018 accepted · 23 isos
   created in workflow"_
7. Cascade: 23 новых iso появляются в `/spooling/iso-workflow` со
   статусом Received → доступны для checkout (B4)
8. 5 × R1 isos получают chip _"Revision — supersedes prior R0"_; system
   автоматически переводит старые R0 versions в Superseded statе
9. Notification создаётся: _"T-2026-018: 23 ISOs received from Engineering
   Unit-2 — 5 revisions affect existing spool work"_
10. Сергей переходит в `/spooling/iso-workflow`, filtering by
    "Recently received" → видит 23 новых rows → начинает checkout
    process (B4 — assign к spooler'ам своей команды)

**Edge cases (status-conditional):**

- **Rev conflict на already-spooled iso**: если один из 5 × R1 isos
  ссылается на iso, который уже spooled и transmitted в shop'е — на шаге
  4 (preview) banner _"3 of 5 revisions affect isos already in fabrication
  (PL-PG-008, PL-PG-012, PL-PG-019) — review impact before accepting"_.
  Сергей может либо: (a) accept anyway → cascade scrap/rework flow в
  Fabrication module (planned for Track K phase 2), либо (b) Hold
  transmittal для consultation с PM. Сегодня этот warning не surface'ится.

- **Missing SpoolGen files**: если на network folder часть файлов
  отсутствуют (e.g. 23 iso в transmittal metadata, но в folder только
  19 SpoolGen outputs) — на шаге 5 banner _"4 of 23 isos have missing
  SpoolGen files in network folder — accept partial?"_. Можно accept
  partial (19 ingestable + 4 Pending Files status) или reject whole.

- **Duplicate transmittal**: если T-2026-018 уже был accepted ранее
  (engineering случайно ре-issue'нул то же metadata) — система определяет
  по transmittal #, показывает на шаге 5 _"This transmittal was accepted
  on 2026-05-15 by [Sergey] — view audit log?"_. Accept button disabled,
  предлагается "View existing isos" CTA.

- **Engineering hold transferred**: если в transmittal flagged один из
  isos как "Engineering hold pending — do not spool yet" — после accept,
  этот iso появляется в /iso-workflow с уже applied Engineering hold
  (B6). Не идёт в checkout queue до release.

- **Transmittal partial-receive**: команда engineering bulk-merged 2
  weeks работы в один transmittal. Сергей хочет принять только Unit-2
  isos (18), отложить Unit-3 isos (5). На preview можно multi-select +
  "Accept selected only" — остальные остаются Pending в transmittal.
  Planned для Track K phase 2.

- **Marian material check on receipt** (если B10 done first): автоматически
  попробует match iso # против Marian completion status — если 5 из 23
  isos имеют material "TO COMPLETE" в Marian → chip _"Material pending —
  iso ingest OK, but spool scheduling может ждать material"_. Soft info,
  не block.

---

#### Story для B5: Multi-round checking — iterative reject / fix cycle

**Context:** Spooler Маша (mid drafter) закрыла spooling для iso
ISO-PG-007 в среду вечером — разрезала на 4 spools, выгрузила SpoolGen
output. Checker — senior Влад. В четверг утром Влад открывает queue
для verification.

**Happy path (planned post-Track K):**

1. Влад открывает `/spooling/iso-workflow` filter "Awaiting Check"
2. Видит ISO-PG-007 row: spooled by Маша, last check-in 2026-05-18
   18:42, Tot. Round 0
3. Row click → review panel справа
4. Preview spools: SP-PG-007-A (4 welds) / SP-PG-007-B (3 welds) /
   SP-PG-007-C (5 welds) / SP-PG-007-D (2 welds) = 14 welds total
5. Влад замечает: SP-PG-007-D имеет 2 welds — оба на flange faces.
   Это плохой split — spool с 0 inline welds (только flange ends)
   нецелесообразен. Лучше merge'нуть в C
6. Click "Reject" → comment field → пишет: _"SP-PG-007-D has only flange
   welds — merge into SP-PG-007-C, target spool size 6–7 welds per
   capacity guidelines. See SOP-2024-12 section 4.2."_
7. Click "Send back to spooler" → ~700ms → toast _"ISO-PG-007 returned to
   Маша · Tot. Round → 1"_
8. ISO-PG-007 уходит из Влада'овой queue → возвращается в queue Маши
   с chip "Rework — Round 1"
9. Маша fixes (rerun SpoolGen, re-upload output) → check-in снова
10. На следующий день Влад re-reviews → теперь 3 spools (D merged into
    C), Влад accepts → click "Approve" → ~700ms → toast _"ISO-PG-007
    approved · ready for outbound batch"_
11. ISO-PG-007 переходит в Released bucket → доступен для composition в
    Spooling Transmittal (B7)
12. Notification создаётся: _"ISO-PG-007 released after 2 checking rounds
    — ready for Spooling Transmittal"_

**Edge cases (status-conditional):**

- **High round count (>3)**: если Tot. Round достигает 4+ — Влад
  получает warning banner _"This iso has 3 prior rounds — consider
  escalating to Spooling Team lead for root cause review"_. Не block,
  но visibility. Crystallizes pattern — обычно либо spooler не понимает
  spec, либо engineering iso is inherently problematic. Planned для
  Track K phase 2.

- **Spooler self-detected issue**: иногда Маша сама находит issue после
  check-in (e.g. забыла weld) → перед review клик на свой iso → "Recall
  for fix" button → iso возвращается ей без incrementing Tot. Round.
  Soft path, чтобы не наказывать спулера за проактивность.

- **Engineering hold during checking**: если во время checking process
  engineering reissue iso (new rev coming) — на шаге 3 (review panel)
  banner _"Engineering hold activated 2 hours ago by [name] — revision
  R1 incoming, expected 2026-05-22. Continue checking R0 or pause?"_.
  Checker может pause review → iso в Engineering hold queue до release.

- **Material check fail revealed in check**: при review checker замечает,
  что один из spool'ов содержит heat number которого нет в project list
  (Marian sync gap) → reject comment _"Heat HT-9123 not in material
  list — confirm with Materials team before proceed"_. Это soft block —
  можно проceed после материал manually добавлен в Admin → Material list
  (CC-28 BLOCK pattern downstream).

- **Bolting / Supports preview mismatch**: SpoolGen output включает
  weld.txt + trace.txt + bolt.txt + supp.txt. Если bolting count
  на iso (от bolt.txt) не сходится с visual count на iso PDF → checker
  flag'ает в reject _"3 flange joints in bolt.txt but 4 visible in
  iso PDF — re-run SpoolGen или fix manually"_. Это data quality issue
  upstream от SpoolGen, не checker может решить сам.

- **Accept-with-remark for known issues**: если checker accept'ит iso,
  но с known minor issues (e.g. spool size немного outside guidelines,
  but acceptable for specific shop capability) → "Accept with remark"
  button → comment mandatory → iso goes к Released, но history entry
  preserved _"Approved with remark: SP-PG-007-A is 8 welds (guideline
  6–7), acceptable for FabShop Alpha capability"_. Helps downstream
  if questions arise.

- **Checker overruled by Spooling Team lead**: на больших проектах
  checker может escalate borderline cases → lead Сергей реally accept
  rejection или override. Audit trail captures: original checker
  decision + lead override + reason. Multi-level review. Planned для
  enterprise scale, не для MVP demo.
