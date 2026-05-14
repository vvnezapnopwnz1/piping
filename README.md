# PipeQC — Zustand Stores Integration Guide

Готовый набор stores для подключения интерактивности к прототипу.
Делает все CRUD-операции рабочими (на localStorage) и закладывает
основу для wow-моментов hero flow.

## Что внутри

```
store/
├── index.ts                  ← centralized exports
├── welds-store.ts            ← weld joints, status changes
├── batches-store.ts          ← NDE batches, KPIs, history
├── notifications-store.ts    ← home page notifications feed
└── demo-store.ts             ← demo mode toggle + master reset

lib/
└── welder-qualifications.ts  ← smart validation rules + NDE matrix logic
```

Все четыре stores персистятся в `localStorage` через Zustand `persist`
middleware. Перезагрузка страницы сохраняет состояние.

## Шаг 1: Установка зависимости

```bash
npm install zustand
```

Это единственная новая зависимость. Никаких peer-конфликтов с тем,
что у тебя уже есть.

## Шаг 2: Копирование файлов

Скопируй файлы из этого пакета в свой проект:

```
PipeQC/
├── store/
│   ├── index.ts
│   ├── welds-store.ts
│   ├── batches-store.ts
│   ├── notifications-store.ts
│   └── demo-store.ts
└── lib/
    └── welder-qualifications.ts
```

Импорты в файлах уже настроены под алиас `@/`, который у тебя есть в
`tsconfig.json`. Менять ничего не нужно.

## Шаг 3: Подключение к Weld Progress

Открой `app/fabrication/weld-progress/page.tsx` (или где у тебя
хранится WeldTable + DetailPanel). Найди место, где импортируется
`WELD_DATA` или статичный массив welds. Замени:

```typescript
// БЫЛО:
import { WELD_DATA } from "@/lib/weld-data"
const welds = WELD_DATA

// СТАЛО:
"use client"
import { useWeldsStore } from "@/store"

const welds = useWeldsStore((s) => s.welds)
const updateWeld = useWeldsStore((s) => s.updateWeld)
```

В компоненте `WeldDetailPanel`, замени локальный onSave на вызов store:

```typescript
// БЫЛО (примерно):
const handleSave = (updated: WeldJoint) => {
  onSave(updated) // прокидывается в локальный setState
}

// СТАЛО:
import { useWeldsStore } from "@/store"

const updateWeld = useWeldsStore((s) => s.updateWeld)

const handleSave = (updated: WeldJoint) => {
  updateWeld(updated.id, updated)
  // ...показать toast, закрыть панель
}
```

Сохрани, открой `/fabrication/weld-progress`, измени статус weld'а,
перезагрузи страницу. Если значение сохранилось — всё работает.

## Шаг 4: Smart Validation в WeldDetailPanel

В `components/weld-detail-panel.tsx` добавь импорт и валидацию:

```typescript
import { validateWelder } from "@/lib/welder-qualifications"

// Внутри компонента, после состояний:
const validation = validateWelder(
  formData.welderCode,
  formData.wpsNo,
  formData.materialType,
  formData.diaInch
)
```

Под полем "Welder code" покажи ошибку:

```tsx
{!validation.isValid && formData.welderCode && (
  <div className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    <span>{validation.message}</span>
  </div>
)}
```

Заблокируй кнопку Save:

```tsx
<Button onClick={handleSave} disabled={!validation.isValid}>
  Save
</Button>
```

В демо ты вводишь `WLD-099` на weld со стальным P91 или нержавейкой —
получаешь точную ошибку. **Это и есть wow-момент.**

## Шаг 5: Подключение к Fabrication Dashboard

В `components/fabrication-dashboard.tsx`:

```typescript
import { useWeldsKPIs } from "@/store"

const kpis = useWeldsKPIs()

// Теперь KPI карточки питаются из реальных подсчётов:
<KPICard
  title="Acceptance rate"
  value={`${kpis.acceptanceRate}%`}
  subtitle="Across all welds"
/>
<KPICard
  title="Rework queue"
  value={kpis.rework + kpis.rejected}
  subtitle="Welds requiring action"
/>
```

Теперь при изменении статуса weld'а на rework — Dashboard KPI
обновляется автоматически. Это **domino effect**.

## Шаг 6: Подключение NDE Batch Management

Когда сгенерируешь NDE экран по предыдущему промпту, замени там
mock-data на store:

```typescript
import {
  useBatchesStore,
  useBatchesKPIs,
  useBatch,
} from "@/store"

// В главном компоненте NDE:
const batches = useBatchesStore((s) => s.batches)
const kpis = useBatchesKPIs()

// В батч-детали:
const batch = useBatch(batchId)
const issueBatch = useBatchesStore((s) => s.issueBatch)
const receiveResults = useBatchesStore((s) => s.receiveResults)
const markForRework = useBatchesStore((s) => s.markForRework)
const closeBatch = useBatchesStore((s) => s.closeBatch)
```

