import { AppShell } from "@/components/app-shell"
import { ProjectsList } from "@/components/projects-list"
import { getProjects } from "./actions"

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <AppShell>
      <ProjectsList initialProjects={projects} />
    </AppShell>
  )
}
