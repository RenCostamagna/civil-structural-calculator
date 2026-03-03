"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Bot, User, Send, Eraser, Loader2,
  CheckCircle2, AlertTriangle, XCircle,
  BookOpen, ClipboardCheck, FileText, Wrench,
} from "lucide-react"

const SUGGESTED_QUESTIONS = [
  "Explica las 3 ecuaciones de punzonado CIRSOC 11.12.2",
  "Cuando debo usar armadura superior en una zapata?",
  "Como verifico el vuelco en una base con momento?",
  "Cual es la cuantia minima para fundaciones?",
  "Explica las combinaciones ELU del CIRSOC 601",
  "Busca info sobre mensula corta CIRSOC 11.9",
]

/* ---- Tool Result Renderers ---- */

function ReviewResult({ data }: { data: Record<string, unknown> }) {
  const status = data.status as string
  const critical = (data.critical as string[]) || []
  const failures = (data.failures as string[]) || []
  const suggestions = (data.suggestions as string[]) || []
  const allPass = status === "CUMPLE"

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardCheck className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Revision de Calculo</span>
        <Badge variant={allPass ? "default" : "destructive"} className="ml-auto text-[10px]">
          {status}
        </Badge>
      </div>
      {failures.length > 0 && (
        <div className="mb-2">
          <span className="text-[10px] font-medium text-red-400 uppercase">Fallas:</span>
          {failures.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
              <XCircle className="h-3 w-3 shrink-0" /> {f}
            </div>
          ))}
        </div>
      )}
      {critical.length > 0 && (
        <div className="mb-2">
          <span className="text-[10px] font-medium text-amber-400 uppercase">Criticos:</span>
          {critical.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-amber-400 mt-1">
              <AlertTriangle className="h-3 w-3 shrink-0" /> {c}
            </div>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div>
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Sugerencias:</span>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" /> {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LookupResult({ data }: { data: Record<string, unknown> }) {
  const articles = (data.articles as string[]) || []
  const formulas = (data.formulas as string[]) || []
  const limits = (data.limits as string[]) || []

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Referencia CIRSOC</span>
      </div>
      {articles.map((a, i) => (
        <div key={i} className="text-xs text-foreground font-medium mb-1">{a}</div>
      ))}
      {formulas.length > 0 && (
        <div className="mt-2 rounded bg-secondary/50 p-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Formulas:</span>
          {formulas.map((f, i) => (
            <div key={i} className="text-xs font-mono text-primary mt-1">{f}</div>
          ))}
        </div>
      )}
      {limits.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Limites:</span>
          {limits.map((l, i) => (
            <div key={i} className="text-xs text-muted-foreground mt-1">{l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReportResult({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string
  const project = data.project as string
  const date = data.date as string
  const status = data.status as string
  const summary = data.summary as string
  const note = data.note as string
  const table = (data.verificationTable as Array<{ item: string; ratio: string; result: string }>) || []

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <div className="flex gap-4 text-[10px] text-muted-foreground mb-2">
        <span>Proyecto: {project}</span>
        <span>Fecha: {date}</span>
      </div>
      <Badge variant={status.includes("CONFORME") && !status.includes("NO") ? "default" : "destructive"} className="text-[10px] mb-2">
        {status}
      </Badge>
      <p className="text-xs text-muted-foreground mb-2">{summary}</p>
      {table.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-1 pr-3">Verificacion</th>
                <th className="pb-1 pr-3 text-center">Ratio</th>
                <th className="pb-1 text-center">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1 pr-3 text-foreground">{row.item}</td>
                  <td className="py-1 pr-3 text-center font-mono">{row.ratio}</td>
                  <td className={`py-1 text-center font-medium ${row.result === "OK" ? "text-emerald-400" : "text-red-400"}`}>
                    {row.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground italic">{note}</p>
    </div>
  )
}

function ToolInvocationPart({ part }: { part: { type: "tool-invocation"; toolInvocation: { toolName: string; state: string; args?: Record<string, unknown>; output?: unknown } } }) {
  const { toolName, state, output } = part.toolInvocation

  if (state === "output-available" && output) {
    const data = output as Record<string, unknown>
    if (toolName === "reviewCalculation") return <ReviewResult data={data} />
    if (toolName === "lookupCIRSOC") return <LookupResult data={data} />
    if (toolName === "generateReport") return <ReportResult data={data} />
  }

  // Show loading state
  const toolLabels: Record<string, string> = {
    reviewCalculation: "Revisando calculo...",
    lookupCIRSOC: "Consultando norma CIRSOC...",
    generateReport: "Generando reporte...",
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
      <Wrench className="h-3 w-3 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground">{toolLabels[toolName] || `Ejecutando ${toolName}...`}</span>
    </div>
  )
}

/* ---- Main Chat ---- */

export function AiChat() {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  function handleSuggestion(q: string) {
    if (isLoading) return
    sendMessage({ text: q })
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              IA
            </Badge>
            <h1 className="text-xl font-bold text-foreground">
              Asistente Estructural
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta sobre normas CIRSOC, verificaciones y diseno de fundaciones. Pide revisar calculos o generar reportes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMessages([])}
          className="gap-2 text-muted-foreground"
        >
          <Eraser className="h-3.5 w-3.5" /> Limpiar
        </Button>
      </div>

      <Separator />

      {/* Messages area */}
      <Card className="flex-1 border-border bg-card overflow-hidden">
        <ScrollArea className="h-[calc(100vh-340px)]" ref={scrollRef}>
          <CardContent className="flex flex-col gap-4 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-6 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-foreground">
                    Asistente de Calculo Estructural
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-muted-foreground">
                    Especializado en fundaciones, normas CIRSOC 201-05 y
                    601/102. Puede revisar calculos, buscar normas y generar
                    reportes tecnicos.
                  </p>
                </div>

                {/* Suggestions */}
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSuggestion(q)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[85%] flex flex-col gap-2 ${message.role === "user" ? "items-end" : ""}`}>
                    {message.parts.map((part, index) => {
                      if (part.type === "text" && part.text.trim()) {
                        return (
                          <div
                            key={index}
                            className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {part.text}
                          </div>
                        )
                      }
                      if (part.type === "tool-invocation") {
                        return <ToolInvocationPart key={index} part={part as unknown as { type: "tool-invocation"; toolInvocation: { toolName: string; state: string; args?: Record<string, unknown>; output?: unknown } }} />
                      }
                      return null
                    })}
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Analizando...
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre normas CIRSOC, pedi revisar un calculo, o genera un reporte..."
          className="min-h-10 max-h-24 flex-1 resize-none bg-card"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="h-10 w-10 shrink-0">
          <Send className="h-4 w-4" />
          <span className="sr-only">Enviar mensaje</span>
        </Button>
      </form>
    </div>
  )
}
