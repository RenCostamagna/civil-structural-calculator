"use client"

import { useState } from "react"
import Link from "next/link"
import { MODULES } from "@/lib/constants/cirsoc"
import { deleteProject } from "@/app/proyectos/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { FolderOpen, Trash2, ExternalLink, Clock } from "lucide-react"

interface ProjectRow {
  id: string
  name: string
  description: string | null
  module_type: string
  input_data: Record<string, unknown>
  results: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function ProjectsList({ initialProjects }: { initialProjects: ProjectRow[] }) {
  const [projects, setProjects] = useState(initialProjects)

  async function handleDelete(id: string) {
    try {
      await deleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error("Error deleting project:", err)
    }
  }

  const getModuleLabel = (moduleType: string) => {
    const mod = MODULES.find((m) => m.id === moduleType)
    return mod ? `${mod.code}: ${mod.name}` : moduleType
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
          Mis Proyectos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Proyectos guardados de calculo estructural. Total: {projects.length}
        </p>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No tiene proyectos guardados aun. Inicie un calculo desde el Dashboard
              y guarde los resultados.
            </p>
            <Link href="/">
              <Button variant="outline" size="sm">Ir al Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group border-border bg-card transition-all hover:border-primary/40 hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    {project.name}
                  </CardTitle>
                  {project.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="ml-2 text-[10px] shrink-0">
                  {getModuleLabel(project.module_type)}
                </Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(project.updated_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/modulos/${project.module_type}?project=${project.id}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="sr-only">Abrir proyecto</span>
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Eliminar proyecto</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar proyecto</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta accion eliminara permanentemente el proyecto &quot;{project.name}&quot;
                          y todos sus datos asociados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(project.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
