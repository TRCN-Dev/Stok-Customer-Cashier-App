/**
 * User Roles & RBAC Invitation Management via Gmail
 * Controls who can be Admin and who can be Cashier
 */

export type AppLayer = 'owner' | 'cashier' | 'customer';
export type UserRole = 'admin' | 'cashier' | 'customer';

export interface AdminProfile {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface UserAccessEntry {
  email: string;
  name: string;
  role: 'admin' | 'cashier';
  invitedAt: string;
  invitedBy?: string;
}

export const MAIN_3_ADMINS: AdminProfile[] = [
  { id: 'revan', name: 'Revan', role: 'Owner & Super Admin', email: 'tricoinss@gmail.com' },
  { id: 'jakson', name: 'Jakson', role: 'Admin Manager & Finance', email: 'tricoinss@gmail.com' },
  { id: 'admin3', name: 'Admin Operasional', role: 'Admin Supervisor', email: 'tricoinss@gmail.com' },
];

const DEFAULT_USERS: UserAccessEntry[] = [
  { email: 'tricoinss@gmail.com', name: 'Revan & Admin Team', role: 'admin', invitedAt: '2026-10-01', invitedBy: 'Sistem' },
  { email: 'jakson@tricoinss.com', name: 'Jakson', role: 'admin', invitedAt: '2026-10-01', invitedBy: 'tricoinss@gmail.com' },
  { email: 'kasir.trcn@gmail.com', name: 'Kasir Utama', role: 'cashier', invitedAt: '2026-10-01', invitedBy: 'tricoinss@gmail.com' },
];

const STORAGE_KEY = 'trcn_rbac_users';

/**
 * Returns list of user access entries
 */
export function getUserAccessList(): UserAccessEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: UserAccessEntry[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with default ensuring tricoinss@gmail.com is always present
        const map = new Map<string, UserAccessEntry>();
        DEFAULT_USERS.forEach((u) => map.set(u.email.toLowerCase(), u));
        parsed.forEach((u) => map.set(u.email.toLowerCase(), u));
        return Array.from(map.values());
      }
    }
  } catch (e) {
    console.error('Error loading RBAC users:', e);
  }
  return DEFAULT_USERS;
}

/**
 * Save user list to localStorage
 */
function saveUserAccessList(users: UserAccessEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving RBAC users:', e);
  }
}

/**
 * Add or invite a new Gmail account as Admin or Cashier
 */
export function addUserAccess(entry: {
  email: string;
  name: string;
  role: 'admin' | 'cashier';
  invitedBy?: string;
}): UserAccessEntry[] {
  const current = getUserAccessList();
  const lowerEmail = entry.email.trim().toLowerCase();

  const newEntry: UserAccessEntry = {
    email: lowerEmail,
    name: entry.name.trim() || lowerEmail.split('@')[0],
    role: entry.role,
    invitedAt: new Date().toISOString().split('T')[0],
    invitedBy: entry.invitedBy || 'Admin',
  };

  const existingIdx = current.findIndex((u) => u.email.toLowerCase() === lowerEmail);
  let updated: UserAccessEntry[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = newEntry;
  } else {
    updated = [...current, newEntry];
  }

  saveUserAccessList(updated);
  return updated;
}

/**
 * Update user role (admin or cashier)
 */
export function updateUserRole(email: string, newRole: 'admin' | 'cashier'): UserAccessEntry[] {
  const current = getUserAccessList();
  const lowerEmail = email.trim().toLowerCase();
  const updated = current.map((u) => (u.email.toLowerCase() === lowerEmail ? { ...u, role: newRole } : u));
  saveUserAccessList(updated);
  return updated;
}

/**
 * Remove / Revoke user access (cannot remove root owner)
 */
export function removeUserAccess(email: string): UserAccessEntry[] {
  const lowerEmail = email.trim().toLowerCase();
  if (lowerEmail === 'tricoinss@gmail.com') {
    return getUserAccessList(); // Protected root account
  }
  const current = getUserAccessList();
  const updated = current.filter((u) => u.email.toLowerCase() !== lowerEmail);
  saveUserAccessList(updated);
  return updated;
}

/**
 * Returns role for an email ('admin' | 'cashier' | 'customer')
 * Strict RBAC Rules:
 * 1. tricoinss@gmail.com is ALWAYS 'admin' (Root Super Admin)
 * 2. Anyone added via Admin Panel has their designated role ('admin' or 'cashier')
 * 3. Anyone else registering / logging in with their own Gmail gets ONLY 'customer' role
 */
export function getAppRoleForEmail(email: string | null | undefined): UserRole {
  if (!email) return 'customer';
  const lower = email.trim().toLowerCase();
  if (lower === 'tricoinss@gmail.com') return 'admin';
  const user = getUserAccessList().find((u) => u.email.toLowerCase() === lower);
  if (user) {
    return user.role;
  }
  // Any other Gmail account not invited by admin defaults strictly to customer
  return 'customer';
}

/**
 * Returns role for an email ('admin' | 'cashier' | 'customer')
 */
export function getUserRole(email: string | null | undefined): UserRole {
  return getAppRoleForEmail(email);
}

/**
 * Checks if a user has admin privileges (tricoinss@gmail.com or designated admins)
 */
export function isUserAdmin(email: string | null | undefined): boolean {
  return getAppRoleForEmail(email) === 'admin';
}

/**
 * Checks if a user has cashier privileges (or admin privileges)
 */
export function isUserCashier(email: string | null | undefined): boolean {
  const role = getAppRoleForEmail(email);
  return role === 'admin' || role === 'cashier';
}

/**
 * Checks if a user is strictly in customer-only mode
 */
export function isUserCustomerOnly(email: string | null | undefined): boolean {
  return getAppRoleForEmail(email) === 'customer';
}

/**
 * Returns list of authorized admin emails
 */
export function getAdminEmails(): string[] {
  const users = getUserAccessList();
  const admins = users.filter((u) => u.role === 'admin').map((u) => u.email.toLowerCase());
  return Array.from(new Set(['tricoinss@gmail.com', ...admins]));
}

/**
 * Adds an email to the admin list
 */
export function addAdminEmail(email: string): string[] {
  addUserAccess({
    email,
    name: email.split('@')[0],
    role: 'admin',
    invitedBy: 'Admin',
  });
  return getAdminEmails();
}

/**
 * Get active admin profile (stored in localStorage or default to Revan)
 */
export function getActiveAdminProfile(): AdminProfile {
  const savedId = localStorage.getItem('trcn_active_admin_id');
  const found = MAIN_3_ADMINS.find((a) => a.id === savedId);
  return found || MAIN_3_ADMINS[0];
}

/**
 * Set active admin profile
 */
export function setActiveAdminProfile(id: string): AdminProfile {
  localStorage.setItem('trcn_active_admin_id', id);
  const found = MAIN_3_ADMINS.find((a) => a.id === id);
  return found || MAIN_3_ADMINS[0];
}
