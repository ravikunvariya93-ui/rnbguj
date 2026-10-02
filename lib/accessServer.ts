// Server-only access helpers (imports mongoose — never import from client code).
import dbConnect from '@/lib/db';
import Role from '@/models/Role';
import Jurisdiction from '@/models/Jurisdiction';
import User from '@/models/User';
import { ROLE_SEEDS, OFFICE_TYPES, SCOPED_ROLE_KEYS, isAdminUser, canAccessModule, ROLE_SEED_MAP } from '@/lib/access';

interface JurisdictionSeed {
  name: string;
  type: string;
  matchKey: string;
  parentName?: string;
}

// Starter content (admin adds more districts/divisions as needed).
const JURISDICTION_SEEDS: JurisdictionSeed[] = [
  { name: 'State Road and Building Division, Bhavnagar', type: OFFICE_TYPES.DIVISION, matchKey: 'State Road and Building Division, Bhavnagar' },
];

/** One Auditor per sub-division: find another scoped-role user already covering any of these sub-divisions. */
export async function findAuditorScopeConflict(
  scopeIds: string[],
  excludeUserId?: string
): Promise<{ username?: string; name?: string } | null> {
  if (scopeIds.length === 0) return null;
  await dbConnect();
  const query: Record<string, unknown> = {
    $and: [
      { $or: [{ roles: { $in: SCOPED_ROLE_KEYS } }, { role: { $in: SCOPED_ROLE_KEYS } }] },
      {
        $or: [
          { assignedSubDivisions: { $in: scopeIds } },
          { assignedSubDivision: { $in: scopeIds } },
        ],
      },
    ],
  };
  if (excludeUserId && /^[0-9a-fA-F]{24}$/.test(excludeUserId)) {
    (query.$and as unknown[]).push({ _id: { $ne: excludeUserId } });
  }
  const clash = await User.findOne(query).select('username name').lean() as unknown as { username?: string; name?: string } | null;
  return clash;
}

/** Insert seed roles + jurisdictions when missing (never overwrites admin edits). */
export async function ensureAccessSeeded(): Promise<void> {
  await dbConnect();
  await Promise.all(
    ROLE_SEEDS.map((r) =>
      Role.updateOne(
        { key: r.key },
        { $setOnInsert: { ...r, isSystem: true } },
        { upsert: true }
      ).catch(() => null)
    )
  );

  // Additive grant: every role gets the personal Tasks module (strictly
  // own-tasks, so it is safe for all roles; existing sessions pick it up
  // on next login).
  await Role.updateMany(
    { modules: { $ne: 'tasks' } },
    { $addToSet: { modules: 'tasks' } }
  ).catch(() => null);

  // Divisions first so sub-divisions can link parents.
  for (const seed of JURISDICTION_SEEDS.filter((s) => s.type === OFFICE_TYPES.DIVISION)) {
    await Jurisdiction.updateOne(
      { $or: [{ name: seed.name }, { matchKey: seed.matchKey }] },
      {
        $setOnInsert: { name: seed.name, type: seed.type, matchKey: seed.matchKey },
        $set: { type: seed.type },
      },
      { upsert: true }
    ).catch(() => null);
  }
  for (const seed of JURISDICTION_SEEDS.filter((s) => s.type === OFFICE_TYPES.SUB_DIVISION)) {
    let parentId: unknown = null;
    if (seed.parentName) {
      const parent = await Jurisdiction.findOne({ name: seed.parentName })
        .select('_id')
        .lean() as unknown as { _id?: unknown } | null;
      parentId = parent?._id ?? null;
    }
    await Jurisdiction.updateOne(
      { $or: [{ name: seed.name }, { matchKey: seed.matchKey }] },
      {
        $setOnInsert: { name: seed.name, type: seed.type, matchKey: seed.matchKey },
        ...(parentId ? { $set: { parent: parentId } } : {}),
      },
      { upsert: true }
    ).catch(() => null);
  }
}

/**
 * Admin check for API routes that tolerates stale client tokens. The JWT can
 * predate the roles schema (and next-auth never refreshes its custom fields),
 * so when the session lacks roles we fall back to the DB user doc keyed by
 * the stable token `sub`. Fast path stays synchronous-cheap (no DB hit) when
 * the session already carries the ADMIN role.
 */
export async function isAdminSession(session: unknown): Promise<boolean> {
  if (isAdminUser(session)) return true;
  const uid = (session as { user?: { id?: string } } | null | undefined)?.user?.id;
  if (!uid || !/^[0-9a-fA-F]{24}$/.test(uid)) return false;
  try {
    await dbConnect();
    const u = await User.findById(uid).select('roles role').lean() as unknown as { roles?: string[]; role?: string } | null;
    if (!u) return false;
    if (Array.isArray(u.roles) && u.roles.map((k) => String(k).toUpperCase()).includes('ADMIN')) return true;
    return !!u.role && String(u.role).toUpperCase() === 'ADMIN';
  } catch {
    return false;
  }
}

/** Roles + modules resolved from the DB user/role records (source of truth). */
export async function getServerIdentity(session: unknown): Promise<{ roles: string[]; modules: string[] } | null> {
  const uid = (session as { user?: { id?: string } } | null | undefined)?.user?.id;
  if (!uid || !/^[0-9a-fA-F]{24}$/.test(uid)) return null;
  try {
    await dbConnect();
    const user = await User.findById(uid).select('roles role').lean() as unknown as { roles?: string[]; role?: string } | null;
    if (!user) return null;
    let roleKeys = (Array.isArray(user.roles) ? user.roles : []).map((k) => String(k).toUpperCase()).filter(Boolean);
    if (roleKeys.length === 0 && user.role) roleKeys = [String(user.role).toUpperCase()];
    const roleDocs = await Role.find({ key: { $in: roleKeys } }).select('key modules').lean() as unknown as { key: string; modules?: string[] }[];
    const modsByKey = new Map(roleDocs.map((r) => [r.key, r.modules ?? []]));
    const moduleSet = new Set<string>();
    roleKeys.forEach((k) => {
      const mods = modsByKey.get(k) ?? ROLE_SEED_MAP[k]?.modules ?? [];
      (mods as string[]).forEach((m) => moduleSet.add(m));
    });
    return { roles: roleKeys, modules: Array.from(moduleSet) };
  } catch {
    return null;
  }
}

/**
 * Module check for API routes/pages that tolerates stale client tokens.
 * Fast path uses the session; falls back to DB-resolved identity.
 */
export async function canAccessModuleServer(session: unknown, moduleKey: string): Promise<boolean> {
  if (canAccessModule((session as { user?: unknown } | null | undefined)?.user, moduleKey)) return true;
  const ident = await getServerIdentity(session);
  if (!ident) return false;
  if (ident.roles.includes('ADMIN')) return true;
  return ident.modules.includes(moduleKey);
}
