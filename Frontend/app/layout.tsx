// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
// Removed Google Fonts import to avoid network issues during build
import "./globals.css";
import dynamic from "next/dynamic";
import { ThemeProvider } from "next-themes";
// Mengambil nama aplikasi dan ikon dari environment variables atau menggunakan nilai default
const AppName = process.env.NEXT_PUBLIC_APP_NAME || "IOT Containment System";

// Using system fonts instead of Google Fonts

export const metadata: Metadata = {
  title: `${AppName} | Containment`,
  description: "IOT Monitoring and Management System",
  icons: {
    icon: "/IOT.ico", // Menggunakan path langsung, variabel IconTabs tidak diperlukan
    shortcut: "/IOT.ico",
    apple: "/apple-touch-icon.png",
  },
};

// ClientLayout dimuat secara dinamis dengan SSR dinonaktifkan
// Ini penting karena ClientLayout menggunakan hooks yang hanya berjalan di sisi klien
const ClientLayout = dynamic(() => import("@/components/ClientLayout"), {
  ssr: false,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class" // Menggunakan class HTML untuk theme (misal: "dark")
          defaultTheme="dark" // Theme default
          enableSystem // Memungkinkan sistem OS menentukan theme
        >
          {/* Semua konten aplikasi dibungkus oleh ClientLayout */}
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
