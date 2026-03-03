"use client"

import { useState, useMemo } from "react"
import { useWizardStore } from "@/lib/stores/wizard-store"
import { calculateM1 } from "@/lib/calculations/m1-engine"
import { CONCRETE_GRADES, STEEL_GRADES, SOIL_TYPES, COVER_DEFAULTS, MODULES } from "@/lib/constants/cirsoc"
import type { M1Input, M1Results, VerificationStatus } from "@/lib/types/foundation"
import { WizardStepper } from "@/components/wizard-stepper"
import { VerificationSummary } from "@/components/verification-indicator"
import { FootingPlanView, FootingSectionView } from "@/components/footing-diagrams"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Calculator, RotateCcw, Download } from "lucide-react"

const MODULE = MODULES.find((m) => m.id === "m1")!
const STEPS = MODULE.steps

export function M1Wizard() {
  const [step, setStep] = useState(0)
  const { m1Input, updateM1Input } = useWizardStore()
  const [results, setResults] = useState<M1Results | null>(null)

  const input = m1Input as M1Input

  function handleCalculate() {
    try {
      const r = calculateM1({
        projectName: input.projectName || "Sin nombre",
        column: input.column || { width: 30, depth: 30, shape: "rectangular" },
        loads: input.loads || { N: 500 },
        soil: input.soil || { sigmaAdm: 150, gamma_s: 18, Df: 1.2 },
        materials: input.materials || { concreteGrade: "H25", steelGrade: "ADN420", cover: 70 },
      })
      setResults(r)
      setStep(2)
    } catch (e) {
      console.error("Calculation error:", e)
    }
  }

  function handleNext() {
    if (step === 1) {
      handleCalculate()
    } else {
      setStep(Math.min(step + 1, STEPS.length - 1))
    }
  }

  const verifications = useMemo<VerificationStatus[]>(() => {
    if (!results) return []
    return [
      {
        label: "Presion sobre suelo (ELS)",
        value: results.dimensioning.sigmaSol,
        limit: results.dimensioning.sigmaNet,
        ratio: results.dimensioning.ratio,
        pass: results.dimensioning.ratio <= 1.0,
        reference: "σ_sol ≤ σ_net adm",
        severity: results.dimensioning.ratio <= 1.0 ? (results.dimensioning.ratio > 0.9 ? "warning" : "ok") : "error",
      },
      {
        label: "Corte por viga ancha - Dir. X",
        value: results.shearX.Vu,
        limit: results.shearX.phiVc,
        ratio: results.shearX.ratio,
        pass: results.shearX.pass,
        reference: results.shearX.reference,
        severity: results.shearX.pass ? (results.shearX.ratio > 0.9 ? "warning" : "ok") : "error",
      },
      {
        label: "Corte por viga ancha - Dir. Y",
        value: results.shearY.Vu,
        limit: results.shearY.phiVc,
        ratio: results.shearY.ratio,
        pass: results.shearY.pass,
        reference: results.shearY.reference,
        severity: results.shearY.pass ? (results.shearY.ratio > 0.9 ? "warning" : "ok") : "error",
      },
      {
        label: "Punzonado",
        value: results.punching.Vu,
        limit: results.punching.phiVc,
        ratio: results.punching.ratio,
        pass: results.punching.pass,
        reference: results.punching.reference,
        severity: results.punching.pass ? (results.punching.ratio > 0.9 ? "warning" : "ok") : "error",
      },
    ]
  }, [results])

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30 shrink-0">M1</Badge>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">Base Centrada</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Zapata aislada centrada bajo columna con carga axial pura
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStep(0); setResults(null) }} className="gap-2 text-muted-foreground shrink-0">
          <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Reiniciar</span>
        </Button>
      </div>

      {/* Stepper */}
      <WizardStepper steps={STEPS} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />

      <Separator />

      {/* Step Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 0 && (
            <StepInputs input={input} onUpdate={updateM1Input} />
          )}
          {step === 1 && results === null && (
            <StepDimensioning input={input} onCalculate={handleCalculate} />
          )}
          {step === 2 && results && (
            <StepVerifications verifications={verifications} results={results} />
          )}
          {step === 3 && results && (
            <StepReinforcement results={results} />
          )}
          {step === 4 && results && (
            <StepSummary input={input} results={results} verifications={verifications} />
          )}
        </div>

        {/* Side panel - Diagrams */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
          {(results || step > 0) && (
            <>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">Vista en planta</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center px-2 sm:px-6">
                  <FootingPlanView
                    B={results?.dimensioning.B || 1.5}
                    L={results?.dimensioning.L || 1.5}
                    colX={input.column?.width || 30}
                    colY={input.column?.depth || 30}
                  />
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">Corte transversal</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center px-2 sm:px-6">
                  <FootingSectionView
                    B={results?.dimensioning.B || 1.5}
                    H={results?.dimensioning.H || 0.4}
                    colX={input.column?.width || 30}
                    d={results?.dimensioning.d}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <Separator />
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(Math.max(step - 1, 0))}
          disabled={step === 0}
          className="gap-1.5 sm:gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> <span className="hidden xs:inline">Anterior</span>
        </Button>
        <span className="text-[10px] text-muted-foreground sm:text-xs">
          Paso {step + 1} de {STEPS.length}
        </span>
        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={handleNext} className="gap-1.5 sm:gap-2">
            {step === 1 && !results ? (
              <>
                <Calculator className="h-4 w-4" /> Calcular
              </>
            ) : (
              <>
                <span className="hidden xs:inline">Siguiente</span> <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2">
            <Download className="h-4 w-4" /> <span className="hidden xs:inline">Exportar PDF</span>
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Step 0: Input Data ──────────────────────────────────────────────
function StepInputs({
  input,
  onUpdate,
}: {
  input: M1Input
  onUpdate: (data: Partial<M1Input>) => void
}) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Project Name */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="projectName" className="text-xs text-muted-foreground">Nombre del proyecto</Label>
          <Input
            id="projectName"
            value={input.projectName || ""}
            onChange={(e) => onUpdate({ projectName: e.target.value })}
            placeholder="Ej: Edificio San Martin - Zapata Z1"
            className="mt-1"
          />
        </CardContent>
      </Card>

      {/* Column */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Columna (Fuste)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="colWidth" className="text-xs text-muted-foreground">Ancho (cm)</Label>
            <Input
              id="colWidth"
              type="number"
              value={input.column?.width || 30}
              onChange={(e) => onUpdate({ column: { ...input.column!, width: Number(e.target.value) } })}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="colDepth" className="text-xs text-muted-foreground">Profundidad (cm)</Label>
            <Input
              id="colDepth"
              type="number"
              value={input.column?.depth || 30}
              onChange={(e) => onUpdate({ column: { ...input.column!, depth: Number(e.target.value) } })}
              className="mt-1 font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loads */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Cargas de Servicio</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="loadN" className="text-xs text-muted-foreground">N - Axial (kN)</Label>
            <Input
              id="loadN"
              type="number"
              value={input.loads?.N || 500}
              onChange={(e) => onUpdate({ loads: { ...input.loads!, N: Number(e.target.value) } })}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="loadD" className="text-xs text-muted-foreground">D - Carga muerta (kN)</Label>
            <Input
              id="loadD"
              type="number"
              value={input.loadComponents?.D || 300}
              onChange={(e) =>
                onUpdate({
                  loadComponents: { ...input.loadComponents!, D: Number(e.target.value), L: input.loadComponents?.L || 200 },
                })
              }
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="loadL" className="text-xs text-muted-foreground">L - Carga viva (kN)</Label>
            <Input
              id="loadL"
              type="number"
              value={input.loadComponents?.L || 200}
              onChange={(e) =>
                onUpdate({
                  loadComponents: { ...input.loadComponents!, L: Number(e.target.value), D: input.loadComponents?.D || 300 },
                })
              }
              className="mt-1 font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Soil */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Suelo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Tipo de suelo</Label>
            <Select
              value="personalizado"
              onValueChange={(v) => {
                const soil = SOIL_TYPES.find((s) => s.id === v)
                if (soil && soil.id !== "personalizado") {
                  onUpdate({
                    soil: { ...input.soil!, sigmaAdm: soil.sigmaAdm, gamma_s: soil.gamma },
                  })
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOIL_TYPES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label} {s.sigmaAdm > 0 && `(σ=${s.sigmaAdm} kN/m²)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sigmaAdm" className="text-xs text-muted-foreground">σ admisible (kN/m²)</Label>
            <Input
              id="sigmaAdm"
              type="number"
              value={input.soil?.sigmaAdm || 150}
              onChange={(e) => onUpdate({ soil: { ...input.soil!, sigmaAdm: Number(e.target.value) } })}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="gammaS" className="text-xs text-muted-foreground">γ suelo (kN/m³)</Label>
            <Input
              id="gammaS"
              type="number"
              value={input.soil?.gamma_s || 18}
              onChange={(e) => onUpdate({ soil: { ...input.soil!, gamma_s: Number(e.target.value) } })}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="Df" className="text-xs text-muted-foreground">Profundidad Df (m)</Label>
            <Input
              id="Df"
              type="number"
              step="0.1"
              value={input.soil?.Df || 1.2}
              onChange={(e) => onUpdate({ soil: { ...input.soil!, Df: Number(e.target.value) } })}
              className="mt-1 font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Materials */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Materiales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Hormigon</Label>
            <Select
              value={input.materials?.concreteGrade || "H25"}
              onValueChange={(v) => onUpdate({ materials: { ...input.materials!, concreteGrade: v } })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONCRETE_GRADES).map(([key, g]) => (
                  <SelectItem key={key} value={key}>
                    {g.label} (f{"'"}ck={g.fck} MPa)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Acero</Label>
            <Select
              value={input.materials?.steelGrade || "ADN420"}
              onValueChange={(v) => onUpdate({ materials: { ...input.materials!, steelGrade: v } })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STEEL_GRADES).map(([key, g]) => (
                  <SelectItem key={key} value={key}>
                    {g.label} (fy={g.fy} MPa)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Recubrimiento (mm)</Label>
            <Select
              value={String(input.materials?.cover || 70)}
              onValueChange={(v) => onUpdate({ materials: { ...input.materials!, cover: Number(v) } })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(COVER_DEFAULTS.contacto_suelo)}>
                  {COVER_DEFAULTS.contacto_suelo}mm - Contacto con suelo
                </SelectItem>
                <SelectItem value={String(COVER_DEFAULTS.exterior_expuesto)}>
                  {COVER_DEFAULTS.exterior_expuesto}mm - Exterior expuesto
                </SelectItem>
                <SelectItem value={String(COVER_DEFAULTS.interior)}>
                  {COVER_DEFAULTS.interior}mm - Interior
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Step 1: Pre-dimensioning ────────────────────────────────────────
function StepDimensioning({
  input,
  onCalculate,
}: {
  input: M1Input
  onCalculate: () => void
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Pre-dimensionamiento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Se calculara automaticamente la zapata optima. Puede ingresar dimensiones
          fijas o dejar que el motor las determine.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">B ancho (m) - opcional</Label>
            <Input
              type="number"
              step="0.05"
              placeholder="Auto"
              className="mt-1 font-mono"
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : undefined
                useWizardStore.getState().updateM1Input({ footingWidth: v })
              }}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">L largo (m) - opcional</Label>
            <Input
              type="number"
              step="0.05"
              placeholder="Auto"
              className="mt-1 font-mono"
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : undefined
                useWizardStore.getState().updateM1Input({ footingDepth: v })
              }}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">H altura (m) - opcional</Label>
            <Input
              type="number"
              step="0.05"
              placeholder="Auto"
              className="mt-1 font-mono"
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : undefined
                useWizardStore.getState().updateM1Input({ footingHeight: v })
              }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            Pulse <strong className="text-foreground">Calcular</strong> para ejecutar el motor de calculo completo:
            dimensionamiento, combinaciones ELU, corte, punzonado y flexion.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Step 2: Verifications ───────────────────────────────────────────
function StepVerifications({
  verifications,
  results,
}: {
  verifications: VerificationStatus[]
  results: M1Results
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Dimensiones obtenidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "B (ancho)", value: `${results.dimensioning.B.toFixed(2)} m` },
              { label: "L (largo)", value: `${results.dimensioning.L.toFixed(2)} m` },
              { label: "H (alto)", value: `${(results.dimensioning.H * 100).toFixed(0)} cm` },
              { label: "d (efectivo)", value: `${(results.dimensioning.d * 100).toFixed(0)} cm` },
              { label: "Area", value: `${results.dimensioning.Af.toFixed(2)} m²` },
              { label: "σ net adm", value: `${results.dimensioning.sigmaNet.toFixed(1)} kN/m²` },
              { label: "σ actuante", value: `${results.dimensioning.sigmaSol.toFixed(1)} kN/m²` },
              { label: "Combinacion ELU", value: results.governingCombination },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-secondary/30 p-2">
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
                <span className="block text-sm font-bold font-mono text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Verificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationSummary items={verifications} />
        </CardContent>
      </Card>

      {/* Punching detail */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Detalle - Punzonado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {[
              { label: "bo (perimetro)", value: `${results.punching.bo.toFixed(3)} m` },
              { label: "Vc1 (Ec.11-35)", value: `${results.punching.Vc1.toFixed(1)} kN` },
              { label: "Vc2 (Ec.11-36)", value: `${results.punching.Vc2.toFixed(1)} kN` },
              { label: "Vc3 (Ec.11-37)", value: `${results.punching.Vc3.toFixed(1)} kN` },
              { label: "Vc gobernante", value: `${results.punching.VcGov.toFixed(1)} kN` },
              { label: "φVc", value: `${results.punching.phiVc.toFixed(1)} kN` },
              { label: "Vu", value: `${results.punching.Vu.toFixed(1)} kN` },
              { label: "Ratio", value: `${(results.punching.ratio * 100).toFixed(1)}%` },
            ].map((item) => (
              <div key={item.label} className="rounded border border-border p-2">
                <span className="block text-[10px] text-muted-foreground">{item.label}</span>
                <span className="block font-mono font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Step 3: Reinforcement ───────────────────────────────────────────
function StepReinforcement({ results }: { results: M1Results }) {
  return (
    <div className="flex flex-col gap-4">
      {[
        { title: "Armadura inferior - Direccion X", data: results.flexureX },
        { title: "Armadura inferior - Direccion Y", data: results.flexureY },
      ].map(({ title, data }) => (
        <Card key={title} className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded border border-border p-2">
                <span className="block text-[10px] text-muted-foreground">Mu</span>
                <span className="block text-sm font-mono font-semibold text-foreground">
                  {data.Mu.toFixed(2)} kN·m
                </span>
              </div>
              <div className="rounded border border-border p-2">
                <span className="block text-[10px] text-muted-foreground">As requerido</span>
                <span className="block text-sm font-mono font-semibold text-foreground">
                  {data.AsReq.toFixed(2)} cm²
                </span>
              </div>
              <div className="rounded border border-border p-2">
                <span className="block text-[10px] text-muted-foreground">As minimo</span>
                <span className="block text-sm font-mono font-semibold text-foreground">
                  {data.AsMin.toFixed(2)} cm²
                </span>
              </div>
              <div className="rounded border border-primary/30 bg-primary/5 p-2">
                <span className="block text-[10px] text-primary">As diseno</span>
                <span className="block text-sm font-mono font-bold text-primary">
                  {data.AsDesign.toFixed(2)} cm²
                </span>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg font-bold text-primary">{data.bars.count}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {data.bars.count} barras ø{data.bars.diameter}
                </p>
                <p className="text-xs text-muted-foreground">
                  c/ {data.bars.spacing.toFixed(1)} cm | As total = {data.bars.totalArea.toFixed(2)} cm²
                </p>
              </div>
            </div>

            <p className="mt-2 text-[10px] text-muted-foreground">
              μ={data.omega.toFixed(4)} | ξ={data.xi.toFixed(4)} | {data.reference}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Step 4: Summary ─────────────────────────────────────────────────
function StepSummary({
  input,
  results,
  verifications,
}: {
  input: M1Input
  results: M1Results
  verifications: VerificationStatus[]
}) {
  const allPass = verifications.every((v) => v.pass)

  return (
    <div className="flex flex-col gap-4">
      <Card className={`border-2 ${allPass ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className={`h-3 w-3 rounded-full ${allPass ? "bg-emerald-500" : "bg-red-500"}`} />
          <span className={`text-sm font-bold ${allPass ? "text-emerald-400" : "text-red-400"}`}>
            {allPass ? "DISENO VERIFICADO" : "DISENO NO VERIFICA - REVISAR"}
          </span>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Resumen de diseno</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border">
                <tr><td className="py-1.5 text-muted-foreground">Proyecto</td><td className="py-1.5 font-mono text-foreground text-right">{input.projectName || "Sin nombre"}</td></tr>
                <tr><td className="py-1.5 text-muted-foreground">Zapata</td><td className="py-1.5 font-mono text-foreground text-right">{results.dimensioning.B.toFixed(2)} x {results.dimensioning.L.toFixed(2)} x {(results.dimensioning.H * 100).toFixed(0)}cm</td></tr>
                <tr><td className="py-1.5 text-muted-foreground">Columna</td><td className="py-1.5 font-mono text-foreground text-right">{input.column?.width}x{input.column?.depth} cm</td></tr>
                <tr><td className="py-1.5 text-muted-foreground">N (servicio)</td><td className="py-1.5 font-mono text-foreground text-right">{input.loads?.N} kN</td></tr>
                <tr><td className="py-1.5 text-muted-foreground">Hormigon / Acero</td><td className="py-1.5 font-mono text-foreground text-right">{input.materials?.concreteGrade} / {input.materials?.steelGrade}</td></tr>
                <tr><td className="py-1.5 text-muted-foreground">Arm. Dir. X</td><td className="py-1.5 font-mono text-foreground text-right">{results.flexureX.bars.count}ø{results.flexureX.bars.diameter} c/{results.flexureX.bars.spacing}cm</td></tr>
                <tr><td className="py-1.5 text-muted-foreground">Arm. Dir. Y</td><td className="py-1.5 font-mono text-foreground text-right">{results.flexureY.bars.count}ø{results.flexureY.bars.diameter} c/{results.flexureY.bars.spacing}cm</td></tr>
                <tr><td className="py-1.5 text-muted-foreground">Comb. ELU gobernante</td><td className="py-1.5 font-mono text-foreground text-right">{results.governingCombination}</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
