# Geoportal de Proyectos FAO Honduras · Piloto operativo 0.5

Aplicación protegida para organizar, visualizar y monitorear la cartera de proyectos de FAO Honduras.

## Funciones

- Supabase Auth con sesión persistente y validación silenciosa en segundo plano.
- Operadores autorizados mediante RLS.
- Dashboard y cartera conectados a PostgreSQL.
- Alta transaccional de proyectos.
- Borrador local automático del formulario de registro.
- Persistencia de pasos, filtros, tipo de vista, mapa base y posición del visor.
- Cortes técnicos y financieros históricos.
- Resultados, componentes, indicadores y RRHH priorizados para monitoreo de cartera.
- Geoportal con límites administrativos, convergencias territoriales y coberturas vectoriales.
- Evidencias en Supabase Storage privado.
- Edición y eliminación lógica auditable de proyectos.

## Persistencia de la experiencia

La aplicación conserva en el navegador:

- El paso y los campos del proyecto que se está preparando.
- Los filtros y la vista de la cartera.
- Los filtros, representación, mapa base y posición del Geoportal.
- La posición vertical de cada ruta durante la sesión.

El borrador del formulario no es todavía un proyecto institucional: se almacena únicamente en el navegador del operador. Al presionar **Registrar proyecto**, la información se envía a Supabase mediante la función transaccional correspondiente. Los archivos seleccionados no pueden sobrevivir una recarga completa por restricciones de seguridad del navegador y deben seleccionarse nuevamente.

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

Aplique las migraciones de `supabase/migrations` en orden. Las migraciones operativas añaden autorización, auditoría, almacenamiento privado, análisis territorial, edición y eliminación lógica.

## Publicación

La versión operativa se compila y publica automáticamente en GitHub Pages mediante el workflow `Deploy Geoportal to GitHub Pages`.
