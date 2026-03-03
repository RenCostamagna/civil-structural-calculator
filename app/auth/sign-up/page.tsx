import Link from "next/link"
import { Building2 } from "lucide-react"
import { signUpAction } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function SignUpPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams
  const error = searchParams.error

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl text-foreground">Crear Cuenta</CardTitle>
          <CardDescription className="text-muted-foreground">
            Registrese para usar CalcFund
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {decodeURIComponent(error)}
            </div>
          )}
          <form action={signUpAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name" className="text-foreground">Nombre completo</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Ing. Juan Perez"
                required
                className="bg-input text-foreground"
              />
            </div>
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
              <Label htmlFor="password" className="text-foreground">Contrasena</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimo 6 caracteres"
                minLength={6}
                required
                className="bg-input text-foreground"
              />
            </div>
            <Button type="submit" className="w-full">
              Registrarse
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ya tiene cuenta?{" "}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Iniciar sesion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
