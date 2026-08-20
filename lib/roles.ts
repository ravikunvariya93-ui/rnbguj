// ─── Role Constants ───────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  VIEWER: 'VIEWER',
  TENDERCLERK: 'TENDERCLERK', // Full access except Bills
  AUDITOR_BVN: 'AUDITOR_BVN', // Bhavnagar sub-division
  AUDITOR_TLJ: 'AUDITOR_TLJ', // Talaja sub-division
  AUDITOR_MHV: 'AUDITOR_MHV', // Mahuva sub-division
  AUDITOR_SHR: 'AUDITOR_SHR', // Shihor sub-division
  AUDITOR_VLB: 'AUDITOR_VLB', // Vallabhipur sub-division
  AUDITOR_PLT: 'AUDITOR_PLT', // Palitana sub-division
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ─── Sub-Division Mapping ─────────────────────────────────────────────────────

/** Maps auditor role → subDivision name (as stored in Package.subDivision) */
export const AUDITOR_ROLE_SUBDIVISION_MAP: Record<string, string> = {
  [ROLES.AUDITOR_BVN]: 'Bhavnagar',
  [ROLES.AUDITOR_TLJ]: 'Talaja',
  [ROLES.AUDITOR_MHV]: 'Mahuva',
  [ROLES.AUDITOR_SHR]: 'Shihor',
  [ROLES.AUDITOR_VLB]: 'Vallabhipur',
  [ROLES.AUDITOR_PLT]: 'Palitana',
};

/** Human-readable labels for every role */
export const ROLE_LABELS: Record<string, string> = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.VIEWER]: 'Viewer',
  [ROLES.TENDERCLERK]: 'Tender Clerk',
  [ROLES.AUDITOR_BVN]: 'Auditor – Bhavnagar',
  [ROLES.AUDITOR_TLJ]: 'Auditor – Talaja',
  [ROLES.AUDITOR_MHV]: 'Auditor – Mahuva',
  [ROLES.AUDITOR_SHR]: 'Auditor – Shihor',
  [ROLES.AUDITOR_VLB]: 'Auditor – Vallabhipur',
  [ROLES.AUDITOR_PLT]: 'Auditor – Palitana',
};

/** All role values in display order */
export const ALL_ROLES: { value: string; label: string }[] = [
  { value: ROLES.ADMIN,       label: ROLE_LABELS[ROLES.ADMIN] },
  { value: ROLES.SUPERVISOR,  label: ROLE_LABELS[ROLES.SUPERVISOR] },
  { value: ROLES.VIEWER,      label: ROLE_LABELS[ROLES.VIEWER] },
  { value: ROLES.TENDERCLERK, label: ROLE_LABELS[ROLES.TENDERCLERK] },
  { value: ROLES.AUDITOR_BVN, label: ROLE_LABELS[ROLES.AUDITOR_BVN] },
  { value: ROLES.AUDITOR_TLJ, label: ROLE_LABELS[ROLES.AUDITOR_TLJ] },
  { value: ROLES.AUDITOR_MHV, label: ROLE_LABELS[ROLES.AUDITOR_MHV] },
  { value: ROLES.AUDITOR_SHR, label: ROLE_LABELS[ROLES.AUDITOR_SHR] },
  { value: ROLES.AUDITOR_VLB, label: ROLE_LABELS[ROLES.AUDITOR_VLB] },
  { value: ROLES.AUDITOR_PLT, label: ROLE_LABELS[ROLES.AUDITOR_PLT] },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/** Returns true if the given role is any auditor role */
export function isAuditorRole(role?: string | null): boolean {
  return !!role && role in AUDITOR_ROLE_SUBDIVISION_MAP;
}

/** Returns the subDivision for an auditor role, or null for non-auditor roles */
export function getAuditorSubDivision(role?: string | null): string | null {
  if (!role) return null;
  return AUDITOR_ROLE_SUBDIVISION_MAP[role] ?? null;
}

/** Roles that have full access to everything (non-auditor) */
export const FULL_ACCESS_ROLES = [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.VIEWER];

/** All auditor role strings */
export const ALL_AUDITOR_ROLES = Object.keys(AUDITOR_ROLE_SUBDIVISION_MAP);
