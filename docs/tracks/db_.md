erDiagram
%% Уровень тестирования и сдачи
TEST_PACK ||--o{ ISO_DRAWING : "состоит из"
TEST_PACK ||--o{ PUNCH_ITEM : "содержит дефекты"

    %% Уровень чертежей
    ISO_DRAWING ||--|{ SPOOL : "разбивается на"
    ISO_DRAWING ||--o{ WELD : "содержит монтажные стыки (Field)"

    %% Уровень катушек (цех)
    SPOOL ||--|{ MATERIAL_PIECE : "собирается из"
    SPOOL ||--o{ WELD : "содержит цеховые стыки (Shop)"

    %% Уровень контроля качества
    WELD }o--o| NDE_BATCH : "входит в партию рентгена"

    %% Описание таблиц (полей)
    TEST_PACK {
        string test_pack_no PK
        string status "Например: Hydrotested"
        string subsystem_id FK
    }

    PUNCH_ITEM {
        string punch_id PK
        string category "A, B, C"
        string description
        string test_pack_no FK
    }

    ISO_DRAWING {
        string iso_no PK
        string revision
        string status
        string test_pack_no FK
    }

    SPOOL {
        string spool_no PK
        string iso_no FK
        string status "Material Check / Fabricated"
    }

    MATERIAL_PIECE {
        string piece_id PK
        string spool_no FK
        string heat_number "Серийный номер плавки"
        boolean has_nc "Есть ли несоответствие"
    }

    WELD {
        string weld_no PK
        string iso_no FK
        string spool_no FK "NULL если это Field Weld"
        string type "SHOP (цех) или FIELD (улица)"
        string welder_id "Кто варил"
        string nde_batch_id FK
    }

    NDE_BATCH {
        string batch_id PK
        date request_date
        string status "Accepted / Rejected"
    }
