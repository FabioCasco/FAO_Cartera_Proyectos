import "./globals.css";
import "./operational.css";
import "./operational-v03.css";
import "./geoportal-v2.css";
import { AppShell } from "@/components/app-shell";
import { AuthProvider, OperationalGate } from "@/components/auth-provider";

export const metadata = {
  title: "Geoportal de Proyectos | FAO Honduras",
  description:
    "Sistema protegido para inteligencia, monitoreo y visualización territorial de la cartera de proyectos de FAO Honduras.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <OperationalGate>
            <AppShell>{children}</AppShell>
          </OperationalGate>
        </AuthProvider>
      </body>
    </html>
  );
}
