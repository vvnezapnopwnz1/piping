import {
  AdminCardGrid,
  AdminPageHeader,
} from "@/components/admin/admin-module-ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Overview"
        description="Setup workspace for project definition, master data, access mapping, and import configuration."
      />

      <AdminCardGrid
        items={[
          {
            title: "Project Definition",
            description: "Create and configure the active project record.",
            href: "/admin/project-definition",
          },
          {
            title: "System Referential",
            description:
              "Maintain cross-project references for system-admin scope.",
            href: "/admin/system-referential",
          },
          {
            title: "Project Referential",
            description:
              "Manage project-level master data used by all modules.",
            href: "/admin/project-referential",
          },
          {
            title: "Access Rights",
            description:
              "Review roles, PipeQC mappings, and subcontractor scoping.",
            href: "/admin/access-rights",
          },
          {
            title: "Import Settings",
            description: "Prepare Excel/template import configuration.",
            href: "/admin/import-settings",
          },
        ]}
      />

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Setup sequence</CardTitle>
          <CardDescription>
            Recommended order for configuring PipeQC before operational use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm text-slate-700 md:grid-cols-4">
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Step 1
              </div>
              Project definition
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Step 2
              </div>
              System and project referentials
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Step 3
              </div>
              Access rights
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Step 4
              </div>
              Import settings
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
