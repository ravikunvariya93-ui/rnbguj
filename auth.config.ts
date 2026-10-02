import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authConfig = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any, user: any }) {
      if (user) {
        token.role = user.role;
        token.roles = user.roles;
        token.roleLabel = user.roleLabel;
        token.roleLabels = user.roleLabels;
        token.officeType = user.officeType;
        token.jurisdiction = user.jurisdiction;
        token.jurisdictionName = user.jurisdictionName;
        token.assignedSubDivisions = user.assignedSubDivisions;
        token.assignedSubDivisionNames = user.assignedSubDivisionNames;
        token.scopeKeys = user.scopeKeys;
        token.modules = user.modules;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      if (token) {
        session.user.role = token.role;
        session.user.roles = token.roles;
        session.user.roleLabel = token.roleLabel;
        session.user.roleLabels = token.roleLabels;
        session.user.officeType = token.officeType;
        session.user.jurisdiction = token.jurisdiction;
        session.user.jurisdictionName = token.jurisdictionName;
        session.user.assignedSubDivisions = token.assignedSubDivisions;
        session.user.assignedSubDivisionNames = token.assignedSubDivisionNames;
        session.user.scopeKeys = token.scopeKeys;
        session.user.modules = token.modules;
        session.user.username = token.username;
        session.user.id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  }
} satisfies NextAuthConfig;

export default authConfig;
