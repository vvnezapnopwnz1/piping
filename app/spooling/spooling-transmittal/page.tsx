"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function SpoolingTransmittalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Spooling Transmittal
        </h1>
        <div className="bg-muted p-4 rounded-lg mt-4 text-sm text-muted-foreground">
          Outbound batches isos на site после Spooling release. Каждый batch получает Spl. Trans. No., группируется по target системе или PDS area, и формирует точку handoff на Fabrication. Это противоположный конец Spooling-pipeline от Engineering Transmittals.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outbound Transmittals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spl. Trans. No.</TableHead>
                <TableHead>Generated Date</TableHead>
                <TableHead>Target System / Area</TableHead>
                <TableHead>ISO Count</TableHead>
                <TableHead>Released By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  No transmittals generated
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <div className="mt-4 text-sm text-muted-foreground italic text-center">
            Будет имплементировано в Track [TBD].
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
