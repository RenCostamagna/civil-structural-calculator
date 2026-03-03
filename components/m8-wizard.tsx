"use client"

import { useState, useMemo } from "react"
import { calculateM8, type M8Input, type M8Results } from "@/lib/calculations/m8-engine"
import { MODULES } from "@/lib/constants/cirsoc"
import type { VerificationStatus } from "@/lib/types/foundation"
import { WizardStepper } from "@/components/wizard-stepper"
import { VerificationSummary } from "@/components/verification-indicator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Calculator, RotateCcw, Download, CheckCircle2, XCircle } from "lucide-react"

const MODULE = MODULES.find((m) => m.id === "m8")!
const STEPS = MODULE.steps

const defaults: M8Input = {
  projectName: "",
  pileDiameter: 40,
  pileLength: 10,
  pileType: "long-free",
  headCondition: "free",
  soilType: "granular",
  gamma: 18,
  phi: 30,
  appliedLateralLoad: 80,
  appliedMoment: 0,
}

export function M8Wizard() {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<M8Input>(defaults)
  const [results, setResults] = useState<M8Results | null>(null)

  function update(partial: Partial<M8Input>) { setInput((prev) => ({ ...prev, ...partial })) }

  function handleCalculate() {
    try { setResults(calculateM8(input)); setStep(2) } catch (e) { console.error("M8:", e) }
  }

  function handleNext() {
    if (step === 1) handleCalculate()
    else setStep(Math.min(step + 1, STEPS.length - 1))
  }

  const verifications = useMemo<VerificationStatus[]>(() => {
    if (!results) return []
    return [
      { label: "FS lateral", value: results.FS, limit: 2.0, ratio: 2.0 / results.FS, pass: results.passFS, reference: "FS >= 2.00 (Broms)", severity: results.passFS ? "ok" : "error" },
      { label: "Desplazamiento", value: results.displacement.yHead, limit: 25, ratio: results.displacement.yHead / 25, pass: results.displacement.passDisplacement, reference: "y <= 25mm", severity: results.displacement.passDisplacement ? "ok" : "error" },
    ]
  }, [results])

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">M8</Badge>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Resistencia Lateral (Broms)</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Capacidad lateral de pilotes - metodo de Broms</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStep(0); setResults(null); setInput(defaults) }} className="shrink-0 gap-2 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Reiniciar</span></Button>
      </div>

      <WizardStepper steps={STEPS} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />
      <Separator />

      <div className="lg:col-span-2">
        {step === 0 && <M8StepInputs input={input} onUpdate={update} />}
        {step === 1 && !results && <M8StepSoilParams input={input} onUpdate={update} />}
        {step === 1 && results && <M8StepSoilParams input={input} onUpdate={update} />}
        {step === 2 && results && <M8StepBroms results={results} />}
        {step === 3 && results && <VerificationSummary verifications={verifications} />}
        {step === 4 && results && <M8StepSummary results={results} verifications={verifications} />}
      </div>

      <Separator />
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0} className="gap-1.5 sm:gap-2"><ArrowLeft className="h-4 w-4" /> <span className="hidden xs:inline">Anterior</span></Button>
        <span className="text-[10px] sm:text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={handleNext} className="gap-1.5 sm:gap-2">{step === 1 ? <><Calculator className="h-4 w-4" /> Calcular</> : <><span className="hidden xs:inline">Siguiente</span> <ArrowRight className="h-4 w-4" /></>}</Button>
        ) : <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2"><Download className="h-4 w-4" /> <span className="hidden xs:inline">Exportar PDF</span></Button>}
      </div>
    </div>
  )
}

