import "../styles/globals.css";
import QueryProvider from "@/components/QueryProvider";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "HK Fabric - Courier & COD Management",
  description: "Master database and backend architecture for HK Fabric",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HK Fabric",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F8FAFC]" suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
