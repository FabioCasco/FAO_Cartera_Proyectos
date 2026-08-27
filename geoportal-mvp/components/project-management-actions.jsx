"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Trash2 } from "lucide-react";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { getProject } from "@/lib/data";

export function ProjectManagementActions({ id }) {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getProject(id)
      .then((data) => {
        if (active) setProject(data.project);
      })
      .catch(() => {
        if (active) setProject(null);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!project) return null;

  return (
    <>
      <section className="project-management-bar">
        <div>
          <ShieldCheck size={16} />
          <span>
            Proyecto administrado desde Supabase · {project.is_demo ? "DEMO protegido" : "registro operativo"}
          </span>
        </div>
        {!project.is_demo && (
          <button
            className="danger-button danger-button--quiet"
            onClick={() => setDeleteOpen(true)}
            type="button"
          >
            <Trash2 size={15} /> Eliminar proyecto
          </button>
        )}
      </section>

      <DeleteProjectDialog
        key={project.id}
        open={deleteOpen}
        project={project}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => router.push("/projects")}
      />
    </>
  );
}
