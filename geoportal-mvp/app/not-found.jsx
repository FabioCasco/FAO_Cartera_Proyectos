import Link from "next/link";
export default function NotFound() { return <div className="empty-state"><strong>Contenido no encontrado</strong><p>La ruta o el proyecto solicitado no está disponible.</p><Link className="primary-button" href="/projects">Volver a la cartera</Link></div>; }
