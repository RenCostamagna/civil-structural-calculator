"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getProjects() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching projects:", error)
    return []
  }
  return data ?? []
}

export async function saveProject(formData: {
  name: string
  description?: string
  moduleType: string
  inputData: Record<string, unknown>
  results?: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: formData.name,
      description: formData.description || null,
      module_type: formData.moduleType,
      input_data: formData.inputData,
      results: formData.results || null,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/proyectos")
  return data
}

export async function updateProject(
  projectId: string,
  formData: {
    name?: string
    description?: string
    inputData?: Record<string, unknown>
    results?: Record<string, unknown>
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (formData.name) updateData.name = formData.name
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.inputData) updateData.input_data = formData.inputData
  if (formData.results) updateData.results = formData.results

  const { data, error } = await supabase
    .from("projects")
    .update(updateData)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/proyectos")
  return data
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/proyectos")
}

export async function getProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (error) return null
  return data
}
