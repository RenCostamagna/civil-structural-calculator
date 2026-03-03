"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/")
}

export async function signUpAction(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("full_name") as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ""}/`,
      data: { full_name: fullName },
    },
  })

  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/auth/sign-up-success")
}

export async function forgotPasswordAction(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get("email") as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo:
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
      `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ""}/auth/reset-password`,
  })

  if (error) {
    redirect(`/auth/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/auth/forgot-password?success=true")
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
