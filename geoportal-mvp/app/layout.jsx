import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: "Geoportal de Proyectos | FAO Honduras",
  description: "MVP para inteligencia, monitoreo y visualización territorial de la cartera de proyectos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
