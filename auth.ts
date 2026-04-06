import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { authConfig } from './auth.config';

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
        
        if (user && bcrypt.compareSync(credentials.password as string, user.password as string)) {
          return {
            id: user._id.toString(),
            name: user.name,
            username: user.username,
            role: user.role,
          };
        }
        return null;
      }
    })
  ],
});
