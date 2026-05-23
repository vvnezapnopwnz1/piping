import { AdminPageHeader } from "@/components/admin/admin-module-ui";
import { AccessRightsView } from "@/components/admin/access-rights-view";

export default function AccessRightsPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Access Rights"
        description="User × role × scope matrix for the demo project. Configuration display only — not live authentication."
      />
      <AccessRightsView />
    </div>
  );
}
