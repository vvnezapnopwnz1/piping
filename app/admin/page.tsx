"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("admin.overview");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
      />

      <AdminCardGrid
        items={[
          {
            title: t("cards.projectDefinition.title"),
            description: t("cards.projectDefinition.description"),
            href: "/admin/project-definition",
          },
          {
            title: t("cards.systemReferential.title"),
            description: t("cards.systemReferential.description"),
            href: "/admin/system-referential",
          },
          {
            title: t("cards.projectReferential.title"),
            description: t("cards.projectReferential.description"),
            href: "/admin/project-referential",
          },
          {
            title: t("cards.accessRights.title"),
            description: t("cards.accessRights.description"),
            href: "/admin/access-rights",
          },
          {
            title: t("cards.importSettings.title"),
            description: t("cards.importSettings.description"),
            href: "/admin/import-settings",
          },
        ]}
      />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">{t("sequence.title")}</CardTitle>
          <CardDescription>
            {t("sequence.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm text-foreground md:grid-cols-4">
            <li className="rounded-lg border border-border bg-muted p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {t("sequence.step1Label")}
              </div>
              {t("sequence.step1Text")}
            </li>
            <li className="rounded-lg border border-border bg-muted p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {t("sequence.step2Label")}
              </div>
              {t("sequence.step2Text")}
            </li>
            <li className="rounded-lg border border-border bg-muted p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {t("sequence.step3Label")}
              </div>
              {t("sequence.step3Text")}
            </li>
            <li className="rounded-lg border border-border bg-muted p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {t("sequence.step4Label")}
              </div>
              {t("sequence.step4Text")}
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
