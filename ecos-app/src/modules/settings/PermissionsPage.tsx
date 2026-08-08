import { PagePlaceholder } from '@/app/PagePlaceholder';

export function PermissionsPage() {
  return (
    <PagePlaceholder
      title="Permissions"
      route="/settings/permissions"
      status="stub"
      note="Role → capability toggles → per-user override. See src/auth/types.ts, src/auth/capabilities.ts, src/auth/seedRoles.ts."
    />
  );
}
