import { AdminPageHeader } from "@/components/admin/admin-module-ui";
import { ImportSettingsView } from "@/components/admin/import-settings-view";

export default function ImportSettingsPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Import Settings"
        description="Excel template dry-run imports for project referential data."
      />
      <ImportSettingsView />
    </div>
  );
}
