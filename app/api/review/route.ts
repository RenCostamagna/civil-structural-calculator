import { generateText, Output } from "ai"
import { z } from "zod"

export const maxDuration = 30

const reviewSchema = z.object({
  status: z.enum(["approved", "observations", "rejected"]),
  overallScore: z.number().describe("Score 0-100"),
  items: z.array(
    z.object({
      check: z.string(),
      status: z.enum(["ok", "warning", "error"]),
      comment: z.string(),
    })
  ),
  summary: z.string(),
  recommendations: z.array(z.string()),
})

export async function POST(req: Request) {
  const { moduleId, inputs, results, verifications } = (await req.json()) as {
    moduleId: string
    inputs: Record<string, unknown>
    results: Record<string, unknown>
    verifications: Array<{ label: string; ratio: number; pass: boolean }>
  }

  const prompt = `Revisa como ingeniero estructural senior los siguientes resultados de calculo del modulo ${moduleId}:

DATOS DE ENTRADA:
${JSON.stringify(inputs, null, 2)}

RESULTADOS:
${JSON.stringify(results, null, 2)}

VERIFICACIONES:
${verifications.map((v) => `- ${v.label}: ratio=${v.ratio.toFixed(3)} ${v.pass ? "OK" : "FALLA"}`).join("\n")}

Evalua:
1. Coherencia dimensional (relaciones H/B, voladizos, recubrimientos)
2. Ratios peligrosos (> 0.85 advertencia, > 1.0 falla)
3. Cuantias de armadura (minima y maxima)
4. Combinaciones de carga correctas
5. Buenas practicas de detallado

Da un score 0-100 y status: approved (>80 sin fallas), observations (60-80 o warnings), rejected (<60 o fallas).`

  const result = await generateText({
    model: "openai/gpt-5-mini",
    output: Output.object({ schema: reviewSchema }),
    prompt,
    abortSignal: req.signal,
  })

  return Response.json(result.output)
}
