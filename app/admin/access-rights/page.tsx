import {
  AdminDemoTable,
  AdminPageHeader,
} from "@/components/admin/admin-module-ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const roles = [
  "System Admin",
  "Project Admin",
  "Site Admin",
  "Project Editor",
  "QC Engineer",
  "NDE Inspector",
  "Project Manager",
  "Spooling Team",
  "PDA User",
  "Subcontractor",
  "Project Reader",
];

export default function AccessRightsPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Access Rights"
        description="Define access rights, PipeQC role mapping, and subcontractor scope rules."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Manual role list</CardTitle>
            <CardDescription>Roles described by the Admin module requirements.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {roles.map((role) => (
                <div
                  key={role}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800"
                >
                  {role}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <AdminDemoTable
          columns={["Manual Role", "PipeQC Role", "Note"]}
          rows={[
            {
              "Manual Role": "System Admin",
              "PipeQC Role": "system_admin",
              Note: "Implemented",
            },
            {
              "Manual Role": "Project Manager",
              "PipeQC Role": "project_manager",
              Note: "Implemented",
            },
            {
              "Manual Role": "QC Engineer",
              "PipeQC Role": "qc_engineer",
              Note: "Implemented",
            },
            {
              "Manual Role": "NDE Inspector",
              "PipeQC Role": "nde_inspector",
              Note: "Implemented",
            },
            {
              "Manual Role": "Spooling Team",
              "PipeQC Role": "spooling_team",
              Note: "Implemented",
            },
            {
              "Manual Role": "Subcontractor",
              "PipeQC Role": "subcontractor",
              Note: "Implemented with scope lock",
            },
            {
              "Manual Role": "Project Admin",
              "PipeQC Role": "system_admin",
              Note: "Merged",
            },
            {
              "Manual Role": "Site Admin",
              "PipeQC Role": "system_admin",
              Note: "Merged",
            },
            {
              "Manual Role": "PDA User",
              "PipeQC Role": "—",
              Note: "Not implemented",
            },
            {
              "Manual Role": "Project Reader",
              "PipeQC Role": "—",
              Note: "Not implemented",
            },
          ]}
        />
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-base text-amber-900">
            Subcontractor scope lock
          </CardTitle>
          <CardDescription className="text-amber-800">
            When the logged-in role is subcontractor, subcontractor dropdowns
            should be disabled and forced to the logged-in subcontractor.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
