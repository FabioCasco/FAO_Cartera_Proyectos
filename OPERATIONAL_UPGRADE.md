# FAO-HN-GeoHub · MVP operativo 0.2

Esta versión mantiene la publicación en GitHub Pages y utiliza Supabase como backend central protegido.

## Arquitectura

```text
GitHub Pages
├── Inicio de sesión
├── Centro de mando
├── Cartera
├── Geoportal
├── Proyecto 360°
├── Alta de proyectos
└── Eliminación lógica
        │
        ▼
Supabase Auth + RLS
        │
        ▼
PostgreSQL / PostGIS / Storage
```

## Cambios principales

- La información requiere una sesión de Supabase Auth.
- Los usuarios autorizados se registran en `private.portfolio_operators`.
- Los proyectos se crean mediante `portfolio_create_project_bundle`.
- Las actualizaciones se registran mediante `portfolio_record_project_update`.
- La eliminación utiliza `portfolio_delete_project` y conserva auditoría.
- Los proyectos `is_demo=true` no se pueden eliminar desde la aplicación.
- Los documentos utilizan un bucket privado y URLs firmadas.
- El mapa incorpora un estilo raster controlado, marcadores robustos y una vista de respaldo.

## Despliegue

La URL permanece:

`https://fabiocasco.github.io/FAO_Cartera_Proyectos/`

El workflow `.github/workflows/deploy-pages.yml` compila en modo `operational`.

## Requisito de base de datos

Antes de publicar la interfaz debe ejecutarse:

`geoportal-mvp/supabase/migrations/202608270001_operational_auth_soft_delete.sql`
