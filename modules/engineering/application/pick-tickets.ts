/**
 * Reading a picked file takes time, and a person can pick again before it ends. Each pick of a role gets a ticket, and
 * only the newest ticket of a role is current: a slower earlier read that ends later is dropped instead of replacing the
 * newer file. Removing a role's file makes none of its reads current.
 */
export function createPickTickets<Role extends string>() {
  const newest = new Map<Role, number>()
  let issued = 0
  return {
    issue(role: Role): number {
      issued += 1
      newest.set(role, issued)
      return issued
    },
    cancel(role: Role): void {
      newest.delete(role)
    },
    isCurrent(role: Role, ticket: number): boolean {
      return newest.get(role) === ticket
    },
  }
}
