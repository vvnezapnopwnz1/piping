import {
  AdminPageHeader,
  ImportPlaceholder,
} from "@/components/admin/admin-module-ui";

const imports = [
  "Weld Thickness / Flange",
  "Import NDE Matrix",
  "Import Project Piping Material List",
  "Spooling Images ZIP",
  "Spooling Material Type",
  "Spooling Class Material",
];

export default function ImportSettingsPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Import Settings"
        description="Excel/template import configuration with planned upload placeholders."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {imports.map((item) => (
          <ImportPlaceholder key={item} title={item} />
        ))}
      </div>
    </div>
  );
}
