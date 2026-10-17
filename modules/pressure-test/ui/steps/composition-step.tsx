"use client"

import type { TestPackCatalogRow } from "../../infrastructure/supabase-pressure-test-repository"
import { TestPackCompositionEditor } from "../test-pack-composition-editor"
import { TestPackDefinitionEditor } from "../test-pack-definition-editor"

/** The pack's parameters (the former "Definition" view) and its isometrics, one after the other. */
export function CompositionStep({ projectId, pack, canManage, onChanged }: { projectId: string; pack: TestPackCatalogRow; canManage: boolean; onChanged: () => void }) {
  return (
    <div className="space-y-6">
      <TestPackDefinitionEditor projectId={projectId} pack={pack} canManage={canManage} dataCurrent onUpdated={onChanged} onArchived={onChanged} />
      <TestPackCompositionEditor projectId={projectId} pack={pack} canManage={canManage} dataCurrent onComposed={onChanged} />
    </div>
  )
}
