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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased bg-[#F8FAFC]" suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                if ("${process.env.NODE_ENV}" === "development") {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for (var registration of registrations) {
                      registration.unregister();
                    }
                  });
                  if (typeof caches !== 'undefined') {
                    caches.keys().then(function(names) {
                      for (var name of names) caches.delete(name);
                    });
                  }
                } else {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
