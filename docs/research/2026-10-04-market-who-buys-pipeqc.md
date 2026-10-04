# PipeQC: кто такое ПО делает, кто покупает, кому продавать (2026-10-04)

Рабочая записка для инвесторского лендинга. Источники — в конце; всё, что не подтверждено источником,
помечено как гипотеза.

## 1. Как Technip использовал Easy Piping

- **Easy Piping — модуль внутреннего набора EasyPlant** компании Technip (сейчас Technip Energies).
  Первый слайд их обучающего курса (`1.PSMS overview_1511017.pptx`, слайд 4): «Easy plant is a
  Technip in-house IT tool». В набор входят Easy site management (HSE, качество, прогресс, сдача),
  Easy piping и Easy structure. Интерфейсы — с 3D-проектированием, SmartPlant Materials (Marian) и
  инструментом планирования.
- **Не продаётся.** Technip Energies описывает EasyPlant как «our in-house construction web-based
  application», к которой получают доступ субподрядчики и заказчики, а свои системы строительства —
  как то, что «differentiate us from our competitors». [ten.com]
- **На проектах у системы есть свои люди**: вакансии «EasyPiping Operator / Coordinator», которые
  ведут данные и готовят отчёты для планирования. [Glassdoor, LinkedIn]
- **Есть мобильные приложения** в Google Play: EasyPlant Piping Management (учёт катушек офлайн),
  Punch List, QC Inspections.

**Вывод.** Крупнейший EPC-подрядчик счёл задачу настолько важной, что держит собственную систему и
штат операторов под неё, и подаёт её заказчику как преимущество. Средний подрядчик построить такое
не может — это и есть окно.

## 2. Кто продаёт похожее ПО (спрос подтверждён тем, что за это платят)

| Класс | Продукты | Что закрывают |
|---|---|---|
| Сварка и QC на EPC-проектах | WeldTracked, MatriX (Pinnacle), WeldTrace, Welding Manager, QC Database | журнал стыков, NDE, ремонты, гидроиспытание, сдача |
| Сварочное производство | Kemppi WeldEye (Финляндия): от €490/год, процедуры и квалификации — €89/польз./мес | WPS, квалификации сварщиков, данные со сварочных аппаратов |
| Цех катушек | PipeCloud (Финляндия), SpoolCAD / PypeServer | планирование и учёт изготовления |
| Сквозной контроль EPC | EPCPROMAN (Индия): 250+ компаний, в т. ч. Technip (Кочи), IOCL, Petronas, Worley; SaaS и on-prem | изготовление и монтаж катушек, материалы, план |
| Completions / Test Pack | Hexagon Smart Completions, Omega 365, Orbit, RX1, CommUp | механическая готовность, punch list, пакеты испытаний, сдача |
| Остановочные ремонты | Cleopatra Enterprise (Нидерланды) | сварка и NDE на STO |
| Вверх по цепочке | Hexagon Intergraph Spoolgen | изометрии и раскрой на катушки. **Не конкурент, а источник данных**: PipeQC импортирует его формат |

**Чем PipeQC отличается от каждого из них** (гипотеза, проверять на демо):
- западные продукты закрывают одно звено (сварку, или цех, или completions), PipeQC — цепочку от
  изометрии до гидроиспытания в одной базе;
- правила проекта не советуют, а запрещают (материал не из PML, сварщик без допуска);
- каскад брака NDE (ремонт + трассеры + сплошной контроль сварщика) — следствие одной записи;
- изоляция субподрядчика на уровне строк базы.

## 3. Россия, Казахстан, СНГ

- **Специализированного продукта для технологических трубопроводов в открытом поиске не найдено.**
  Типичная связка — бумажные журналы по формам СП 77.13330 / РД 153-34.1-003-01, Excel и общий
  учёт стройки в «1С:Подрядчик строительства» (КС-2, КС-3, М-29 — без стыков и NDE). Это «не нашёл»,
  а не «не существует»: нужно проверить у практиков.
