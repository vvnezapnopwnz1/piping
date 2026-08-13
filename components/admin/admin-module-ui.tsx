import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AdminCard = {
  title: string;
  description: string;
  href?: string;
  meta?: string;
};

type AdminTableRow = Record<string, string>;

export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export function AdminCardGrid({ items }: { items: AdminCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title} className="border-border">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
              {item.meta ? (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {item.meta}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          {item.href ? (
            <CardContent>
              <Button asChild variant="outline" size="sm" className="h-8">
                <Link href={item.href}>
                  Open
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

export function AdminDemoTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: AdminTableRow[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row[columns[0]]}-${index}`}
                className={
                  index % 2 === 0
                    ? "border-b border-border bg-white"
                    : "border-b border-border bg-muted/50"
                }
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    className="whitespace-nowrap px-3 py-2 text-xs text-foreground"
                  >
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReferentialGroup({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border bg-muted px-3 py-2"
            >
              <div className="text-xs font-medium text-foreground">{item}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Demo reference placeholder
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportPlaceholder({
  title,
  comingSoon,
}: {
  title: string
  comingSoon?: boolean
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>Excel/template import configuration.</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {comingSoon ? "Coming soon" : "Not implemented / planned"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted px-3 py-3">
          <div className="text-xs text-muted-foreground">Upload placeholder</div>
          <Button variant="outline" size="sm" disabled className="h-8">
            <Upload className="mr-2 h-3.5 w-3.5" />
            Select file
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
