"use client"

import Link from "next/link"
import {
  Square,
  RotateCcw,
  MoveHorizontal,
  Columns2,
  Minus,
  Link2,
  RectangleHorizontal,
  ArrowDownToLine,
  ArrowRight,
  Lock,
} from "lucide-react"
import { MODULES } from "@/lib/constants/cirsoc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const iconMap: Record<string, React.ElementType> = {
  square: Square,
  "rotate-ccw": RotateCcw,
  "move-horizontal": MoveHorizontal,
  "columns-2": Columns2,
  minus: Minus,
  link: Link2,
  "rectangle-horizontal": RectangleHorizontal,
  "arrow-down-to-line": ArrowDownToLine,
}

export function DashboardContent() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:gap-8 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground text-balance sm:text-2xl">
          Calculo Estructural de Fundaciones
        </h1>
        <p className="mt-1 text-xs text-muted-foreground text-pretty sm:text-sm">
          Seleccione un modulo de calculo para comenzar. Basado en CIRSOC 201-05 y
          CIRSOC 601/102.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Modulos disponibles
            </span>
            <span className="text-2xl font-bold text-foreground">
              {MODULES.filter((m) => m.available).length}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}/ {MODULES.length}
              </span>
            </span>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Norma principal
            </span>
            <span className="text-2xl font-bold text-foreground">
              CIRSOC 201
            </span>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Acero
            </span>
            <span className="text-2xl font-bold text-foreground">
              ADN 420
            </span>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Asistente IA
            </span>
            <span className="text-sm font-bold text-primary">
              Consultas + Revision + Reportes
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <Link href="/modulos/m1" className="group">
          <Card className="border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Square className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Zapata Centrada</p>
                <p className="text-xs text-muted-foreground">Modulo mas usado</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/modulos/m2" className="group">
          <Card className="border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Zapata con Momento</p>
                <p className="text-xs text-muted-foreground">Carga excentrica</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/chat" className="group">
          <Card className="border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6V2H8" /><path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Asistente IA</p>
                <p className="text-xs text-muted-foreground">Consultas CIRSOC</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Module Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Todos los Modulos
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MODULES.map((mod) => {
            const Icon = iconMap[mod.icon] || Square
            const isAvailable = mod.available

            const cardContent = (
              <Card
                className={`group relative border-border transition-all duration-200 ${
                  isAvailable
                    ? "bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                    : "bg-muted/30 opacity-60 cursor-not-allowed"
                }`}
              >
                <CardHeader className="flex flex-row items-start gap-3 pb-2">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isAvailable
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {mod.code}
                      </CardTitle>
                      {!isAvailable && (
                        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                          <Lock className="h-2.5 w-2.5" />
                          Proximamente
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {mod.name}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                    {mod.description}
                  </p>
                  {isAvailable && (
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      Iniciar calculo
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )

            if (!isAvailable) return <div key={mod.id}>{cardContent}</div>

            return (
              <Link key={mod.id} href={`/modulos/${mod.id}`}>
                {cardContent}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
