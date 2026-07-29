# PipeQC — initial Supabase bootstrap

This runbook is only for the deployment owner. It establishes the first
platform administrator and the first project after the configuration migration
has been applied. It intentionally contains no operational/demo data.

## Prerequisites

- Apply `supabase/migrations/20260727145210_project_settings_and_referentials.sql`
  to the intended Supabase project.
- Use the Supabase Dashboard SQL Editor under an administrative database role,
  or an equivalent reviewed server-side administrative operation.
- Have the UUID of the first Auth user. Creating that user also creates the
  matching `public.profiles` record through the database trigger.

Do not run the commands below with browser credentials. Do not embed this SQL,
the service-role key, or any database credential in the application.

## 1. Create the first Auth user

Create the user in Supabase Dashboard **Authentication → Users**, or through a
server-only admin operation. Record its Auth UUID. The browser receives only
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; it must
never receive a service-role key.

## 2. Promote exactly that user to platform administrator

In SQL Editor, replace the placeholder with the Auth UUID and run:

```sql
update public.profiles
set is_platform_admin = true
where id = '<auth-user-uuid>';
```

Confirm that the update affected the intended profile before proceeding. This
is a deployment-only action, not an application feature.

## 3. Create the first project

The next vertical slice is Project Definition CRUD. Once it is available,
create the project through its authenticated platform-admin UI. Until then,
use only a reviewed migration or reviewed administrative SQL that supplies all
required `projects` fields and sets `created_by` to the same Auth UUID.

For example, the administrative SQL must provide at least:

```sql
insert into public.projects (
  activity_code,
  title,
  owner_name,
  contractor_name,
  maximum_transit_time_days,
  created_by
) values (
  '<ACTIVITY-CODE>',
  '<project title>',
  '<owner name>',
  '<contractor name>',
  1,
  '<auth-user-uuid>'
);
```

The `projects_add_creator_as_admin` trigger adds the creator as the project's
active `system_admin` membership. Check the created row and membership before
giving other users access.

## 4. Add project access for users

Insert one active `project_memberships` row for each user who needs access.
Use the intended project UUID, Auth/profile UUID and an allowed application
role. Perform this through the future administrator UI or a reviewed
administrative operation; do not invent a browser-side admin shortcut.

```sql
insert into public.project_memberships (project_id, user_id, role, is_active)
values (
  '<project-uuid>',
  '<auth-user-uuid>',
  'qc_engineer',
  true
);
```

The current real mode reads one active membership to establish project and
role. A signed-in user without one is deliberately shown the access-pending
screen rather than the demo application.

## Browser configuration

Set only these public values in the deployment environment, then rebuild or
restart Next.js because `NEXT_PUBLIC_*` values are compiled into the client
bundle:

```dotenv
NEXT_PUBLIC_PIPEQC_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=<project API URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

`NEXT_PUBLIC_PIPEQC_MODE=demo` (or an omitted/invalid value) preserves the
current standalone demo and does not initialise the Supabase browser client.
