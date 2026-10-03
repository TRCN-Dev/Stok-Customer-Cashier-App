/**
 * User Roles and Access Control Configuration for TRCN Laundry
 */

export type UserRole = 'admin' | 'cashier';

const DEFAULT_ADMIN_EMAILS = [
  'tricoinss@gmail.com',
];

/**
 * Returns list of admin emails (stored in localStorage or fallback to defaults)
 */
export function getAdminEmails(): string[] {
  try {
    const stored = localStorage.getItem('trcn_admin_emails');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...parsed]));
      }
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_ADMIN_EMAILS;
}

/**
 * Adds an email to the admin list
 */
export function addAdminEmail(email: string): string[] {
  const current = getAdminEmails();
  const lower = email.trim().toLowerCase();
  if (!current.map((e) => e.toLowerCase()).includes(lower)) {
    const updated = [...current, lower];
    localStorage.setItem('trcn_admin_emails', JSON.stringify(updated));
    return updated;
  }
  return current;
}

/**
 * Checks if a user has admin privileges
 */
export function isUserAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminList = getAdminEmails().map((e) => e.toLowerCase());
  return adminList.includes(email.trim().toLowerCase());
}
