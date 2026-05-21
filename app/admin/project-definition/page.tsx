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

const fields = [
  "Activity Code",
  "Project Title",
  "Owner",
  "Contractor",
  "Owner Logo",
  "Contractor Logo",
  "Maximum Transit Time",
];

export default function ProjectDefinitionPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Project Definition"
        description="Create and configure project identity, parties, logos, and maximum transit timing."
      />

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Project setup fields</CardTitle>
          <CardDescription>
            Static demo layout for project creation settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => (
              <div
                key={field}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="text-xs font-medium text-slate-800">{field}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Project definition placeholder
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AdminDemoTable
        columns={["Project", "Activity Code", "Owner", "Contractor", "Status"]}
        rows={[
          {
            Project: "PipeQC Demo Project",
            "Activity Code": "PQ-001",
            Owner: "EasyPlant Owner",
            Contractor: "Main EPC Contractor",
            Status: "Available",
          },
          {
            Project: "Expansion Area A",
            "Activity Code": "PQ-002",
            Owner: "Demo Owner",
            Contractor: "Demo Contractor",
            Status: "Template",
          },
        ]}
      />
    </div>
  );
}
