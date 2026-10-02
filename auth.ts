import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Role from '@/models/Role';
import Jurisdiction from '@/models/Jurisdiction';
import { authConfig } from './auth.config';
import { ROLE_SEED_MAP } from '@/lib/access';
import { ensureAccessSeeded } from '@/lib/accessServer';

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        await dbConnect();
        const user = await User.findOne({ username: credentials.username });
        
        if (user && user.password && (await bcrypt.compare(credentials.password as string, user.password as string))) {
          // Resolve display label + module access from the Role master (seeded fallback).
          await ensureAccessSeeded();
          // One-time migration: legacy users store a single `role` string.
          let roleKeys = (user as unknown as { roles?: string[] }).roles;
          if (!Array.isArray(roleKeys) || roleKeys.length === 0) {
            const legacyRole = (user as unknown as { role?: string }).role;
            roleKeys = legacyRole ? [String(legacyRole).toUpperCase()] : [];
            await User.findByIdAndUpdate(user._id, { $set: { roles: roleKeys }, $unset: { role: '' } });
          }
          roleKeys = roleKeys.map((k) => String(k).toUpperCase());
          const roleDocs = await Role.find({ key: { $in: roleKeys } }).lean() as unknown as { key: string; label?: string; modules?: string[] }[];
          const roleByKey = new Map(roleDocs.map((r) => [r.key, r]));
          const moduleSet = new Set<string>();
          roleKeys.forEach((k) => {
            const doc = roleByKey.get(k);
            const mods = Array.isArray(doc?.modules) ? doc.modules : (ROLE_SEED_MAP[k]?.modules || []);
            (mods as string[]).forEach((m) => moduleSet.add(m));
          });
          const primaryKey = roleKeys[0] || '';
          const primaryDoc = roleByKey.get(primaryKey);
          // Unknown roles get no module access (fail closed). ADMIN bypasses checks separately.
          const officeType = (user as unknown as { officeType?: string }).officeType || 'DIVISION';
          let jurisdictionRef = (user as unknown as { jurisdiction?: string }).jurisdiction || '';
          // One-time migration: legacy users store the jurisdiction NAME — resolve to the doc id.
          if (jurisdictionRef && !OBJECT_ID_RE.test(jurisdictionRef)) {
            const match = await Jurisdiction.findOne({ name: jurisdictionRef }).select('_id').lean() as unknown as { _id?: unknown } | null;
            if (match?._id) {
              jurisdictionRef = String(match._id);
              await User.findByIdAndUpdate(user._id, { jurisdiction: jurisdictionRef });
            }
          }
          // Data-scope keys. Priority: the explicitly assigned bill-passing
          // sub-divisions (Auditor in Division office) — else the posting
          // jurisdiction (its match key, or all children's keys for a Division).
          // Falls back to the raw stored value when the doc is gone.
          let scopeKeys: string[] = [];
          let jurisdictionName = jurisdictionRef && !OBJECT_ID_RE.test(jurisdictionRef) ? jurisdictionRef : '';
          const rawAssigned = (user as unknown as { assignedSubDivisions?: string[]; assignedSubDivision?: string }).assignedSubDivisions
            ?? (user as unknown as { assignedSubDivision?: string }).assignedSubDivision;
          const assignedRefs: string[] = [];
          for (const v of (Array.isArray(rawAssigned) ? rawAssigned : (rawAssigned ? [rawAssigned] : [])).map((x) => String(x)).filter(Boolean)) {
            if (OBJECT_ID_RE.test(v)) {
              assignedRefs.push(v);
            } else {
              // Legacy stored name → resolve to id once.
              const match = await Jurisdiction.findOne({ name: v }).select('_id').lean() as unknown as { _id?: unknown } | null;
              if (match?._id) assignedRefs.push(String(match._id));
            }
          }
          // One-time migration: legacy single string → array.
          if (assignedRefs.length > 0 && JSON.stringify(assignedRefs) !== JSON.stringify((user as unknown as { assignedSubDivisions?: string[] }).assignedSubDivisions || [])) {
            await User.findByIdAndUpdate(user._id, { assignedSubDivisions: assignedRefs }).catch(() => null);
          }
          let assignedSubDivisionNames: string[] = [];
          if (assignedRefs.length > 0) {
            const aDocs = await Jurisdiction.find({ _id: { $in: assignedRefs.filter((v) => OBJECT_ID_RE.test(v)) } }).select('matchKey name').lean() as unknown as { matchKey?: string; name?: string }[];
            assignedSubDivisionNames = aDocs.map((d) => d.name || '').filter(Boolean);
            const keys = aDocs.map((d) => d.matchKey || d.name || '').filter(Boolean);
            if (keys.length > 0) scopeKeys = keys;
          }
          if (scopeKeys.length === 0 && jurisdictionRef && OBJECT_ID_RE.test(jurisdictionRef)) {
            const jDoc = await Jurisdiction.findById(jurisdictionRef).lean() as unknown as { name?: string; type?: string; matchKey?: string } | null;
            if (jDoc) {
              jurisdictionName = jDoc.name || '';
              if (jDoc.type === 'DIVISION') {
                const children = await Jurisdiction.find({ parent: jurisdictionRef }).select('matchKey name').lean() as unknown as { matchKey?: string; name?: string }[];
                scopeKeys = children.map((c) => c.matchKey || c.name || '').filter(Boolean);
                if (jDoc.matchKey) scopeKeys.unshift(jDoc.matchKey);
              } else if (jDoc.matchKey || jDoc.name) {
                scopeKeys = [jDoc.matchKey || jDoc.name || ''];
              }
            }
          }
          return {
            id: user._id.toString(),
            name: user.name,
            username: user.username,
            role: primaryKey,
            roles: roleKeys,
            roleLabel: primaryDoc?.label || ROLE_SEED_MAP[primaryKey]?.label || primaryKey,
            roleLabels: roleKeys.map((k) => roleByKey.get(k)?.label || ROLE_SEED_MAP[k]?.label || k),
            officeType,
            jurisdiction: jurisdictionRef,
            jurisdictionName,
            assignedSubDivisions: assignedRefs,
            assignedSubDivisionNames,
            scopeKeys,
            modules: Array.from(moduleSet),
          };
        }
        return null;
      }
    })
  ],
});
