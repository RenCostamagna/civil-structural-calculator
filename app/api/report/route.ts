import {
  convertToModelMessages,
  streamText,
  UIMessage,
} from "ai"

export const maxDuration = 60

const REPORT_SYSTEM = `Eres un generador de informes tecnicos de ingenieria estructural. 
Generas memorias de calculo profesionales segun normas CIRSOC 201-05 y 601/102.

FORMATO DEL INFORME:
1. CARATULA: Titulo, proyecto, fecha, norma aplicable
2. DATOS DE ENTRADA: Cargas, materiales, geometria
3. DIMENSIONAMIENTO: Pre-dimensionado adoptado
4. VERIFICACIONES: Tabla con cada verificacion, ratio, resultado
5. ARMADURAS: Seccion, As requerido, armadura adoptada, separacion
6. CONCLUSION: Estado general (CONFORME/NO CONFORME)
7. NOTA: Siempre incluir que debe ser verificado por profesional matriculado.

Niveles de detalle:
- "resumido": Solo tabla de verificaciones y armaduras adoptadas
- "standard": Incluye formulas principales y pasos intermedios  
- "detallado": Todas las formulas, pasos, graficos descriptivos, procedimiento constructivo

Responde en espanol tecnico. Formato Markdown.`

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, reportType, detailLevel, moduleData } = body as {
    messages: UIMessage[]
    reportType: string
    detailLevel: string
    moduleData: Record<string, unknown>
  }

  const contextMessage = `
Genera un informe tipo "${reportType}" con nivel de detalle "${detailLevel}".
Datos del modulo: ${JSON.stringify(moduleData, null, 2)}
`

  const allMessages: UIMessage[] = [
    ...messages,
    { id: "ctx", role: "user" as const, parts: [{ type: "text" as const, text: contextMessage }] },
  ]

  const result = streamText({
    model: "openai/gpt-5-mini",
    system: REPORT_SYSTEM,
    messages: await convertToModelMessages(allMessages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse()
}
