# Демо-проект UPG-1 — порядок загрузки

1. Настройка проекта → Описание: создать проект UPG-1 (код, название, заказчик, подрядчик — лист «Ввести вручную»).
2. В терминале: npm run demo:project-setup -- --project UPG-1 --phase references
3. Настройка проекта → Импорт: файлы imports/01…05 по порядку.
4. Справочники проекта → NDE-матрица: ввести руками два правила CS300 с PWHT (лист «Ввести вручную»).
5. В терминале: npm run demo:project-setup -- --project UPG-1 --phase backdate-wps
6. Спулинг → Импорт: сначала error/weld.txt (ожидаем блокер), затем spooling/weld, trace, bolt, supp.
7. Test Packs → Импорт состава: imports/06-test-packs.xlsx.
8. Неделя 3: Спулинг → Импорт revision/*.txt и решения по ревизии.

Начало проекта: 2026-08-14.