- **Капитальные программы Казахстана** (из `kz-sales/2026-09-18-market-research-who-and-how.md` и
  пресс-релизов):
  - расширение трёх НПЗ, оценка 3,5–5,8 млрд долларов; часть EPC — китайские подрядчики;
  - КГПН (полиэтилен, Атырау): генподрядчик Sinopec Engineering, казахстанские субподрядчики
    монтажа трубопроводов — «Аралсервис», «ХДС», «КазСтройОперейтинг», «СтальМонтажТрейд» и др.;
  - ГПЗ Кашаган и Карачаганак, QazaqGaz;
  - этановый и пропановый трубопроводы KMG PetroChem (EPC — консорциум CPPE, СМР с IV кв. 2026,
    приоритет казахстанского содержания). **Оговорка:** это магистральные трубопроводы, там нет
    катушек и цеха — PipeQC подходит им хуже, чем заводам;
  - АЭС «Балхаш»: не менее 25 % СМР — казахстанские подрядчики.
- **Узбекистан**: 782 крупных проекта на 52 млрд долларов в 2026 (из той же записки).

## 4. Кому продавать — гипотезы по убыванию уверенности

1. **Казахстанский субподрядчик монтажа на заводском проекте** под иностранным EPC (Sinopec, CPPE и
   др.). Он обязан сдавать генподрядчику исполнительную документацию по стыкам и испытаниям, своей
   системы у него нет, а требования казахстанского содержания тянут его в проекты. Боль — документы
   и сдача пакетов.
2. **Средний EPC- или генподрядчик**, у которого нет своей «EasyPlant». Боль — сводная картина по
   субподрядчикам.
3. **Заказчик и его технадзор** (КМГ, операторы ГПЗ): хочет видеть качество подрядчика без сводных
   Excel. Покупает реже, но может **требовать** систему от подрядчиков — сильный канал.
4. Цеха изготовления катушек и лаборатории NDE — узкие участки, вход через партнёрство.

Проверять интервью по правилам Mom Test: спрашивать, как они сдавали последний пакет испытаний и
сколько это заняло, а не «купили бы вы».

## 5. Риски, о которых спросит инвестор

- **Происхождение.** PipeQC воспроизводит модули внутреннего инструмента Technip, в репозитории лежат
  их обучающие материалы. Инвестор спросит, в чём отличие и нет ли претензий на интеллектуальную
  собственность. Нужен ответ юриста до раунда. На лендинге — ни названия Easy Piping, ни Technip,
  ни скриншотов их интерфейса.
- **Нормативка СНГ.** Термины PipeQC международные (WPS, NDE, test pack, ASME). Для местных
  подрядчиков нужны русские формы исполнительной документации — это пункт роадмапа, а не готовое.
- **Язык интерфейса** — английский.

## Источники

- Technip Energies, Construction management — https://www.ten.com/en/capabilities-and-services/epc/construction-management
- EasyPlant Piping Management (Google Play) — https://play.google.com/store/apps/details?id=com.technip.spooltracking&hl=en
- EasyPiping Coordinator (Glassdoor) — https://www.glassdoor.com/Reviews/Employee-Review-Technip-Energies-RVW84771952.htm
- EPCPROMAN — https://epcproman.com/
- WeldTracked — https://weldtracked.com/
- MatriX by Pinnacle — https://matrixbypinnacle.com/products/welding-traceability
- Cleopatra Enterprise — https://cleopatraenterprise.com/weld-management/
- WeldTrace — https://www.weldtrace.com/welding-projects
- Kemppi WeldEye, цены — https://www.weldeye.com/pricing
- PipeCloud — https://pipecloud.fi/
- Hexagon PFC и Spoolgen — https://hexagonppm.com/products/pfc-product-family
- Hexagon Smart Completions — https://aliresources.hexagon.com/construction-completions
- Omega 365 Completion Management — https://omega365.com/software/omega365/completion-management
- Orbit — https://www.occms.com/orbit/orbit-software/
- 1С:Подрядчик строительства — https://solutions.1c.ru/catalog/stroy
- Журнал по сварке трубопроводов, СП 77.13330.2016 — https://id-prosto.ru/forms/sp-77-13330/welding-logbook
- KMG PetroChem, EPC-контракт — https://www.kmg.kz/ru/press-center/press-releases/petrochem-epc-kontrakt-truboprovody-etan-propan/
- КГПН, монтаж трубопроводов — https://www.anpz.kz/press_center/news/74376/-stroitelstvo-kgpn-montazh-truboprovodov/
- Модернизация НПЗ РК — https://www.itext.kz/blog/perevod-dokumentatsii-modernizatsiya-npz-atyrau-pavlodar-shymkent
