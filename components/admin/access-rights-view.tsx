"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ROLES, type Role } from "@/contexts/role-context"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import {
  useAdminStore,
  type AccessRightsRow,
} from "@/store/admin-store"

export function AccessRightsView() {
  const users = useAdminStore((s) => s.accessRights)
  const pdsAreas = useAdminStore((s) => s.pdsAreas)
  const subcontractors = useAdminStore((s) => s.subcontractors)
  const addAccessUser = useAdminStore((s) => s.addAccessUser)
  const updateAccessUser = useAdminStore((s) => s.updateAccessUser)
  const toggleAccessUserActive = useAdminStore((s) => s.toggleAccessUserActive)
  const { locked: pmLocked } = usePmWriteLock()

  const activePds = useMemo(
    () => pdsAreas.filter((a) => a.active),
    [pdsAreas]
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("qc_engineer")
  const [subId, setSubId] = useState("")

  const resetForm = () => {
    setFullName("")
    setEmail("")
    setRole("qc_engineer")
    setSubId("")
  }

  const handleAdd = () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Name and email are required")
      return
    }
    addAccessUser({
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      subcontractorId: role === "subcontractor" ? subId || undefined : undefined,
      pdsAreaCodes:
        role === "subcontractor" && subId
          ? activePds
              .filter((a) => a.assignedSubCode === subId)
              .map((a) => a.code)
          : undefined,
    })
    toast.success("User added")
    setDialogOpen(false)
    resetForm()
  }

  const togglePds = (user: AccessRightsRow, code: string) => {
    const current = user.pdsAreaCodes ?? []
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code]
    updateAccessUser(user.userId, { pdsAreaCodes: next })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Configure PipeQC roles and subcontractor PDS scope. Role switcher in
          the top nav is for demo only.
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={pmLocked} className="gap-1">
              <Plus className="h-4 w-4" />
              Add user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                New users appear in the access matrix immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {role === "subcontractor" ? (
                <div className="space-y-1">
                  <Label>Subcontractor</Label>
                  <Select value={subId} onValueChange={setSubId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcontractor" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcontractors
                        .filter((s) => s.active)
                        .map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button onClick={handleAdd}>Add user</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Name", "Email", "Role", "Scope", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user.userId}
                className={
                  i % 2 === 0
                    ? "border-b border-slate-100"
                    : "border-b border-slate-100 bg-slate-50/50"
                }
              >
                <td className="px-3 py-2 text-xs font-medium">{user.fullName}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{user.email}</td>
                <td className="px-3 py-2">
                  <Select
                    value={user.role}
                    disabled={pmLocked}
                    onValueChange={(v) =>
                      updateAccessUser(user.userId, {
                        role: v as Role,
                        subcontractorId:
                          v === "subcontractor" ? user.subcontractorId : undefined,
                        pdsAreaCodes:
                          v === "subcontractor" ? user.pdsAreaCodes : undefined,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  {user.role === "subcontractor" ? (
                    <div className="flex flex-wrap gap-1 max-w-[280px]">
                      {activePds.map((area) => {
                        const on = (user.pdsAreaCodes ?? []).includes(area.code)
                        return (
                          <button
                            key={area.code}
                            type="button"
                            disabled={pmLocked}
                            onClick={() => togglePds(user, area.code)}
                            className="rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50"
                            style={{
                              borderColor: on ? "#0284c7" : "#cbd5e1",
                              background: on ? "#e0f2fe" : "#fff",
                              color: on ? "#0369a1" : "#64748b",
                            }}
                          >
                            {area.code}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Full project scope
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={user.active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {user.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={pmLocked}
                    onClick={() => {
                      toggleAccessUserActive(user.userId)
                      toast.success(
                        user.active ? "User deactivated" : "User reactivated"
                      )
                    }}
                  >
                    {user.active ? "Deactivate" : "Reactivate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-base text-amber-900">
            Subcontractor scope lock
          </CardTitle>
          <CardDescription className="text-amber-800">
            When the logged-in role is subcontractor, subcontractor dropdowns
            are disabled and forced to the active subcontractor. PDS area
            assignment is enforced by{" "}
            <code className="text-xs">lib/scope-lock.ts</code> (CC-4).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-amber-900">
          PDS areas configured here define which subcontractor users may see in
          scope-filtered views across fabrication, NDE, and test pack modules.
        </CardContent>
      </Card>
    </div>
  )
}
