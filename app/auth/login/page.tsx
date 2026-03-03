import Link from "next/link"
import { Building2 } from "lucide-react"
import { loginAction } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams
  const error = searchParams.error

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl text-foreground">Iniciar Sesion</CardTitle>
          <CardDescription className="text-muted-foreground">
            Ingrese a su cuenta de CalcFund
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {decodeURIComponent(error)}
            </div>
          )}
          <form action={loginAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-foreground">Correo electronico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ingeniero@ejemplo.com"
                required
                className="bg-input text-foreground"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">Contrasena</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Olvide mi contrasena
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                required
                className="bg-input text-foreground"
              />
            </div>
            <Button type="submit" className="w-full">
              Ingresar
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No tiene cuenta?{" "}
            <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">
              Registrarse
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
