'use client'

import * as React from 'react'

export type Role =
  | 'qc_engineer'
  | 'nde_inspector'
  | 'project_manager'
  | 'spooling_team'
  | 'subcontractor'
  | 'system_admin'

export interface RoleInfo {
  id: Role
  label: string
  description: string
}

export const ROLES: RoleInfo[] = [
  { id: 'qc_engineer', label: 'QC Engineer', description: 'Quality Control Engineer' },
  { id: 'nde_inspector', label: 'NDE Inspector', description: 'Non-Destructive Examination Inspector' },
  { id: 'project_manager', label: 'Project Manager', description: 'Project Manager / Admin' },
  { id: 'spooling_team', label: 'Spooling Team', description: 'Spooling Team Member' },
  { id: 'subcontractor', label: 'Subcontractor', description: 'External Subcontractor' },
  { id: 'system_admin', label: 'System Admin', description: 'System Administrator' },
]

interface RoleContextValue {
  currentRole: Role
  setCurrentRole: (role: Role) => void
  roleInfo: RoleInfo
}

const RoleContext = React.createContext<RoleContextValue | null>(null)

export function useRole() {
  const context = React.useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = React.useState<Role>('project_manager')

  const roleInfo = React.useMemo(
    () => ROLES.find((r) => r.id === currentRole) || ROLES[0],
    [currentRole]
  )

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, roleInfo }}>
      {children}
    </RoleContext.Provider>
  )
}
