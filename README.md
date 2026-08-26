# Geoportal de Proyectos FAO Honduras

Prototipo funcional para organizar, visualizar y monitorear la cartera de proyectos de FAO Honduras desde una arquitectura común de **programas, recursos, resultados, equipos y territorio**.

> **Estado del producto:** MVP técnico y visual. Los seis proyectos cargados inicialmente son registros demostrativos marcados como `DEMO`; no representan cifras oficiales de FAO Honduras.

## Propósito

El sistema está pensado como un centro de inteligencia de cartera para Programas. Permite responder, desde una sola interfaz, preguntas como:

- ¿Cuántos proyectos están registrados en cada una de las Cuatro Mejoras?
- ¿Cuál es el presupuesto, gasto, nivel de utilización y avance físico de la cartera?
- ¿Qué proyectos requieren atención y por qué?
- ¿Qué recursos humanos están asignados a cada proyecto y área programática?
- ¿En qué departamentos y municipios se concentran las intervenciones?
- ¿Dónde coinciden varios proyectos y qué oportunidades de articulación existen?
- ¿Cómo se estructura cada proyecto bajo el enfoque de marco lógico?
- ¿Cómo evolucionan en el tiempo la ejecución financiera y el avance físico?

## Experiencias incluidas

### Centro de mando

- Indicadores ejecutivos de cartera.
- Distribución por Mejor Producción, Mejor Nutrición, Mejor Ambiente y Mejor Vida.
- Presupuesto, gasto y compromisos.
- Serie acumulada de ejecución financiera.
- Alertas por brechas entre tiempo, recursos y resultados.
- Vista resumida de proyectos y territorio.

### Cartera de proyectos

- Búsqueda por nombre, código, donante, coordinador o territorio.
- Filtros por área programática y estado.
- Lectura en tarjetas o tabla ejecutiva.
- Acceso a la ficha integral de cada proyecto.

### Geoportal

- Mapa oscuro de Honduras.
- Límites municipales ADM2.
- Puntos de intervención agrupados dinámicamente.
- Conteo de proyectos distintos por municipio.
- Identificación de municipios donde convergen varios proyectos.
- Filtros por área programática, estado y proyecto.
- Lectura territorial sin duplicar el presupuesto institucional.

### Ficha Proyecto 360°

- Identidad, vigencia, donante y coordinación.
- Presupuesto, gasto, compromisos y saldo.
- Comparación entre tiempo consumido, ejecución y avance físico.
- Componentes del proyecto.
- Resultados e indicadores del marco lógico.
- Equipo y dedicación por proyecto.
- Intervenciones geográficas.
- Riesgos, hitos y evidencias.
- Historial de cortes técnicos y financieros.

### Registro de proyectos

Formulario progresivo para capturar:

1. Identidad y alineamiento programático.
2. Presupuesto, ejecución inicial y componentes.
3. Resultados e indicadores.
4. Ubicaciones mediante coordenadas o selección en mapa.
5. Recursos humanos, fotografías y documentos.

El alta se ejecuta como una transacción en PostgreSQL mediante la función `portfolio_create_project_bundle`, evitando proyectos parcialmente creados cuando una validación falla.

## Arquitectura técnica

```text
┌──────────────────────────────────────────────────────┐
│ Next.js 16 · React 19 · TypeScript                   │
│ Dashboard · Cartera · Geoportal · Proyecto 360°     │
└───────────────────────┬──────────────────────────────┘
                        │ Supabase Data API / Storage
┌───────────────────────▼──────────────────────────────┐
│ Supabase                                             │
│ PostgreSQL 17 · PostGIS · RLS · Storage · RPC        │
├──────────────────────────────────────────────────────┤
│ Proyectos · Cuatro Mejoras · Finanzas · RRHH         │
│ Componentes · Resultados · Indicadores · Riesgos     │
│ Hitos · Evidencias · Ubicaciones · Cortes históricos │
└──────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│ MapLibre GL · CARTO Dark · geoBoundaries ADM2        │
└──────────────────────────────────────────────────────┘
```

## Modelo de información

La base evita guardar todo el proyecto en una sola tabla. La entidad `portfolio_projects` se relaciona con:

- `portfolio_project_programmatic_areas`
- `portfolio_project_components`
- `portfolio_results`
- `portfolio_indicators`
- `portfolio_indicator_measurements`
- `portfolio_staff_members` y `portfolio_project_staff`
- `portfolio_project_locations`
- `portfolio_financial_snapshots`
- `portfolio_project_updates`
- `portfolio_risks`
- `portfolio_project_milestones`
- `portfolio_project_assets`

