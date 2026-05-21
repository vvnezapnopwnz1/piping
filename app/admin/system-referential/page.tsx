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

const references = [
  {
    title: "Material Type",
    description: "Types of materials used across projects.",
  },
  {
    title: "Film Quantity per Diameter",
    description: "RT film quantity matrix by diameter and thickness.",
  },
  {
    title: "UT Calculation",
    description: "UT coefficients by diameter and rating.",
  },
  {
    title: "Torquing Requirement",
    description: "Torquing method used by flange management.",
  },
];

export default function SystemReferentialPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · System Referential"
        description="Cross-project referentials maintained at system-admin scope."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {references.map((reference) => (
          <Card key={reference.title} className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">{reference.title}</CardTitle>
              <CardDescription>{reference.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminDemoTable
                columns={["Code", "Description", "Status"]}
                rows={[
                  {
                    Code: "REF-001",
                    Description: reference.description,
                    Status: "Demo",
                  },
                  {
                    Code: "REF-002",
                    Description: "Additional placeholder row",
                    Status: "Demo",
                  },
                ]}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
