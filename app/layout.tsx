import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import 'leaflet/dist/leaflet.css';
import MainLayout from "@/components/MainLayout";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"], display: "swap", preload: true });

export const metadata: Metadata = {
  title: "Panchayat Road and Building Division, Bhavnagar",
  description: "Tender Management System for Panchayat Road and Building Division, Bhavnagar",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

// NOTE: intentionally NOT async and does NOT call auth() here. Fetching the
// session in the root layout forces every page dynamic and serializes the
// whole tree behind one DB round-trip. SessionProvider hydrates client-side
// via MainLayout's useSession() instead, so static shells can prerender.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen antialiased`}>
        <AuthProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
