import { labels, pack } from "./register-fixtures.test"
import type { TestPackDocumentRow } from "./report"
import type { DossierLabels, TestPackDossierSnapshot } from "./test-pack-dossier"

/** Russian dossier labels and a tested pack with two lines, for the dossier tests. */
export const dossierLabels: DossierLabels = {
  ...labels,
  columns: { ...labels.columns },
  sections: {
    pack: "Тест-пакет",
    act: "Акт испытания трубопроводов на прочность и герметичность (заготовка)",
    isos: "Состав",
    weldHistory: "Weld History",
    nde: "NDE",
    punch: "Замечания X",
  },
  facts: {
    testPack: "Тест-пакет", system: "Система", subsystem: "Подсистема", lineService: "Среда линии",
    medium: "Среда испытания", testPressure: "Давление испытания", location: "Место", composition: "Состав",
    rftOn: "Готов к испытанию", testingStarted: "Испытание начато", testingCompleted: "Испытание окончено",
    precommissioning: "Пусконаладка завершена", testDate: "Дата испытания",
  },
  composition: (isos, welds) => `${isos} ISO, ${welds} стыков`,
  act: {
    groups: { pipeline: "Трубопровод", operating: "Рабочие параметры", strength: "Испытание на прочность", tightness: "Испытание на герметичность" },
    columns: {
      number: "№ п/п", pipeline: "Наименование трубопровода", pressure: "давление, МПа", temperature: "температура, °C",
      medium: "среда", testType: "вид", testPressure: "Ри, МПа", duration: "продолжительность, ч",
      pressureDrop: "падение давления, %", allowedDrop: "допустимое падение, %",
    },
    testType: { hydraulic: "гидравлическое", pneumatic: "пневматическое" },
    conclusion: "Заключение:",
    signatures: { position: "Должность", name: "ФИО", signature: "Подпись", date: "Дата" },
    footnote: "Структура формы — приложение 21 к Инструкции (приказ МЧС РК № 359 от 27.07.2021). Измеренные значения и подписи вносятся от руки.",
  },
}

export function dossier(overrides: Partial<Omit<TestPackDossierSnapshot, "pack">> & { pack?: Partial<TestPackDocumentRow> } = {}): TestPackDossierSnapshot {
  const { pack: packOverrides, ...rest } = overrides
  return {
    pack: pack(packOverrides),
    isos: [
      { isoNumber: "UPG-100-1001", revisionNumber: "R0", lineNumber: "L-100-001" },
      { isoNumber: "UPG-100-1002", revisionNumber: "R1", lineNumber: "L-100-002" },
    ],
    welds: [],
    nde: [],
    punch: [],
    ...rest,
  }
}
