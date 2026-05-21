import { Suspense } from "react";

import { AdminTabs } from "../admin-tabs";
import {
  AdminPageHeader,
  ReferentialGroup,
} from "@/components/admin/admin-module-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const groups = {
  general: [
    "Subcontractor List",
    "Progress Weight Factor",
    "Area Classification",
    "PDS Area / Subcontractor",
  ],
  spooling: [
    "Service Class / Material Type",
    "Weld Type List",
    "NDE Matrix",
    "Rework Code",
    "Thickness",
    "Project Piping Material List",
    "Spooling Material Type",
    "Spooling Piping Class Material",
    "Spooling Check List",
  ],
  fabrication: [
    "WPS List",
    "Welder Qualification",
    "Joint Category Definition",
    "Jointer List",
    "Location Category",
    "Location",
    "Unit Classification",
  ],
  testpack: [
    "Unit of Time Reference",
    "Blinding Team",
    "Finishing Team",
    "Reinstatement Team",
    "System",
    "Sub System",
    "Line Checker Team",
    "Pressure Unit",
    "Line Service",
  ],
  tracking: [
    "Devices",
    "PDA Users",
    "Location Category",
    "Location",
    "Maximum Transit Time reference note",
  ],
  painting: ["RAL Code", "Paint Code Matrix"],
};

export default function ProjectReferentialPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Project Referential"
        description="Project-level master data for spooling, fabrication, erection, testpack, tracking, and painting."
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="spooling">Spooling</TabsTrigger>
          <TabsTrigger value="fabrication">Fabrication & Erection</TabsTrigger>
          <TabsTrigger value="testpack">Testpack</TabsTrigger>
          <TabsTrigger value="tracking">Spool Tracking</TabsTrigger>
          <TabsTrigger value="painting">Painting</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <ReferentialGroup
            title="General"
            description="Common project master data used across modules."
            items={groups.general}
          />
          <Suspense
            fallback={
              <div className="h-40 rounded-xl border border-slate-200 bg-white" />
            }
          >
            <AdminTabs />
          </Suspense>
        </TabsContent>
        <TabsContent value="spooling" className="mt-4">
          <ReferentialGroup
            title="Spooling"
            description="Spooling and material master data."
            items={groups.spooling}
          />
        </TabsContent>
        <TabsContent value="fabrication" className="mt-4">
          <ReferentialGroup
            title="Fabrication & Erection"
            description="Welding, qualifications, joint, and location references."
            items={groups.fabrication}
          />
        </TabsContent>
        <TabsContent value="testpack" className="mt-4">
          <ReferentialGroup
            title="Testpack"
            description="Teams, systems, pressure units, and line services."
            items={groups.testpack}
          />
        </TabsContent>
        <TabsContent value="tracking" className="mt-4">
          <ReferentialGroup
            title="Spool Tracking"
            description="Device, PDA, and location references for tracking flows."
            items={groups.tracking}
          />
        </TabsContent>
        <TabsContent value="painting" className="mt-4">
          <ReferentialGroup
            title="Painting"
            description="Painting color and paint code references."
            items={groups.painting}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
