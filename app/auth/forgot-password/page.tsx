import Link from "next/link"
import { Building2, ArrowLeft, CheckCircle2 } from "lucide-react"
import { forgotPasswordAction } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function ForgotPasswordPage(props: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const searchParams = await props.searchParams
  const error = searchParams.error
  const success = searchParams.success

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl text-foreground">Recuperar Contrasena</CardTitle>
          <CardDescription className="text-muted-foreground">
            Le enviaremos un enlace para restablecer su contrasena
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {decodeURIComponent(error)}
            </div>
          )}
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-sm text-foreground">
                Se envio un enlace de recuperacion a su correo electronico.
                Revise su bandeja de entrada.
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="mt-2 gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesion
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <form action={forgotPasswordAction} className="flex flex-col gap-4">
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
                <Button type="submit" className="w-full">
                  Enviar enlace de recuperacion
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link href="/auth/login" className="font-medium text-primary hover:underline">
                  Volver al inicio de sesion
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
