import {
  evaluateDemoStand,
  type DemoPreflightReport,
  type DemoStandSnapshot,
} from "./preflight"

export interface DemoStandPort {
  prepareUsers(password: string): Promise<void>
  prepareProjects(): Promise<void>
  prepareAccess(): Promise<void>
  prepareSystemReferences(): Promise<void>
  prepareProjectReferences(preparedOn: Date): Promise<void>
  readSnapshot(): Promise<DemoStandSnapshot>
}

export async function prepareDemoStand(
  port: DemoStandPort,
  password: string,
  preparedOn: Date,
): Promise<DemoPreflightReport> {
  await port.prepareUsers(password)
  await port.prepareProjects()
  await port.prepareAccess()
  await port.prepareSystemReferences()
  await port.prepareProjectReferences(preparedOn)
  const snapshot = await port.readSnapshot()
  return evaluateDemoStand(snapshot)
}
