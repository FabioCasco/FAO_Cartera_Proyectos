# Arquitectura funcional

```text
Next.js / React
├── Centro de mando
├── Cartera de proyectos
├── Geoportal municipal
├── Ficha Proyecto 360°
└── Alta y actualización progresiva
        │
        ▼
Supabase
├── PostgreSQL + PostGIS
├── Vistas agregadas
├── RPC transaccionales
├── Storage de evidencias
└── Cortes técnicos y financieros históricos
```

## Reglas de interpretación

1. El presupuesto se contabiliza una sola vez bajo el área principal.
2. Las áreas secundarias expresan contribución, no duplicación del monto.
3. Una ubicación municipal indica presencia; no equivale automáticamente a inversión municipal.
4. Las superposiciones se calculan con proyectos distintos por municipio.
5. Gasto y compromisos se mantienen separados.
6. El avance técnico se conserva como serie histórica, no como un único porcentaje sobrescrito.
7. RRHH se modela como persona y asignación para evitar confundir personas únicas con dedicaciones por proyecto.
