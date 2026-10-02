// ─── Role-Based Access Control (admin-managed Roles) ─────────────────────────
// Users carry a role (key into the Role master). Roles carry the list of
// module keys the user may open.
//
// NOTE: this module must stay client-safe (no Node built-ins, no mongoose).
// Server-only seeding lives in '@/lib/accessServer'.

// ─── Modules ────────────────────────────────────────────────────────────────

export interface AccessModule {
  key: string;
  label: string;
  href: string;
}

export const MODULES: AccessModule[] = [
  { key: 'dashboard',           label: 'Dashboard',       href: '/' },
  { key: 'tasks',               label: 'Tasks',           href: '/tasks' },
  { key: 'approved-works',      label: 'Approved Work',   href: '/approved-works' },
  { key: 'technical-sanctions', label: 'TS',              href: '/technical-sanctions' },
  { key: 'packages',            label: 'Package',         href: '/packages' },
  { key: 'committee',           label: 'Committee',       href: '/committee' },
  { key: 'tenders',             label: 'Tender',          href: '/tenders' },
  { key: 'agreements',          label: 'Agreement',       href: '/agreements' },
  { key: 'bills',               label: 'Bill',            href: '/bills' },
  { key: 'excess-proposals',    label: 'Excess Proposal', href: '/excess-proposals' },
  { key: 'contractors',         label: 'Contractor List', href: '/contractors' },
  { key: 'reports',             label: 'Reports',         href: '/reports' },
  { key: 'admin',               label: 'Administration',  href: '/admin/users' },
];

export const ALL_MODULE_KEYS = MODULES.map((m) => m.key);

export const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  MODULES.map((m) => [m.key, m.label])
);

// ─── Office posting (fixed lists — no master) ───────────────────────────────

export const OFFICE_TYPES = {
  DIVISION: 'DIVISION',
  SUB_DIVISION: 'SUB_DIVISION',
} as const;

export type OfficeType = (typeof OFFICE_TYPES)[keyof typeof OFFICE_TYPES];

export const OFFICE_TYPE_LABELS: Record<string, string> = {
  [OFFICE_TYPES.DIVISION]: 'Division',
  [OFFICE_TYPES.SUB_DIVISION]: 'Sub Division',
};

// ─── Seed data (legacy roles migrated into the master) ─────────────────────

const FULL_APP = ALL_MODULE_KEYS.filter((k) => k !== 'admin');
const NO_BILLS = FULL_APP.filter((k) => k !== 'bills');

export interface RoleSeed {
  key: string;
  label: string;
  modules: string[];
}

export const ROLE_SEEDS: RoleSeed[] = [
  { key: 'ADMIN',       label: 'Administrator',                       modules: ALL_MODULE_KEYS },
  { key: 'TENDERCLERK', label: 'Tender Clerk',                        modules: NO_BILLS },
  { key: 'AAE',         label: 'Additional Assistant Engineer (AAE)', modules: NO_BILLS },
  { key: 'DEE',         label: 'Deputy Executive Engineer (DEE)',     modules: NO_BILLS },
  { key: 'SDC',         label: 'Sub Divisional Clerk (SDC)',          modules: NO_BILLS },
];

export const ROLE_SEED_MAP: Record<string, RoleSeed> = Object.fromEntries(
  ROLE_SEEDS.map((r) => [r.key, r])
);

// ─── Session helpers ───────────────────────────────────────────────────────

export interface AccessUser {
  role?: string | null;
  roles?: string[] | null;
  officeType?: string | null;
  jurisdiction?: string | null;
  assignedSubDivisions?: string[] | null;
  scopeKeys?: string[] | null;
  modules?: string[] | null;
}

/**
 * Roles that are always restricted to their assigned sub-division's works,
 * even when posted in the Division office (e.g. the 6 Auditors, one per
 * sub-division).
 */
export const SCOPED_ROLE_KEYS = ['AUDITOR'];

/**
 * Sub-division match source for the user, or null for division-wide access.
 * Applies to Sub Division office users, to scoped roles (Auditor) with an
 * assigned jurisdiction, and to any Division-office user with an explicit
 * multi sub-division charge (assignedSubDivisions, e.g. DEE of Palitana +
 * Mahuva). Prefers the resolved scopeKeys array (a Division
 * assignment expands to its children's keys); falls back to the raw stored
 * jurisdiction for legacy sessions. Multi-key results are returned as an
 * escaped regex alternation group so existing `^...$` filters keep working.
 * Accepts unknown (e.g. next-auth session.user) and narrows internally.
 */
export function getScopedSubDivision(user?: unknown): string | null {
  const u = user as (AccessUser & { scopeKeys?: string[] }) | null | undefined;
  if (!u) return null;
  const keys = Array.isArray(u.scopeKeys) ? u.scopeKeys.filter(Boolean) : [];
  if (keys.length > 0) {
    const hasMultiCharge = Array.isArray(u.assignedSubDivisions) && u.assignedSubDivisions.filter(Boolean).length > 0;
    const scoped = u.officeType === OFFICE_TYPES.SUB_DIVISION
      || (u.role != null && SCOPED_ROLE_KEYS.includes(u.role))
      || (Array.isArray(u.roles) && u.roles.some((r) => SCOPED_ROLE_KEYS.includes(r)))
      || hasMultiCharge;
    if (!scoped) return null;
    if (keys.length === 1) return keys[0];
    return `(${keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
  }
  if (!u.jurisdiction) return null;
  if (u.officeType === OFFICE_TYPES.SUB_DIVISION) return u.jurisdiction;
  if (u.role && SCOPED_ROLE_KEYS.includes(u.role)) return u.jurisdiction;
  if (Array.isArray(u.roles) && u.roles.some((r) => SCOPED_ROLE_KEYS.includes(r))) return u.jurisdiction;
  return null;
}

/** True when the session user holds the ADMIN role (primary or additional). */
export function isAdminUser(session?: unknown): boolean {
  const u = (session as { user?: AccessUser } | null | undefined)?.user;
  if (!u) return false;
  if (u.role === 'ADMIN') return true;
  return Array.isArray(u.roles) && u.roles.includes('ADMIN');
}

/** Module key the user may open. ADMIN bypasses checks (prevents lockout). */
export function canAccessModule(user?: unknown, moduleKey?: string): boolean {  if (!moduleKey) return false;
  const u = user as AccessUser | null | undefined;
  if (!u) return false;
  if (u.role === 'ADMIN' || (Array.isArray(u.roles) && u.roles.includes('ADMIN'))) return true;
  const modules = u.modules;
  if (!Array.isArray(modules)) return false;
  return modules.includes(moduleKey);
}

/** Keep only known module keys, preserving MODULES order. */
export function sanitizeModules(modules: unknown): string[] {
  if (!Array.isArray(modules)) return [];
  const valid = new Set(ALL_MODULE_KEYS);
  return ALL_MODULE_KEYS.filter((k) => (modules as unknown[]).includes(k) && valid.has(k));
}
