"use client"

import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCcw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <Card className="border-red-500/20 bg-red-500/5 m-4">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Error en el modulo</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                {this.state.error?.message || "Se produjo un error inesperado en el calculo."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="gap-2"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
