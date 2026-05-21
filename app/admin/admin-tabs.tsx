"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamsTab } from "@/components/admin/teams-tab";
import { SubcontractorsTab } from "@/components/admin/subcontractors-tab";
import { WelderQualificationsTab } from "@/components/admin/welder-qualifications-tab";
import { WpsTab } from "@/components/admin/wps-tab";
import { NdeMatrixTab } from "@/components/admin/nde-matrix-tab";
import { ReworkCodesTab } from "@/components/admin/rework-codes-tab";
import { JointCategoriesTab } from "@/components/admin/joint-categories-tab";

const TAB_VALUES = [
  "teams",
  "subcontractors",
  "welder-qualifications",
  "wps",
  "nde-matrix",
  "rework-codes",
  "joint-categories",
] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isValidTab(value: string): value is TabValue {
  return TAB_VALUES.includes(value as TabValue);
}

export function AdminTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") ?? "";
  const activeTab: TabValue = isValidTab(tabParam) ? tabParam : "teams";

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  // Ensure URL reflects default tab on first load
  useEffect(() => {
    if (!tabParam || !isValidTab(tabParam)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "teams");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [tabParam, searchParams, router, pathname]);

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="overflow-x-auto whitespace-nowrap w-full">
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
        <TabsTrigger value="welder-qualifications">
          Welder Qualifications
        </TabsTrigger>
        <TabsTrigger value="wps">WPS</TabsTrigger>
        <TabsTrigger value="nde-matrix">NDE Matrix</TabsTrigger>
        <TabsTrigger value="rework-codes">Rework Codes</TabsTrigger>
        <TabsTrigger value="joint-categories">Joint Categories</TabsTrigger>
      </TabsList>
      <TabsContent value="teams" className="mt-4">
        <TeamsTab />
      </TabsContent>
      <TabsContent value="subcontractors" className="mt-4">
        <SubcontractorsTab />
      </TabsContent>
      <TabsContent value="welder-qualifications" className="mt-4">
        <WelderQualificationsTab />
      </TabsContent>
      <TabsContent value="wps" className="mt-4">
        <WpsTab />
      </TabsContent>
      <TabsContent value="nde-matrix" className="mt-4">
        <NdeMatrixTab />
      </TabsContent>
      <TabsContent value="rework-codes" className="mt-4">
        <ReworkCodesTab />
      </TabsContent>
      <TabsContent value="joint-categories" className="mt-4">
        <JointCategoriesTab />
      </TabsContent>
    </Tabs>
  );
}
