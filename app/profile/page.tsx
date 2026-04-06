'use client';

import { useSession, signOut } from 'next-auth/react';
import { User, Mail, Shield, LogOut, Calendar, Building2 } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500 font-medium">Loading profile...</div>
      </div>
    );
  }

  const user = session.user as any;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header Profile Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-12 text-white">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
              <User className="h-12 w-12 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="opacity-80 flex items-center gap-2 mt-1">
                <Shield className="h-4 w-4" />
                {user.role} Account
              </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Account Details</h2>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Username</p>
                  <p className="text-base font-semibold text-gray-900">{user.username}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Access Level</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'SUPERVISOR' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Department</p>
                  <p className="text-base font-semibold text-gray-900">Panchayat R&B Division, Bhavnagar</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Login & Security</h2>
              
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-yellow-800 text-sm">
                <p className="font-semibold mb-1">Security Tip</p>
                Always ensure you log out of shared computers after completing your work.
              </div>

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl font-semibold transition-colors border border-red-200"
              >
                <LogOut className="h-5 w-5" />
                Sign Out of Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