Las vistas `portfolio_project_summary` y `portfolio_area_summary` consolidan los datos requeridos por el dashboard sin duplicar el presupuesto entre áreas secundarias.

## Historial y actualización

El sistema no sobrescribe el último porcentaje como único dato. Cada actualización crea o reemplaza un corte fechado en:

- `portfolio_financial_snapshots`
- `portfolio_project_updates`

La función `portfolio_record_project_update` registra conjuntamente el corte técnico y financiero, por lo que el portal puede reconstruir tendencias y comparar períodos.

## Puesta en marcha

### Requisitos

- Node.js 22 o superior.
- npm.
- Un proyecto Supabase.

### Instalación

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

### Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_HONDURAS_ADM2_GEOJSON_URL=https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/HND/ADM2/geoBoundaries-HND-ADM2_simplified.geojson
```

Sin las dos variables de Supabase, la interfaz funciona en modo demostrativo local con información simulada.

## Base de datos

Las migraciones se encuentran en `supabase/migrations`:

1. `202608260001_initial_portfolio_schema.sql`
2. `202608260002_seed_demo_portfolio.sql`
3. `202608260003_project_monitoring_update.sql`
4. `202608260004_performance_indexes.sql`

Para una nueva instancia, aplíquelas en orden mediante Supabase CLI o el editor SQL. El segundo archivo carga únicamente información demostrativa y puede omitirse en una instalación institucional limpia.

## Rutas principales

| Ruta | Función |
|---|---|
| `/` | Centro de mando ejecutivo |
| `/projects` | Explorador de cartera |
| `/projects/new` | Registro estructurado de un proyecto |
| `/projects/[id]` | Ficha Proyecto 360° |
| `/geoportal` | Mapa territorial e interpretación de superposiciones |

## Calidad y verificación

El flujo de GitHub Actions ejecuta:

```bash
npm run typecheck
npm run lint
npm run build
```

La base fue verificada con transacciones de prueba y `ROLLBACK` para confirmar:

- Creación completa de un proyecto con componentes, indicadores, personal y territorio.
- Registro conjunto de cortes técnicos y financieros.
- Conservación de los seis proyectos demostrativos después de las pruebas.

## Seguridad del MVP

El prototipo omite autenticación y roles por decisión de alcance. Para hacer posible el registro desde el navegador, las políticas actuales permiten lectura, inserción y actualización mediante la clave publicable; no permiten eliminación.

**No deben cargarse datos oficiales, personales, contractuales o sensibles en una publicación abierta mientras continúe este modelo de acceso.** Antes de una puesta en producción institucional se debe:

1. Activar autenticación o SSO.
2. Restringir escritura al personal autorizado.
3. Separar vistas públicas y datos internos.
4. Proteger los correos y documentos del equipo.
5. Revisar las políticas RLS por operación y entidad.
6. Configurar copias de seguridad y recuperación.
7. Sustituir todos los registros `DEMO` por datos validados.

## Datos geográficos y atribución

- Visualización: [MapLibre GL JS](https://maplibre.org/).
- Mapa base: CARTO Dark, con datos de OpenStreetMap.
- Límites administrativos: [geoBoundaries](https://www.geoboundaries.org/), capa abierta de Honduras ADM2.

El límite municipal se carga como recurso remoto para mantener ligero el repositorio. En producción conviene versionar una copia institucional, normalizar los códigos municipales y documentar la fecha de corte cartográfica.

## Próximas etapas recomendadas

- Importar la cartera oficial mediante una plantilla controlada.
- Incorporar códigos administrativos oficiales para los 298 municipios.
- Agregar polígonos, corredores, cuencas y paisajes además de puntos.
- Implementar autenticación y permisos.
- Añadir catálogos de donantes, socios, PPA, MPP, ODS y temas transversales.
- Integrar fuentes corporativas y financieras autorizadas.
- Crear validación y aprobación mensual de los cortes.
- Incorporar reportes ejecutivos exportables.
- Desplegar en infraestructura institucional autorizada.

## Licencia

Código distribuido bajo la licencia MIT incluida en este repositorio. Los nombres, emblemas y datos institucionales de FAO están sujetos a sus propias reglas de uso y no se conceden mediante esta licencia.
