import { withProject } from "@/components/pipeqc/project-url"
import { linkFrom, safeReturnPath } from "@/components/pipeqc/workspace-model"

export function materialReferenceHref(input: {
  activityCode: string
  spoolRevisionId: string
  bomRowId: string
  identCode: string
  from: string
}): string {
  const params = new URLSearchParams({
    ref: "pml",
    spool: input.spoolRevisionId,
    material: input.bomRowId,
    ident: input.identCode,
  })
  return linkFrom(
    withProject(`/admin/project-referential?${params.toString()}`, input.activityCode),
    safeReturnPath(input.from) ?? "/",
  )
}
