# Geoportal de Proyectos FAO Honduras · MVP

Aplicación web para organizar, visualizar y monitorear la cartera de proyectos desde una arquitectura común de programas, recursos, resultados, equipos y territorio.

## Incluye

- Centro de mando ejecutivo.
- Cuatro Mejoras: Producción, Nutrición, Ambiente y Vida.
- Presupuesto, gasto, compromisos, ejecución y avance físico.
- Explorador de cartera con búsqueda y filtros.
- Geoportal oscuro de Honduras con límites municipales y convergencias.
- Ficha Proyecto 360°.
- Matriz de resultados e indicadores.
- Registro progresivo de proyectos.
- Captura de coordenadas mediante mapa.
- Carga de fotografías y documentos a Supabase Storage.
- Cortes periódicos que conservan el historial.
- Modo demostrativo local cuando faltan las variables de Supabase.

## Ejecutar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Backend conectado

La instancia inicial utiliza el proyecto Supabase `Geoportal`. Configure en `.env.local` la URL y una clave publicable. Nunca coloque una clave `service_role` en variables `NEXT_PUBLIC_*`.

## Seguridad

Por decisión de alcance, esta primera versión no incorpora autenticación ni roles. Las políticas de escritura abiertas existen únicamente para probar el flujo funcional. **No cargue datos oficiales, personales, contractuales o sensibles** hasta implementar autenticación, permisos y políticas RLS restrictivas.

## Datos demostrativos

Los proyectos y cifras iniciales están marcados como `DEMO`; no representan información oficial de FAO Honduras.
