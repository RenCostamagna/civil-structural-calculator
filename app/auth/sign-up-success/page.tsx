import Link from "next/link"
import { Building2, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl text-foreground">Registro Exitoso</CardTitle>
          <CardDescription className="text-muted-foreground">
            Su cuenta ha sido creada correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            Hemos enviado un correo de confirmacion a su direccion de email.
            Por favor, verifique su bandeja de entrada y haga clic en el enlace
            de confirmacion para activar su cuenta.
          </p>
          <Link href="/auth/login">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio de sesion
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
