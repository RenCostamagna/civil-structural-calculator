import {
  consumeStream,
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  UIMessage,
} from "ai"
import { z } from "zod"

export const maxDuration = 60

const SYSTEM_PROMPT = `Eres un ingeniero estructural experto especializado en calculo de fundaciones segun normas argentinas CIRSOC 201-05 (Hormigon Armado), CIRSOC 601/102 (Combinaciones de carga) y fundaciones profundas (pilotes).

Tu rol es asistir al usuario en:
- Interpretacion de resultados de calculo (zapatas, bases combinadas, cabezales, pilotes)
- Verificaciones: corte viga ancha, punzonado (3 ecuaciones Vc CIRSOC 11.12.2), flexion, cuantia minima, mensula corta (11.9), corte por friccion (11.7)
- Combinaciones ELU (U1=1.4D, U2=1.2D+1.6L, etc.) y ELS
- Seleccion de armaduras comerciales (diametros 6,8,10,12,16,20,25,32 mm)
- Capacidad de pilotes: metodo alpha (cohesivo), beta (granular), punta (Meyerhof/Vesic)
- Resistencia lateral: metodo de Broms (corto/largo, libre/empotrado)
- Modelo biela-tirante para cabezales (Jimenez Montoya)
- Revision critica de calculos: identifica errores, ratios > 0.9 (advertencia), > 1.0 (falla)

CAPACIDADES ESPECIALES:
- Usa la herramienta "reviewCalculation" cuando el usuario pida revisar resultados de un modulo
- Usa la herramienta "lookupCIRSOC" para buscar articulos especificos de la norma
- Usa la herramienta "generateReport" para crear reportes tecnicos

Responde en espanol. Usa terminologia tecnica precisa. Cita secciones (ej: "CIRSOC 201-05, Art. 11.12.2.1").
Formulas en notacion clara. Prioriza seguridad estructural.`

