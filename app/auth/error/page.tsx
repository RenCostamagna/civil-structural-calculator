import Link from "next/link"
import { Building2, AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl text-foreground">Error de Autenticacion</CardTitle>
          <CardDescription className="text-muted-foreground">
            Ocurrio un error durante el proceso de autenticacion
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            El enlace puede haber expirado o ser invalido.
            Intente nuevamente o contacte al soporte si el problema persiste.
          </p>
          <div className="flex gap-3">
            <Link href="/auth/login">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Iniciar sesion
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="gap-2">
                Registrarse
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
