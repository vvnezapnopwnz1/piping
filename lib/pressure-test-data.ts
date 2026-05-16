export interface ActivityStats {
  ready: number;
  ongoing: number;
  done: number;
}

export type ActivityHealth = "on-track" | "behind" | "critical";

export interface PressureTestActivity {
  id: "line-check" | "item-clearance" | "blinding" | "testing" | "reinstatement";
  name: string;
  description: string;
  iconKey: string;
  stats: ActivityStats;
  health: ActivityHealth;
  hasPreparation: boolean;
}

export interface Alert {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface KpiData {
  testPacksReady: number;
  testPacksTotal: number;
  testPacksReadyPct: number;
  testPacksWeekDelta: string;
  pressureTestsThisWeek: number;
  pressureTestsStatus: "on track" | "behind" | "critical";
  pressureTestsVsLastWeek: string;
  itemsOutstanding: number;
  itemCategoryX: number;
  itemCategoryY: number;
  itemCategoryZ: number;
  itemsBlockingRft: number;
  reinstatementBacklog: number;
  reinstatementCatY: number;
  reinstatementCatZ: number;
}

export const PRESSURE_TEST_ACTIVITIES: PressureTestActivity[] = [
  {
    id: "line-check",
    name: "Line Check",
    description: "Visual inspection before pressure test",
    iconKey: "ClipboardCheck",
    stats: { ready: 23, ongoing: 8, done: 64 },
    health: "on-track",
    hasPreparation: true,
  },
  {
    id: "item-clearance",
    name: "Item Clearance",
    description: "Punch items X/Y/Z resolution",
    iconKey: "ListChecks",
    stats: { ready: 15, ongoing: 12, done: 47 },
    health: "behind",
    hasPreparation: true,
  },
  {
    id: "blinding",
    name: "Blinding",
    description: "Install blinds for test isolation",
    iconKey: "Shield",
    stats: { ready: 12, ongoing: 5, done: 38 },
    health: "on-track",
    hasPreparation: true,
  },
  {
    id: "testing",
    name: "Testing & ProComm",
    description: "Hydrostatic/pneumatic test execution",
    iconKey: "Gauge",
    stats: { ready: 8, ongoing: 3, done: 29 },
    health: "on-track",
    hasPreparation: false,
  },
  {
    id: "reinstatement",
    name: "Reinstatement",
    description: "Restore flanges after test",
    iconKey: "RotateCcw",
    stats: { ready: 18, ongoing: 6, done: 22 },
    health: "behind",
    hasPreparation: true,
  },
];

export const KPI_DATA: KpiData = {
  testPacksReady: 47,
  testPacksTotal: 124,
  testPacksReadyPct: 38,
  testPacksWeekDelta: "+8 this week",
  pressureTestsThisWeek: 12,
  pressureTestsStatus: "on track",
  pressureTestsVsLastWeek: "vs 9 last week",
  itemsOutstanding: 89,
  itemCategoryX: 23,
  itemCategoryY: 41,
  itemCategoryZ: 25,
  itemsBlockingRft: 12,
  reinstatementBacklog: 156,
  reinstatementCatY: 98,
  reinstatementCatZ: 58,
};

export const ALERTS: Alert[] = [
  {
    id: "alert-1",
    severity: "high",
    message: "Test pack TP-CW-002 line check overdue by 4 days",
  },
  {
    id: "alert-2",
    severity: "high",
    message: "12 Cat X items blocking 3 test packs from RFT",
  },
  {
    id: "alert-3",
    severity: "medium",
    message: "Reinstatement team Alpha unassigned this week",
  },
  {
    id: "alert-4",
    severity: "low",
    message: "TP-PG-001 testing rescheduled to next week",
  },
];

export const ITEM_CATEGORIES = {
  X: { outstanding: 23, total: 84, label: "Before Test" },
  Y: { outstanding: 41, total: 96, label: "After Test, Before PMC" },
  Z: { outstanding: 25, total: 58, label: "After PMC" },
};
