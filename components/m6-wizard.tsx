"use client"

import { useState, useMemo } from "react"
import { calculateM6, type M6Input, type M6Results } from "@/lib/calculations/m6-engine"
import { CONCRETE_GRADES, STEEL_GRADES, MODULES } from "@/lib/constants/cirsoc"
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

const MODULE = MODULES.find((m) => m.id === "m6")!
const STEPS = MODULE.steps

const defaults: M6Input = {
  projectName: "",
  column1: { width: 30, depth: 30, shape: "rectangular" },
  column2: { width: 40, depth: 40, shape: "rectangular" },
  loads1: { N: 500 },
  loads2: { N: 700 },
  soil: { sigmaAdm: 150, gamma_s: 18, Df: 1.2 },
  materials: { concreteGrade: "H25", steelGrade: "ADN420", cover: 70 },
  distanceBetweenColumns: 4.0,
  footingShape: "rectangular",
}

export function M6Wizard() {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<M6Input>(defaults)
  const [results, setResults] = useState<M6Results | null>(null)

  function update(partial: Partial<M6Input>) { setInput((prev) => ({ ...prev, ...partial })) }

  function handleCalculate() {
    try { setResults(calculateM6(input)); setStep(2) } catch (e) { console.error("M6:", e) }
  }

  function handleNext() {
    if (step === 1) handleCalculate()
    else setStep(Math.min(step + 1, STEPS.length - 1))
  }

  const verifications = useMemo<VerificationStatus[]>(() => {
    if (!results) return []
    const p = results.pressures
    const checks: VerificationStatus[] = [
      { label: "Presion max", value: Math.max(p.sigma1, p.sigma2), limit: p.sigmaNet, ratio: Math.max(p.sigma1, p.sigma2) / p.sigmaNet, pass: p.pass, reference: "sigma_max <= sigma_net", severity: p.pass ? "ok" : "error" },
    ]
    results.shearChecks.forEach((sc) => {
      checks.push({ label: `Corte ${sc.direction}`, value: sc.Vu, limit: sc.phiVc, ratio: sc.ratio, pass: sc.pass, reference: sc.reference, severity: sc.pass ? "ok" : "error" })
    })
    return checks
  }, [results])

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">M6</Badge>
            <h1 className="text-xl font-bold text-foreground">Base Unificada (Combinada)</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Fundacion {input.footingShape === "trapezoidal" ? "trapezoidal" : "rectangular"} para 2 columnas</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStep(0); setResults(null); setInput(defaults) }} className="gap-2 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Reiniciar</Button>
      </div>

      <WizardStepper steps={STEPS} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />
      <Separator />

      <div className="lg:col-span-2">
        {step === 0 && <M6StepInputs input={input} onUpdate={update} />}
        {step === 1 && !results && <PreCalcCard />}
        {step === 1 && results && <M6StepDimensioning results={results} />}
        {step === 2 && results && <M6StepPressures results={results} />}
        {step === 3 && results && <VerificationSummary verifications={verifications} />}
        {step === 4 && results && <M6StepReinforcement results={results} />}
        {step === 5 && results && <M6StepSummary results={results} verifications={verifications} />}
      </div>

      <Separator />
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0} className="gap-2"><ArrowLeft className="h-4 w-4" /> Anterior</Button>
        <span className="text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-2">{step === 1 && !results ? <><Calculator className="h-4 w-4" /> Calcular</> : <>Siguiente <ArrowRight className="h-4 w-4" /></>}</Button>
        ) : <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Exportar PDF</Button>}
      </div>
    </div>
  )
}

function PreCalcCard() {
  return <Card className="border-border bg-card"><CardContent className="py-8"><div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">Pulse <strong className="text-foreground">Calcular</strong> para ejecutar el motor.</p></div></CardContent></Card>
}