## Шаг 7: Связка Weld Progress → NDE

В `WeldDetailPanel` добавь кнопку "Send to NDE":

```typescript
import { useBatchesStore } from "@/store"
import { determineNDEMethods } from "@/lib/welder-qualifications"
import { toast } from "sonner"

const createBatch = useBatchesStore((s) => s.createBatch)

const handleSendToNDE = async () => {
  // Искусственная задержка — выглядит реалистичнее, чем мгновенно
  await new Promise(r => setTimeout(r, 800))

  const { primary } = determineNDEMethods(weld)
  const batch = createBatch({
    method: primary,
    welds: [{
      weldId: weld.id,
      jointNo: weld.jointNo,
      spoolNo: weld.spoolNo,
      isoNo: weld.isoNo,
      diaInch: weld.diaInch,
      welderCode: weld.welderCode,
    }],
    createdBy: "QC-ENG-01",
    ndeMatrixRef: `NDE-M-${weld.materialType.replace(/\s/g, "")}`,
  })

  toast.success(`Batch ${batch.id} created`, {
    description: `${primary} examination · ${weld.jointNo}`,
    action: {
      label: "View in NDE",
      onClick: () => router.push(`/nde?batch=${batch.id}`),
    },
  })
}
```

Кликнул "Send to NDE" → переходишь в `/nde`, видишь созданный батч
вверху списка. **Тут второй wow-момент.**

## Шаг 8: Home page с уведомлениями

В `app/page.tsx`:

```typescript
"use client"

import Link from "next/link"
import { useUnreadNotifications } from "@/store"
import { AlertTriangle, AlertCircle, CheckCircle2, Info } from "lucide-react"

const ICON_MAP = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
}

const TONE_MAP = {
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-slate-200 bg-slate-50 text-slate-900",
}

export default function HomePage() {
  const notifications = useUnreadNotifications()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Good morning, QC Engineer</h1>
        <p className="text-sm text-muted-foreground">
          Here's what needs your attention today
        </p>
      </header>

      <section className="space-y-3">
        {notifications.map((n) => {
          const Icon = ICON_MAP[n.severity]
          return (
            <Link
              key={n.id}
              href={n.href ?? "#"}
              className={`flex items-start gap-3 rounded-lg border p-4 transition hover:shadow-sm ${TONE_MAP[n.severity]}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs opacity-80">{n.description}</p>
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
```

## Шаг 9: Demo Mode + Reset кнопка

В `components/pipeqc/top-nav.tsx` добавь кнопку для презентации:

```typescript
import { useDemoStore } from "@/store"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

// Внутри TopNav, рядом с другими действиями:
const resetAll = useDemoStore((s) => s.resetAll)
const demoMode = useDemoStore((s) => s.demoMode)

const handleReset = () => {
  resetAll()
  toast.success("Demo data reset", {
    description: "All stores hydrated to initial state",
  })
}

return (
  <header>
    {/* ... existing nav ... */}

    {demoMode && (
      <Badge variant="outline" className="ml-2 border-amber-300 bg-amber-50 text-amber-800">
        DEMO MODE
      </Badge>
    )}

    <Button variant="ghost" size="sm" onClick={handleReset} title="Reset demo data">
      <RefreshCw className="h-4 w-4" />
    </Button>
  </header>
)
```

Перед каждой демо-встречей жмёшь Reset — всё в исходном состоянии.

## Шаг 10: Sonner toast (если не подключён)

Используется в нескольких местах выше. Если у тебя ещё не подключён:

```bash
npx shadcn@latest add sonner
```

В `app/layout.tsx` добавь:

```typescript
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* ... */}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
```

## Проверка работоспособности

1. `npm run dev`
2. Открой `/fabrication/weld-progress`
3. Кликни на любой weld → side panel
4. Введи `WLD-099` в поле Welder → должен появиться красный warning
5. Меняй статус weld'а → Save → закрой панель → перезагрузи страницу
6. Статус сохранился? — Zustand работает
7. Открой `/nde` → должны быть seed-батчи
8. Создай batch из Weld Progress → перейди в /nde → batch там

Если все 8 шагов проходят — фундамент готов.

## Common gotchas

- **"useWeldsStore is not a function"** → не сделал `npm install zustand`
- **"localStorage is not defined"** → используешь store в server component.
  Добавь `"use client"` в начало файла страницы или компонента.
- **Состояние не сохраняется** → проверь, что `persist` middleware подключён
  (он подключён в файлах, не должно ломаться).
- **Старые данные при первом запуске после обновления типов** → открой
  DevTools → Application → Local Storage → удали ключи `pipeqc-*` и
  перезагрузись.

## Структура данных в localStorage

После запуска в localStorage появятся 4 ключа:
- `pipeqc-welds` — все welds + их статусы
- `pipeqc-batches` — NDE batches + history
- `pipeqc-notifications` — feed уведомлений
- `pipeqc-demo` — флаг demo mode + lastResetAt

Можно посмотреть содержимое через DevTools для отладки.
