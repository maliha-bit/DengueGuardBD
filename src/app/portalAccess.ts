import { useCurrentUser } from '@/api/queries';
import type { Role } from '@/api/types';
import { portalAccess } from '@/lib/access';
import { useSession } from './session';

/** Current user's access to a portal (used by the guard and the staff shell). */
export function usePortalAccess(roles: Role[]) {
  const { isLoggedIn } = useSession();
  const user = useCurrentUser();
  return { user, access: portalAccess(user.data, isLoggedIn, roles) };
}