function M6StepInputs({ input, onUpdate }: { input: M6Input; onUpdate: (d: Partial<M6Input>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border bg-card"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Proyecto</CardTitle></CardHeader><CardContent><Input value={input.projectName} onChange={(e) => onUpdate({ projectName: e.target.value })} placeholder="Nombre" /></CardContent></Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Columna 1</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">Ancho (cm)</Label><Input type="number" value={input.column1.width} onChange={(e) => onUpdate({ column1: { ...input.column1, width: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Prof. (cm)</Label><Input type="number" value={input.column1.depth} onChange={(e) => onUpdate({ column1: { ...input.column1, depth: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">N (kN)</Label><Input type="number" value={input.loads1.N} onChange={(e) => onUpdate({ loads1: { N: +e.target.value } })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Columna 2</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">Ancho (cm)</Label><Input type="number" value={input.column2.width} onChange={(e) => onUpdate({ column2: { ...input.column2, width: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Prof. (cm)</Label><Input type="number" value={input.column2.depth} onChange={(e) => onUpdate({ column2: { ...input.column2, depth: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">N (kN)</Label><Input type="number" value={input.loads2.N} onChange={(e) => onUpdate({ loads2: { N: +e.target.value } })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Configuracion</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground">Distancia entre col. (m)</Label><Input type="number" step="0.1" value={input.distanceBetweenColumns} onChange={(e) => onUpdate({ distanceBetweenColumns: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Forma</Label><Select value={input.footingShape} onValueChange={(v: "rectangular" | "trapezoidal") => onUpdate({ footingShape: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rectangular">Rectangular</SelectItem><SelectItem value="trapezoidal">Trapezoidal</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Suelo y Materiales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">sigma adm (kN/m2)</Label><Input type="number" value={input.soil.sigmaAdm} onChange={(e) => onUpdate({ soil: { ...input.soil, sigmaAdm: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">gamma suelo</Label><Input type="number" value={input.soil.gamma_s} onChange={(e) => onUpdate({ soil: { ...input.soil, gamma_s: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Df (m)</Label><Input type="number" step="0.1" value={input.soil.Df} onChange={(e) => onUpdate({ soil: { ...input.soil, Df: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Hormigon</Label><Select value={input.materials.concreteGrade} onValueChange={(v) => onUpdate({ materials: { ...input.materials, concreteGrade: v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CONCRETE_GRADES).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs text-muted-foreground">Acero</Label><Select value={input.materials.steelGrade} onValueChange={(v) => onUpdate({ materials: { ...input.materials, steelGrade: v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STEEL_GRADES).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs text-muted-foreground">Recubrimiento</Label><Select value={String(input.materials.cover)} onValueChange={(v) => onUpdate({ materials: { ...input.materials, cover: +v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="70">70mm</SelectItem><SelectItem value="50">50mm</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>
    </div>
  )
}

function M6StepDimensioning({ results }: { results: M6Results }) {
  const d = results.dimensioning
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Dimensiones ({results.shape})</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Resultante</span><span className="text-sm font-mono font-semibold">{results.resultant.N_total.toFixed(0)} kN</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Baricentro</span><span className="text-sm font-mono font-semibold">{results.resultant.x_bar.toFixed(3)} m de C1</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Area</span><span className="text-sm font-mono font-semibold">{d.Af.toFixed(2)} m2</span></div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[["L", d.L_total], ["B1", d.B1], ["B2", d.B2], ["H", d.H], ["d", d.d]].map(([l, v]) => (
            <div key={l as string} className="rounded border border-border p-2">
              <span className="block text-[10px] text-muted-foreground">{l as string}</span>
              <span className="text-sm font-mono font-semibold text-foreground">{(v as number).toFixed(2)} m</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function M6StepPressures({ results }: { results: M6Results }) {
  const p = results.pressures
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Presiones en suelo</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">sigma en C1</span><span className="text-sm font-mono font-semibold">{p.sigma1.toFixed(1)} kN/m2</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">sigma en C2</span><span className="text-sm font-mono font-semibold">{p.sigma2.toFixed(1)} kN/m2</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">sigma net adm</span><span className="text-sm font-mono font-semibold">{p.sigmaNet.toFixed(1)} kN/m2</span></div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {p.pass ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          <span className="text-sm text-foreground">{p.pass ? "Presiones admisibles - CUMPLE" : "Presiones excedidas - NO CUMPLE"}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function M6StepReinforcement({ results }: { results: M6Results }) {
  const fx = results.flexureX, fy = results.flexureY
  const b1 = results.transversalBands.band1, b2 = results.transversalBands.band2
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Armadura Longitudinal</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded border border-border p-2"><p className="text-xs font-semibold">{fx.bars.count} x {fx.bars.diameter}mm c/{fx.bars.spacing.toFixed(0)}cm ({fx.bars.totalArea.toFixed(2)} cm2)</p><p className="text-[10px] text-muted-foreground">Mu={fx.Mu.toFixed(1)} kN.m | As_req={fx.AsReq.toFixed(2)} cm2</p></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Armadura Transversal General</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded border border-border p-2"><p className="text-xs font-semibold">{fy.bars.count} x {fy.bars.diameter}mm c/{fy.bars.spacing.toFixed(0)}cm ({fy.bars.totalArea.toFixed(2)} cm2)</p><p className="text-[10px] text-muted-foreground">Mu={fy.Mu.toFixed(1)} kN.m | As_req={fy.AsReq.toFixed(2)} cm2</p></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Fajas Transversales</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {[{ label: "Faja C1", f: b1 }, { label: "Faja C2", f: b2 }].map(({ label, f }) => (
            <div key={label} className="rounded border border-border p-2"><p className="text-xs font-semibold">{label}: {f.bars.count} x {f.bars.diameter}mm ({f.bars.totalArea.toFixed(2)} cm2)</p><p className="text-[10px] text-muted-foreground">Mu={f.Mu.toFixed(1)} kN.m</p></div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function M6StepSummary({ results, verifications }: { results: M6Results; verifications: VerificationStatus[] }) {
  const allPass = verifications.every((v) => v.pass)
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold">{allPass ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />} Resumen {allPass ? "- CUMPLE" : "- NO CUMPLE"}</CardTitle></CardHeader>
      <CardContent>
        <VerificationSummary verifications={verifications} />
        <p className="mt-3 text-xs text-muted-foreground">Forma: {results.shape} | Comb. gob.: {results.governingCombination}</p>
      </CardContent>
    </Card>
  )
}
