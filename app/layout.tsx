import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/MainLayout";
import AuthProvider from "@/components/AuthProvider";
import { auth } from "@/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Panchayat Road and Building Division, Bhavnagar",
  description: "Tender Management System for Panchayat Road and Building Division, Bhavnagar",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen transition-colors duration-300`}>
        <AuthProvider session={session}>
          <MainLayout>
            {children}
          </MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
