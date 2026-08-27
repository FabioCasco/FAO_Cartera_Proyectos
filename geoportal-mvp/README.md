# Geoportal de Proyectos FAO Honduras · MVP operativo 0.2

Aplicación protegida para organizar, visualizar y monitorear la cartera de proyectos de FAO Honduras.

## Funciones

- Supabase Auth con sesión persistente.
- Operadores autorizados mediante RLS.
- Dashboard y cartera conectados a PostgreSQL.
- Alta transaccional de proyectos.
- Cortes técnicos y financieros históricos.
- Marco lógico, componentes, indicadores y RRHH.
- Geoportal con convergencias territoriales.
- Evidencias en Supabase Storage privado.
- Eliminación lógica de proyectos no DEMO.

## Desarrollo local

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xweafcknhbaxpnfeniiq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_DEPLOYMENT_MODE=operational
```

Nunca utilice una `service_role` o secret key en variables `NEXT_PUBLIC_*`.

## Base de datos

Aplique las migraciones de `supabase/migrations` en orden. La migración operacional añade autorización, auditoría, almacenamiento privado y eliminación lógica.

## Publicación

La versión operativa se compila y publica automáticamente en GitHub Pages mediante el workflow `Deploy Geoportal to GitHub Pages`.
