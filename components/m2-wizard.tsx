"use client"

import { useState, useMemo } from "react"
import { useWizardStore } from "@/lib/stores/wizard-store"
import { calculateM2 } from "@/lib/calculations/m2-engine"
import { CONCRETE_GRADES, STEEL_GRADES, SOIL_TYPES, COVER_DEFAULTS, ELS_COMBINATIONS, ELU_COMBINATIONS, MODULES } from "@/lib/constants/cirsoc"
import type { M2Input, M2Results, VerificationStatus } from "@/lib/types/foundation"
import { WizardStepper } from "@/components/wizard-stepper"
import { VerificationSummary } from "@/components/verification-indicator"
import { FootingPlanView, FootingSectionView, PressureDiagram } from "@/components/footing-diagrams"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Calculator, RotateCcw, Download, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const MODULE = MODULES.find((m) => m.id === "m2")!
const STEPS = MODULE.steps

export function M2Wizard() {
  const [step, setStep] = useState(0)
  const { m2Input, updateM2Input } = useWizardStore()
  const [results, setResults] = useState<M2Results | null>(null)

  const input = m2Input as M2Input

  function handleCalculate() {
    try {
      const r = calculateM2({
        projectName: input.projectName || "Sin nombre",
        column: input.column || { width: 30, depth: 30, shape: "rectangular" },
        loads: input.loads || { N: 500, Mx: 80 },
        loadComponents: input.loadComponents || { D: 300, L: 200, MD: 50, ML: 30 },
        soil: input.soil || { sigmaAdm: 150, gamma_s: 18, Df: 1.2 },
        materials: input.materials || { concreteGrade: "H25", steelGrade: "ADN420", cover: 70 },
        momentDirection: input.momentDirection || "x",
      })
      setResults(r)
      setStep(4) // Jump to verifications
    } catch (e) {
      console.error("M2 Calculation error:", e)
    }
  }

  function handleNext() {
    if (step === 3) {
      handleCalculate()
    } else {
      setStep(Math.min(step + 1, STEPS.length - 1))
    }
  }

  const verifications = useMemo<VerificationStatus[]>(() => {
    if (!results) return []
    const items: VerificationStatus[] = [
      {
        label: "Presion maxima (ELS)",
        value: results.pressureELS.sigmaMax,
        limit: results.dimensioning.sigmaNet,
        ratio: results.pressureELS.sigmaMax / results.dimensioning.sigmaNet,
        pass: results.pressureELS.sigmaMax <= results.dimensioning.sigmaNet,
        reference: "σ_max ≤ σ_net adm",
        severity: results.pressureELS.sigmaMax <= results.dimensioning.sigmaNet
          ? (results.pressureELS.sigmaMax / results.dimensioning.sigmaNet > 0.9 ? "warning" : "ok") : "error",
      },
    ]

    // Stability
    for (const s of results.stability) {
      items.push({
        label: s.type === "overturning" ? "Estabilidad al vuelco" : "Estabilidad al deslizamiento",
        value: s.FS,
        limit: s.FSmin,
        ratio: s.FSmin / s.FS, // inverted: lower is better
        pass: s.pass,
        reference: s.reference,
        severity: s.pass ? (s.FS < s.FSmin * 1.2 ? "warning" : "ok") : "error",
      })
    }

    items.push(
      {
        label: "Corte viga ancha - Dir. X",
        value: results.shearX.Vu, limit: results.shearX.phiVc,
        ratio: results.shearX.ratio, pass: results.shearX.pass,
        reference: results.shearX.reference,
        severity: results.shearX.pass ? (results.shearX.ratio > 0.9 ? "warning" : "ok") : "error",
      },
      {
        label: "Corte viga ancha - Dir. Y",
        value: results.shearY.Vu, limit: results.shearY.phiVc,
        ratio: results.shearY.ratio, pass: results.shearY.pass,
        reference: results.shearY.reference,
        severity: results.shearY.pass ? (results.shearY.ratio > 0.9 ? "warning" : "ok") : "error",
      },
      {
        label: "Punzonado con momento",
        value: results.punching.Vu, limit: results.punching.phiVc,
        ratio: results.punching.ratio, pass: results.punching.pass,
        reference: results.punching.reference,
        severity: results.punching.pass ? (results.punching.ratio > 0.9 ? "warning" : "ok") : "error",
      }
    )
    return items
  }, [results])

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">M2</Badge>
            <h1 className="text-xl font-bold text-foreground">Base con Momento</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Zapata aislada con carga axial y momento flector
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStep(0); setResults(null) }} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
        </Button>
      </div>

      <WizardStepper steps={STEPS} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />
      <Separator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 0 && <M2StepInputs input={input} onUpdate={updateM2Input} />}
          {step === 1 && <M2StepELS input={input} />}
          {step === 2 && results && <M2StepPressure results={results} />}
          {step === 2 && !results && <M2StepPressurePlaceholder />}
          {step === 3 && <M2StepELU input={input} />}
          {step === 4 && results && <M2StepVerifications verifications={verifications} results={results} />}
          {step === 5 && results && <M2StepReinforcement results={results} />}
          {step === 6 && results && <M2StepSummary input={input} results={results} verifications={verifications} />}
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          {(results || step > 0) && (
            <>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Planta</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <FootingPlanView
                    B={results?.dimensioning.B || 2.0}
                    L={results?.dimensioning.L || 2.4}
                    colX={input.column?.width || 30}
                    colY={input.column?.depth || 30}
                  />
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Corte</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <FootingSectionView
                    B={results?.dimensioning.B || 2.0}
                    H={results?.dimensioning.H || 0.45}
                    colX={input.column?.width || 30}
                    d={results?.dimensioning.d}
                  />
                </CardContent>
              </Card>
              {results && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Presiones</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <PressureDiagram
                      B={results.dimensioning.B}
                      L={results.dimensioning.L}
                      sigmaMax={results.pressureELS.sigmaMax}
                      sigmaMin={results.pressureELS.sigmaMin}
                      pressureType={results.pressureELS.type}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <Separator />
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Anterior
        </Button>
        <span className="text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-2">
            {step === 3 && !results ? (
              <><Calculator className="h-4 w-4" /> Calcular</>
            ) : (
              <>Siguiente <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        ) : (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Step 0: Input Data ──────────────────────────────────────────────
function M2StepInputs({
  input,
  onUpdate,
}: {
  input: M2Input
  onUpdate: (data: Partial<M2Input>) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Proyecto</CardTitle></CardHeader>
        <CardContent>
          <Label htmlFor="m2Name" className="text-xs text-muted-foreground">Nombre</Label>
          <Input id="m2Name" value={input.projectName || ""} onChange={(e) => onUpdate({ projectName: e.target.value })} placeholder="Ej: Edificio Norte - Z2" className="mt-1" />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Columna</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Ancho (cm)</Label>
            <Input type="number" value={input.column?.width || 30} onChange={(e) => onUpdate({ column: { ...input.column!, width: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Profundidad (cm)</Label>
            <Input type="number" value={input.column?.depth || 30} onChange={(e) => onUpdate({ column: { ...input.column!, depth: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
        </CardContent>
      </Card>

      {/* Loads by component */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Cargas por tipo (para combinaciones)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">N servicio (kN)</Label>
            <Input type="number" value={input.loads?.N || 500} onChange={(e) => onUpdate({ loads: { ...input.loads!, N: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Mx servicio (kN·m)</Label>
            <Input type="number" value={input.loads?.Mx || 80} onChange={(e) => onUpdate({ loads: { ...input.loads!, Mx: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">D - Carga muerta (kN)</Label>
            <Input type="number" value={input.loadComponents?.D || 300} onChange={(e) => onUpdate({ loadComponents: { ...input.loadComponents!, D: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">L - Carga viva (kN)</Label>
            <Input type="number" value={input.loadComponents?.L || 200} onChange={(e) => onUpdate({ loadComponents: { ...input.loadComponents!, L: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">MD - Momento muerto (kN·m)</Label>
            <Input type="number" value={input.loadComponents?.MD || 50} onChange={(e) => onUpdate({ loadComponents: { ...input.loadComponents!, MD: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">ML - Momento vivo (kN·m)</Label>
            <Input type="number" value={input.loadComponents?.ML || 30} onChange={(e) => onUpdate({ loadComponents: { ...input.loadComponents!, ML: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">MW - Momento viento (kN·m)</Label>
            <Input type="number" value={input.loadComponents?.MW || 0} onChange={(e) => onUpdate({ loadComponents: { ...input.loadComponents!, MW: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">ME - Momento sismo (kN·m)</Label>
            <Input type="number" value={input.loadComponents?.ME || 0} onChange={(e) => onUpdate({ loadComponents: { ...input.loadComponents!, ME: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Suelo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">σ adm (kN/m²)</Label>
            <Input type="number" value={input.soil?.sigmaAdm || 150} onChange={(e) => onUpdate({ soil: { ...input.soil!, sigmaAdm: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">γ suelo (kN/m³)</Label>
            <Input type="number" value={input.soil?.gamma_s || 18} onChange={(e) => onUpdate({ soil: { ...input.soil!, gamma_s: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Df (m)</Label>
            <Input type="number" step="0.1" value={input.soil?.Df || 1.2} onChange={(e) => onUpdate({ soil: { ...input.soil!, Df: Number(e.target.value) } })} className="mt-1 font-mono" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Materiales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Hormigon</Label>
            <Select value={input.materials?.concreteGrade || "H25"} onValueChange={(v) => onUpdate({ materials: { ...input.materials!, concreteGrade: v } })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CONCRETE_GRADES).map(([key, g]) => (<SelectItem key={key} value={key}>{g.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Acero</Label>
            <Select value={input.materials?.steelGrade || "ADN420"} onValueChange={(v) => onUpdate({ materials: { ...input.materials!, steelGrade: v } })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STEEL_GRADES).map(([key, g]) => (<SelectItem key={key} value={key}>{g.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Recubrimiento</Label>
            <Select value={String(input.materials?.cover || 70)} onValueChange={(v) => onUpdate({ materials: { ...input.materials!, cover: Number(v) } })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="70">70mm - Suelo</SelectItem>
                <SelectItem value="50">50mm - Exterior</SelectItem>
                <SelectItem value="40">40mm - Interior</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Step 1: ELS Combinations ────────────────────────────────────────
function M2StepELS({ input }: { input: M2Input }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Combinaciones de Servicio (ELS)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          Combinaciones segun CIRSOC 201-05 / CIRSOC 102 para verificacion de
          presiones admisibles y estabilidad.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 text-left font-medium">Comb.</th>
                <th className="py-2 text-left font-medium">Expresion</th>
                <th className="py-2 text-right font-medium font-mono">N (kN)</th>
                <th className="py-2 text-right font-medium font-mono">M (kN·m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ELS_COMBINATIONS.map((combo) => {
                const N =
                  (combo.factors.D || 0) * (input.loadComponents?.D || 0) +
                  (combo.factors.L || 0) * (input.loadComponents?.L || 0)
                const M =
                  (combo.factors.D || 0) * (input.loadComponents?.MD || 0) +
                  (combo.factors.L || 0) * (input.loadComponents?.ML || 0) +
                  (combo.factors.W || 0) * (input.loadComponents?.MW || 0) +
                  (combo.factors.E || 0) * (input.loadComponents?.ME || 0)

                return (
                  <tr key={combo.id}>
                    <td className="py-2 font-semibold text-foreground">{combo.label}</td>
                    <td className="py-2 text-muted-foreground">{combo.expression}</td>
                    <td className="py-2 text-right font-mono text-foreground">{N.toFixed(1)}</td>
                    <td className="py-2 text-right font-mono text-foreground">{M.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Step 2: Pressure & Stability ────────────────────────────────────
function M2StepPressure({ results }: { results: M2Results }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Distribucion de presiones (ELS)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded border border-border p-2">
              <span className="block text-[10px] text-muted-foreground">σ max</span>
              <span className="block text-sm font-mono font-semibold text-foreground">{results.pressureELS.sigmaMax.toFixed(1)} kN/m²</span>
            </div>
            <div className="rounded border border-border p-2">
              <span className="block text-[10px] text-muted-foreground">σ min</span>
              <span className={cn("block text-sm font-mono font-semibold", results.pressureELS.sigmaMin < 0 ? "text-red-400" : "text-foreground")}>
                {results.pressureELS.sigmaMin.toFixed(1)} kN/m²
              </span>
            </div>
            <div className="rounded border border-border p-2">
              <span className="block text-[10px] text-muted-foreground">Tipo</span>
              <span className="block text-sm font-semibold text-foreground capitalize">{results.pressureELS.type}</span>
            </div>
            <div className="rounded border border-border p-2">
              <span className="block text-[10px] text-muted-foreground">Excentricidad</span>
              <span className="block text-sm font-mono font-semibold text-foreground">{(results.pressureELS.eccentricity * 100).toFixed(1)} cm</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Limite del nucleo central: L/6 = {(results.pressureELS.kernelLimit * 100).toFixed(1)} cm |
            e = {(results.pressureELS.eccentricity * 100).toFixed(1)} cm
            {results.pressureELS.eccentricity <= results.pressureELS.kernelLimit ? " (dentro del nucleo)" : " (fuera del nucleo)"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Estabilidad</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {results.stability.map((s) => (
            <div key={s.type} className={cn(
              "flex items-center justify-between rounded-lg border p-3",
              s.pass ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
            )}>
              <div className="flex items-center gap-2">
                {s.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {s.type === "overturning" ? "Vuelco" : "Deslizamiento"}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{s.reference}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn("text-sm font-bold font-mono", s.pass ? "text-emerald-400" : "text-red-400")}>
                  FS = {s.FS.toFixed(2)}
                </span>
                <p className="text-[10px] text-muted-foreground">min = {s.FSmin}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function M2StepPressurePlaceholder() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6 text-center text-sm text-muted-foreground">
        Ejecute el calculo primero (paso 4) para ver presiones y estabilidad.
      </CardContent>
    </Card>
  )
}

// ─── Step 3: ELU ─────────────────────────────────────────────────────
function M2StepELU({ input }: { input: M2Input }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Combinaciones Ultimas (ELU)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          Combinaciones mayoradas segun CIRSOC 201-05 Cap. 9 para diseno estructural.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 text-left font-medium">Comb.</th>
                <th className="py-2 text-left font-medium">Expresion</th>
                <th className="py-2 text-right font-medium font-mono">Nu (kN)</th>
                <th className="py-2 text-right font-medium font-mono">Mxu (kN·m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ELU_COMBINATIONS.map((combo) => {
                let Nu = 0
                let Mxu = 0
                if (combo.factors.D) { Nu += combo.factors.D * (input.loadComponents?.D || 0); Mxu += combo.factors.D * (input.loadComponents?.MD || 0) }
                if (combo.factors.L) { Nu += combo.factors.L * (input.loadComponents?.L || 0); Mxu += combo.factors.L * (input.loadComponents?.ML || 0) }
                if (combo.factors.W) { Mxu += combo.factors.W * (input.loadComponents?.MW || 0) }
                if (combo.factors.E) { Mxu += combo.factors.E * (input.loadComponents?.ME || 0) }
                if (combo.factors.Lr) { Nu += combo.factors.Lr * (input.loadComponents?.Lr || 0) }
                if (combo.factors.S) { Nu += combo.factors.S * (input.loadComponents?.S || 0) }

                return (
                  <tr key={combo.id}>
                    <td className="py-2 font-semibold text-foreground">{combo.label}</td>
                    <td className="py-2 text-muted-foreground">{combo.expression}</td>
                    <td className="py-2 text-right font-mono text-foreground">{Nu.toFixed(1)}</td>
                    <td className="py-2 text-right font-mono text-foreground">{Mxu.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Step 4: Verifications ───────────────────────────────────────────
function M2StepVerifications({
  verifications,
  results,
}: {
  verifications: VerificationStatus[]
  results: M2Results
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Dimensiones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "B", value: `${results.dimensioning.B.toFixed(2)} m` },
              { label: "L", value: `${results.dimensioning.L.toFixed(2)} m` },
              { label: "H", value: `${(results.dimensioning.H * 100).toFixed(0)} cm` },
              { label: "d", value: `${(results.dimensioning.d * 100).toFixed(0)} cm` },
              { label: "ELU gov.", value: results.governingCombination },
              { label: "ELS gov.", value: results.elsCombiGov },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-secondary/30 p-2">
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</span>
                <span className="block text-sm font-bold font-mono text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Verificaciones</CardTitle></CardHeader>
        <CardContent><VerificationSummary items={verifications} /></CardContent>
      </Card>

      {/* Punching detail with moment */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Punzonado con transferencia de momento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded border border-border p-2">
              <span className="block text-[10px] text-muted-foreground">γv (CIRSOC 11.12.6)</span>
              <span className="block font-mono font-semibold text-foreground">{results.punching.gamma_v.toFixed(4)}</span>
            </div>
            <div className="rounded border border-border p-2">
              <span className="block text-[10px] text-muted-foreground">Jc</span>
              <span className="block font-mono font-semibold text-foreground">{results.punching.Jc.toFixed(0)} cm⁴</span>
            </div>
            <div className="rounded border border-border p-2">
              <span className="block text-[10px] text-muted-foreground">vu max</span>
              <span className="block font-mono font-semibold text-foreground">{results.punching.vu_max.toFixed(3)} MPa</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Step 5: Reinforcement ───────────────────────────────────────────
function M2StepReinforcement({ results }: { results: M2Results }) {
  const sections = [
    { title: "Armadura inferior - Dir. X", data: results.flexureX },
    { title: "Armadura inferior - Dir. Y", data: results.flexureY },
  ]
  if (results.flexureSuperior) {
    sections.push({ title: "Armadura superior (levantamiento)", data: results.flexureSuperior })
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map(({ title, data }) => (
        <Card key={title} className="border-border bg-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded border border-border p-2">
                <span className="block text-[10px] text-muted-foreground">Mu</span>
                <span className="block text-sm font-mono font-semibold text-foreground">{data.Mu.toFixed(2)} kN·m</span>
              </div>
              <div className="rounded border border-border p-2">
                <span className="block text-[10px] text-muted-foreground">As req</span>
                <span className="block text-sm font-mono font-semibold text-foreground">{data.AsReq.toFixed(2)} cm²</span>
              </div>
              <div className="rounded border border-border p-2">
                <span className="block text-[10px] text-muted-foreground">As min</span>
                <span className="block text-sm font-mono font-semibold text-foreground">{data.AsMin.toFixed(2)} cm²</span>
              </div>
              <div className="rounded border border-primary/30 bg-primary/5 p-2">
                <span className="block text-[10px] text-primary">As diseno</span>
                <span className="block text-sm font-mono font-bold text-primary">{data.AsDesign.toFixed(2)} cm²</span>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg font-bold text-primary">{data.bars.count}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{data.bars.count} barras ø{data.bars.diameter}</p>
                <p className="text-xs text-muted-foreground">c/ {data.bars.spacing.toFixed(1)} cm | As = {data.bars.totalArea.toFixed(2)} cm²</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Step 6: Summary ─────────────────────────────────────────────────
function M2StepSummary({
  input, results, verifications,
}: {
  input: M2Input; results: M2Results; verifications: VerificationStatus[]
}) {
  const allPass = verifications.every((v) => v.pass)

  return (
    <div className="flex flex-col gap-4">
      <Card className={`border-2 ${allPass ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className={`h-3 w-3 rounded-full ${allPass ? "bg-emerald-500" : "bg-red-500"}`} />
          <span className={`text-sm font-bold ${allPass ? "text-emerald-400" : "text-red-400"}`}>
            {allPass ? "DISENO VERIFICADO" : "DISENO NO VERIFICA"}
          </span>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Resumen</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-border">
              <tr><td className="py-1.5 text-muted-foreground">Zapata</td><td className="py-1.5 font-mono text-foreground text-right">{results.dimensioning.B.toFixed(2)} x {results.dimensioning.L.toFixed(2)} x {(results.dimensioning.H * 100).toFixed(0)}cm</td></tr>
              <tr><td className="py-1.5 text-muted-foreground">Presion</td><td className="py-1.5 font-mono text-foreground text-right">{results.pressureELS.type} (σmax={results.pressureELS.sigmaMax.toFixed(1)}, σmin={results.pressureELS.sigmaMin.toFixed(1)})</td></tr>
              <tr><td className="py-1.5 text-muted-foreground">Vuelco FS</td><td className="py-1.5 font-mono text-foreground text-right">{results.stability[0]?.FS.toFixed(2)} (min {results.stability[0]?.FSmin})</td></tr>
              <tr><td className="py-1.5 text-muted-foreground">Deslizamiento FS</td><td className="py-1.5 font-mono text-foreground text-right">{results.stability[1]?.FS.toFixed(2)} (min {results.stability[1]?.FSmin})</td></tr>
              <tr><td className="py-1.5 text-muted-foreground">Arm. X inf.</td><td className="py-1.5 font-mono text-foreground text-right">{results.flexureX.bars.count}ø{results.flexureX.bars.diameter} c/{results.flexureX.bars.spacing}cm</td></tr>
              <tr><td className="py-1.5 text-muted-foreground">Arm. Y inf.</td><td className="py-1.5 font-mono text-foreground text-right">{results.flexureY.bars.count}ø{results.flexureY.bars.diameter} c/{results.flexureY.bars.spacing}cm</td></tr>
              {results.flexureSuperior && (
                <tr><td className="py-1.5 text-muted-foreground">Arm. sup.</td><td className="py-1.5 font-mono text-foreground text-right">{results.flexureSuperior.bars.count}ø{results.flexureSuperior.bars.diameter} c/{results.flexureSuperior.bars.spacing}cm</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