function M8StepInputs({ input, onUpdate }: { input: M8Input; onUpdate: (d: Partial<M8Input>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border bg-card"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Proyecto</CardTitle></CardHeader><CardContent><Input value={input.projectName} onChange={(e) => onUpdate({ projectName: e.target.value })} placeholder="Nombre" /></CardContent></Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Pilote</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div><Label className="text-xs text-muted-foreground">Diametro (cm)</Label><Input type="number" value={input.pileDiameter} onChange={(e) => onUpdate({ pileDiameter: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Longitud (m)</Label><Input type="number" value={input.pileLength} onChange={(e) => onUpdate({ pileLength: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Condicion cabeza</Label><Select value={input.headCondition} onValueChange={(v: "free" | "fixed") => onUpdate({ headCondition: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="free">Libre</SelectItem><SelectItem value="fixed">Empotrada</SelectItem></SelectContent></Select></div>
          <div><Label className="text-xs text-muted-foreground">Tipo suelo</Label><Select value={input.soilType} onValueChange={(v: "granular" | "cohesive") => onUpdate({ soilType: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="granular">Granular</SelectItem><SelectItem value="cohesive">Cohesivo</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Cargas Laterales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div><Label className="text-xs text-muted-foreground">Carga lateral H (kN)</Label><Input type="number" value={input.appliedLateralLoad} onChange={(e) => onUpdate({ appliedLateralLoad: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Momento en cabeza (kN.m)</Label><Input type="number" value={input.appliedMoment || 0} onChange={(e) => onUpdate({ appliedMoment: +e.target.value })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
    </div>
  )
}

function M8StepSoilParams({ input, onUpdate }: { input: M8Input; onUpdate: (d: Partial<M8Input>) => void }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Parametros del Suelo ({input.soilType === "granular" ? "Granular" : "Cohesivo"})</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {input.soilType === "granular" ? (
          <>
            <div><Label className="text-xs text-muted-foreground">gamma (kN/m3)</Label><Input type="number" value={input.gamma || 18} onChange={(e) => onUpdate({ gamma: +e.target.value })} className="mt-1 font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">phi (deg)</Label><Input type="number" value={input.phi || 30} onChange={(e) => onUpdate({ phi: +e.target.value })} className="mt-1 font-mono" /></div>
          </>
        ) : (
          <>
            <div><Label className="text-xs text-muted-foreground">cu (kPa)</Label><Input type="number" value={input.cu || 50} onChange={(e) => onUpdate({ cu: +e.target.value })} className="mt-1 font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Ep pilote (MPa)</Label><Input type="number" value={input.Ep || 25000} onChange={(e) => onUpdate({ Ep: +e.target.value })} className="mt-1 font-mono" /></div>
          </>
        )}
        <div><Label className="text-xs text-muted-foreground">My pilote (kN.m) [auto si 0]</Label><Input type="number" value={input.My || 0} onChange={(e) => onUpdate({ My: +e.target.value || undefined })} className="mt-1 font-mono" /></div>
      </CardContent>
    </Card>
  )
}

function M8StepBroms({ results }: { results: M8Results }) {
  const isGran = !!results.Hu_granular
  const data = isGran ? results.Hu_granular! : results.Hu_cohesive!
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Resultados Broms - Pilote {results.classification}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Hu (ultima)</span><span className="text-lg font-mono font-bold text-primary">{data.Hu.toFixed(1)} kN</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">M max</span><span className="text-sm font-mono font-semibold">{data.Mmax.toFixed(1)} kN.m</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">kR (L/T)</span><span className="text-sm font-mono font-semibold">{results.kR}</span></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">FS</span><span className={`text-lg font-mono font-bold ${results.passFS ? "text-green-500" : "text-red-500"}`}>{results.FS.toFixed(2)}</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">y cabeza</span><span className="text-sm font-mono font-semibold">{results.displacement.yHead.toFixed(1)} mm</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">y max</span><span className="text-sm font-mono font-semibold">{results.displacement.yMax.toFixed(1)} mm</span></div>
        </div>
      </CardContent>
    </Card>
  )
}

function M8StepSummary({ results, verifications }: { results: M8Results; verifications: VerificationStatus[] }) {
  const allPass = verifications.every((v) => v.pass)
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold">{allPass ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />} Resumen {allPass ? "- CUMPLE" : "- NO CUMPLE"}</CardTitle></CardHeader>
      <CardContent>
        <VerificationSummary verifications={verifications} />
        <p className="mt-3 text-sm text-muted-foreground">{results.summary}</p>
      </CardContent>
    </Card>
  )
}