const tools = {
  reviewCalculation: tool({
    description: "Revisa los resultados de calculo de un modulo de fundacion. Identifica verificaciones criticas, ratios peligrosos y sugiere mejoras.",
    inputSchema: z.object({
      moduleId: z.string().describe("ID del modulo (m1-m8)"),
      verifications: z.array(z.object({
        label: z.string(),
        ratio: z.number(),
        pass: z.boolean(),
      })).describe("Lista de verificaciones con sus ratios"),
      dimensions: z.object({
        B: z.number().nullable(),
        L: z.number().nullable(),
        H: z.number().nullable(),
      }).describe("Dimensiones de la fundacion en metros"),
    }),
    execute: async ({ moduleId, verifications, dimensions }) => {
      const critical = verifications.filter((v) => v.ratio > 0.9)
      const failures = verifications.filter((v) => !v.pass)
      const allPass = failures.length === 0

      return {
        status: allPass ? "CUMPLE" : "NO CUMPLE",
        critical: critical.map((v) => `${v.label}: ratio ${v.ratio.toFixed(3)} ${v.pass ? "(advertencia)" : "(FALLA)"}`),
        failures: failures.map((v) => `${v.label}: ratio ${v.ratio.toFixed(3)}`),
        suggestions: [
          ...(!allPass ? ["Aumentar dimensiones de la base o espesor H"] : []),
          ...(critical.length > 0 ? ["Revisar ratios cercanos a 1.0 - considerar margen de seguridad adicional"] : []),
          ...(dimensions.H && dimensions.B ? [`Relacion H/B = ${(dimensions.H / dimensions.B).toFixed(2)} ${dimensions.H / dimensions.B < 0.15 ? "- considerar aumentar H" : ""}`] : []),
        ],
        moduleId,
      }
    },
  }),

  lookupCIRSOC: tool({
    description: "Busca articulos especificos de las normas CIRSOC 201-05 y CIRSOC 601/102",
    inputSchema: z.object({
      topic: z.string().describe("Tema a buscar: punzonado, corte, flexion, combinaciones, cuantia_minima, mensula, friccion, pilotes"),
    }),
    execute: async ({ topic }) => {
      const normDatabase: Record<string, { articles: string[]; formulas: string[]; limits: string[] }> = {
        punzonado: {
          articles: ["CIRSOC 201-05, Art. 11.12.2.1 (a)(b)(c) - Tres ecuaciones Vc"],
          formulas: [
            "Vc1 = (1 + 2/beta_c) * (1/6) * sqrt(f'c) * bo * d",
            "Vc2 = (alpha_s*d/bo + 2) * (1/12) * sqrt(f'c) * bo * d",
            "Vc3 = (1/3) * sqrt(f'c) * bo * d",
            "Vc = min(Vc1, Vc2, Vc3)",
          ],
          limits: ["bo = perimetro critico a d/2 de cara columna", "alpha_s = 40 (interior), 30 (borde), 20 (esquina)", "phi = 0.75"],
        },
        corte: {
          articles: ["CIRSOC 201-05, Art. 11.3 - Corte por viga ancha"],
          formulas: ["Vu = qu * B * (cantilever - d)", "phi*Vc = 0.75 * (1/6) * sqrt(f'c) * B * d"],
          limits: ["Seccion critica a d de cara columna", "phi = 0.75"],
        },
        flexion: {
          articles: ["CIRSOC 201-05, Art. 10.3 - Flexion"],
          formulas: ["Mu = qu * B * L_cant^2 / 2", "As = Mu / (phi * fy * (d - a/2))", "a = As*fy / (0.85*f'c*b)"],
          limits: ["phi = 0.90 para flexion", "As_min = 0.0018*b*h (fy=420 MPa)"],
        },
        combinaciones: {
          articles: ["CIRSOC 601/102 - Combinaciones ELU"],
          formulas: ["U1 = 1.4D", "U2 = 1.2D + 1.6L", "U3 = 1.2D + 1.0L + 1.6Lr", "U5 = 1.2D + 1.0L + 1.0W", "U7 = 0.9D + 1.0W"],
          limits: ["Usar la combinacion mas desfavorable", "ELS: D + L (servicio)"],
        },
        cuantia_minima: {
          articles: ["CIRSOC 201-05, Art. 10.5.1 y 7.12.2.1"],
          formulas: ["rho_min = 0.0018 para fy=420 MPa", "rho_min = max(1.4/fy, 0.25*sqrt(f'c)/fy) para vigas"],
          limits: ["As_min = rho_min * b * d", "Separacion maxima: s <= 3h o 450mm"],
        },
        mensula: {
          articles: ["CIRSOC 201-05, Art. 11.9 - Mensulas cortas"],
          formulas: ["a/d <= 1.0", "Nuc <= Vu", "Asc >= max(Af + An, 2*Avf/3 + An)"],
          limits: ["a = distancia carga a cara columna", "Ah >= 0.5*(Asc - An)", "mu = 1.4 (monolitico), 1.0 (rugoso), 0.6 (liso)"],
        },
        friccion: {
          articles: ["CIRSOC 201-05, Art. 11.7 - Corte por friccion"],
          formulas: ["Vn = Avf * fy * mu", "mu = 1.4 lambda (monolitico)", "Vn <= 0.2*f'c*Ac o 5.5*Ac"],
          limits: ["phi = 0.75", "lambda = 1.0 para hormigon de peso normal"],
        },
        pilotes: {
          articles: ["Metodo alpha (Tomlinson) - cohesivo", "Metodo beta (Burland) - granular", "Broms (1964) - lateral"],
          formulas: ["Qs = Sum(alpha * cu * pi * D * Li)", "Qp = Nc * cu * Ap (cohesivo)", "Qp = Nq * sigma_v * Ap (granular)"],
          limits: ["FS punta = 3.0, FS fuste = 2.0", "FS lateral >= 2.0 (Broms)", "Separacion >= 3D entre pilotes"],
        },
      }

      return normDatabase[topic] || { articles: ["Tema no encontrado"], formulas: [], limits: [] }
    },
  }),

  generateReport: tool({
    description: "Genera un reporte tecnico estructurado de los resultados de calculo",
    inputSchema: z.object({
      projectName: z.string(),
      moduleCode: z.string(),
      moduleName: z.string(),
      results: z.string().describe("Resumen de resultados en texto"),
      verifications: z.array(z.object({
        label: z.string(),
        pass: z.boolean(),
        ratio: z.number(),
      })),
    }),
    execute: async ({ projectName, moduleCode, moduleName, results, verifications }) => {
      const allPass = verifications.every((v) => v.pass)
      const date = new Date().toLocaleDateString("es-AR")
      return {
        title: `Memoria de Calculo - ${moduleCode}: ${moduleName}`,
        project: projectName || "Sin nombre",
        date,
        status: allPass ? "VERIFICACION CONFORME" : "VERIFICACION NO CONFORME",
        summary: results,
        verificationTable: verifications.map((v) => ({
          item: v.label,
          ratio: v.ratio.toFixed(3),
          result: v.pass ? "OK" : "NO CUMPLE",
        })),
        norm: "CIRSOC 201-05 / CIRSOC 601-102",
        note: "Este reporte es generado automaticamente. Debe ser verificado por un profesional matriculado.",
      }
    },
  }),
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: "openai/gpt-5-mini",
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
