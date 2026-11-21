import type { Role, StaffRole, User } from '@/api/types';

export const STAFF_ROLES: StaffRole[] = ['hospital_staff', 'lab_staff', 'authority', 'admin'];

export const isStaffRole = (role: Role): role is StaffRole =>
  (STAFF_ROLES as Role[]).includes(role);

/** Home page of each staff portal. */
export const PORTAL_PATH: Record<StaffRole, string> = {
  hospital_staff: '/staff/hospital',
  lab_staff: '/staff/lab',
  authority: '/staff/authority',
  admin: '/staff/admin',
};

export type PortalAccess = 'granted' | 'login' | 'wrongRole' | 'pending' | 'rejected';

/**
 * Approval gate: a staff user sees their portal only when logged in, in an allowed role and
 * approved by an administrator. Administrators are always approved.
 */
export function portalAccess(
  user: Pick<User, 'role' | 'approvalStatus'> | undefined,
  isLoggedIn: boolean,
  roles: Role[],
): PortalAccess {
  if (!isLoggedIn || !user) return 'login';
  if (!roles.includes(user.role)) return 'wrongRole';
  if (user.role === 'admin' || !isStaffRole(user.role)) return 'granted';
  if (user.approvalStatus === 'approved') return 'granted';
  if (user.approvalStatus === 'rejected') return 'rejected';
  return 'pending';
}
