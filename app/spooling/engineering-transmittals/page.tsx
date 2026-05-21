"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function EngineeringTransmittalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Engineering Transmittals
        </h1>
        <div className="bg-muted p-4 rounded-lg mt-4 text-sm text-muted-foreground">
          Здесь будут отображаться входящие transmittal'ы от инжиниринга (новые isos и revision updates). Каждый transmittal — это batch isos с metadata: rev #, дата release, source engineering team. После acceptance isos попадают в ISO Workflow на checkout spooler'ам.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incoming Transmittals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transmittal #</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Source (engineering team)</TableHead>
                <TableHead>ISO Count</TableHead>
                <TableHead>New / Revision</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  No transmittals received
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <div className="mt-4 text-sm text-muted-foreground italic text-center">
            Будет имплементировано в Track [TBD]. См. docs/research/presentation_findings.md § Iso lifecycle (CC-21).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
