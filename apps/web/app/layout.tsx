import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";
import { ClientLayout } from "@/components/client-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AuditFlow AI - Automated Accounting & Audit System",
  description: "Automated reconciliation and audit platform for Indian businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-right" richColors />
        </ClientLayout>
      </body>
    </html>
  );
}
