# Estado de desarrollo · Geoportal de Proyectos FAO Honduras

## Componentes disponibles

- Backend Supabase activo en el proyecto `Geoportal` (`xweafcknhbaxpnfeniiq`).
- PostgreSQL + PostGIS.
- Modelo relacional para proyectos, Cuatro Mejoras, componentes, resultados, indicadores, RRHH, ubicaciones, finanzas, actualizaciones, riesgos, hitos y evidencias.
- Vistas agregadas para dashboard, cartera y geoportal.
- Funciones transaccionales para alta completa de proyectos y registro de cortes periódicos.
- Bucket `portfolio-assets` para fotografías y documentos.
- Seis proyectos demostrativos claramente identificados como `DEMO`.
- Generador reproducible del frontend: `bootstrap-geoportal-v1.sh`.
- Flujos de GitHub Actions para materialización, lint y compilación.

## Generar la aplicación manualmente

Desde la raíz del repositorio:

```bash
bash bootstrap-geoportal-v1.sh geoportal-mvp
cd geoportal-mvp
npm install
cp .env.example .env.local
npm run dev
```

Para validar una compilación de producción:

```bash
npm run lint
npm run build
```

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://xweafcknhbaxpnfeniiq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_HONDURAS_ADM2_GEOJSON_URL=https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/HND/ADM2/geoBoundaries-HND-ADM2_simplified.geojson
```

Use únicamente una clave publicable en el navegador. Nunca exponga una clave `service_role`.

## Alcance funcional del MVP

1. Centro de mando ejecutivo.
2. Cartera con búsqueda y filtros.
3. Geoportal oscuro de Honduras con convergencias por municipio.
4. Ficha Proyecto 360°.
5. Marco lógico e indicadores.
6. Registro progresivo de proyectos.
7. Captura de coordenadas en mapa.
8. Fotografías y documentos.
9. Cortes técnicos y financieros históricos.
10. Modo demostrativo local si faltan variables de Supabase.

## Reglas de interpretación

- El presupuesto se cuenta una sola vez bajo el área principal.
- Las áreas secundarias no duplican el monto institucional.
- La presencia en un municipio no equivale automáticamente a inversión municipal.
- Las convergencias cuentan proyectos distintos, no registros de ubicación.
- Gasto y compromisos se mantienen separados.
- RRHH distingue personas de asignaciones por proyecto.

## Seguridad

La primera versión omite autenticación y roles por decisión de alcance. Las políticas abiertas de lectura, inserción y actualización son exclusivamente para pruebas funcionales. No deben cargarse datos oficiales, personales, contractuales o sensibles hasta implementar autenticación, permisos y políticas RLS restrictivas.
