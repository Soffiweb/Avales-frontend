import "./css/style.css";

import { Inter } from "next/font/google";
import Theme from "./providers/theme-provider";
import AppProvider from "./providers/app-provider";
import { AuthProvider } from "./providers/auth-provider";
import { QueryProvider } from "./providers/query-provider";
import { MaintenanceScreen } from "@/components/ui/maintenance-screen";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const MAINTENANCE_MODE = true;

export const metadata = {
  title: "Avales App",
  description: "Aplicación de gestión de avales",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-EC" className={inter.variable} suppressHydrationWarning>
      <body className="font-inter antialiased bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        {MAINTENANCE_MODE ? (
          <MaintenanceScreen />
        ) : (
          <Theme>
            <QueryProvider>
              <AuthProvider>
                <AppProvider>{children}</AppProvider>
              </AuthProvider>
            </QueryProvider>
          </Theme>
        )}
      </body>
    </html>
  );
}
