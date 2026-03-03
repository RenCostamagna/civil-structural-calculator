"use client"

import { useState, useMemo } from "react"
import { calculateM5, type M5Input, type M5Results } from "@/lib/calculations/m5-engine"
import { CONCRETE_GRADES, STEEL_GRADES, MODULES } from "@/lib/constants/cirsoc"
import type { VerificationStatus } from "@/lib/types/foundation"
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
import { ArrowLeft, ArrowRight, Calculator, RotateCcw, Download, CheckCircle2, XCircle } from "lucide-react"

const MODULE = MODULES.find((m) => m.id === "m5")!
const STEPS = MODULE.steps

const defaults: M5Input = {
  projectName: "",
  columnMedianera: { width: 30, depth: 30, shape: "rectangular" },
  columnInterior: { width: 40, depth: 40, shape: "rectangular" },
  loadsMedianera: { N: 400 },
  loadsInterior: { N: 800 },
  soil: { sigmaAdm: 150, gamma_s: 18, Df: 1.2 },
  materials: { concreteGrade: "H25", steelGrade: "ADN420", cover: 70 },
  distanceBetweenColumns: 5.0,
  edgeDistance: 0.20,
}

export function M5Wizard() {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<M5Input>(defaults)
  const [results, setResults] = useState<M5Results | null>(null)

  function update(partial: Partial<M5Input>) { setInput((prev) => ({ ...prev, ...partial })) }

  function handleCalculate() {
    try { setResults(calculateM5(input)); setStep(2) } catch (e) { console.error("M5:", e) }
  }

  function handleNext() {
    if (step === 1) handleCalculate()
    else setStep(Math.min(step + 1, STEPS.length - 1))
  }

  const verifications = useMemo<VerificationStatus[]>(() => {
    if (!results) return []
    const f1 = results.footing1, f2 = results.footing2
    return [
      { label: "Presion B1", value: f1.dimensioning.sigmaSol, limit: f1.dimensioning.sigmaNet, ratio: f1.dimensioning.ratio, pass: f1.dimensioning.ratio <= 1, reference: "sigma <= sigma_net", severity: f1.dimensioning.ratio <= 1 ? "ok" : "error" },
      { label: "Presion B2", value: f2.dimensioning.sigmaSol, limit: f2.dimensioning.sigmaNet, ratio: f2.dimensioning.ratio, pass: f2.dimensioning.ratio <= 1, reference: "sigma <= sigma_net", severity: f2.dimensioning.ratio <= 1 ? "ok" : "error" },
      { label: "Corte B1", value: f1.shearX.Vu, limit: f1.shearX.phiVc, ratio: f1.shearX.ratio, pass: f1.shearX.pass, reference: f1.shearX.reference, severity: f1.shearX.pass ? "ok" : "error" },
      { label: "Corte B2", value: f2.shearX.Vu, limit: f2.shearX.phiVc, ratio: f2.shearX.ratio, pass: f2.shearX.pass, reference: f2.shearX.reference, severity: f2.shearX.pass ? "ok" : "error" },
    ]
  }, [results])

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">M5</Badge>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Base con Viga de Equilibrio</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Columna medianera + interior con viga rigida de equilibrio</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStep(0); setResults(null); setInput(defaults) }} className="shrink-0 gap-2 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Reiniciar</span></Button>
      </div>

      <WizardStepper steps={STEPS} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />
      <Separator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 0 && <M5StepInputs input={input} onUpdate={update} />}
          {step === 1 && !results && <PreCalcCard />}
          {step === 1 && results && <M5StepBases results={results} />}
          {step === 2 && results && <M5StepBeam results={results} />}
          {step === 3 && results && <VerificationSummary verifications={verifications} />}
          {step === 4 && results && <M5StepReinforcement results={results} />}
          {step === 5 && results && <M5StepSummary results={results} verifications={verifications} />}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
          {results && (
            <>
              <Card className="border-border bg-card"><CardHeader className="px-3 sm:px-6 pb-2"><CardTitle className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">B1 Medianera</CardTitle></CardHeader><CardContent className="px-2 sm:px-6 flex justify-center"><FootingPlanView B={results.footing1.dimensioning.B} L={results.footing1.dimensioning.L} colX={input.columnMedianera.width} colY={input.columnMedianera.depth} /></CardContent></Card>
              <Card className="border-border bg-card"><CardHeader className="px-3 sm:px-6 pb-2"><CardTitle className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">B2 Interior</CardTitle></CardHeader><CardContent className="px-2 sm:px-6 flex justify-center"><FootingPlanView B={results.footing2.dimensioning.B} L={results.footing2.dimensioning.L} colX={input.columnInterior.width} colY={input.columnInterior.depth} /></CardContent></Card>
            </>
          )}
        </div>
      </div>

      <Separator />
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0} className="gap-1.5 sm:gap-2"><ArrowLeft className="h-4 w-4" /> <span className="hidden xs:inline">Anterior</span></Button>
        <span className="text-[10px] sm:text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={handleNext} className="gap-1.5 sm:gap-2">{step === 1 && !results ? <><Calculator className="h-4 w-4" /> Calcular</> : <><span className="hidden xs:inline">Siguiente</span> <ArrowRight className="h-4 w-4" /></>}</Button>
        ) : <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2"><Download className="h-4 w-4" /> <span className="hidden xs:inline">Exportar PDF</span></Button>}
      </div>
    </div>
  )
}

function PreCalcCard() {
  return <Card className="border-border bg-card"><CardContent className="py-8"><div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">Pulse <strong className="text-foreground">Calcular</strong> para ejecutar el motor.</p></div></CardContent></Card>
}

function M5StepInputs({ input, onUpdate }: { input: M5Input; onUpdate: (d: Partial<M5Input>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border bg-card"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Proyecto</CardTitle></CardHeader><CardContent><Input value={input.projectName} onChange={(e) => onUpdate({ projectName: e.target.value })} placeholder="Nombre del proyecto" /></CardContent></Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Columna Medianera (C1)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div><Label className="text-xs text-muted-foreground">Ancho (cm)</Label><Input type="number" value={input.columnMedianera.width} onChange={(e) => onUpdate({ columnMedianera: { ...input.columnMedianera, width: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Prof. (cm)</Label><Input type="number" value={input.columnMedianera.depth} onChange={(e) => onUpdate({ columnMedianera: { ...input.columnMedianera, depth: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">N (kN)</Label><Input type="number" value={input.loadsMedianera.N} onChange={(e) => onUpdate({ loadsMedianera: { N: +e.target.value } })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Columna Interior (C2)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div><Label className="text-xs text-muted-foreground">Ancho (cm)</Label><Input type="number" value={input.columnInterior.width} onChange={(e) => onUpdate({ columnInterior: { ...input.columnInterior, width: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Prof. (cm)</Label><Input type="number" value={input.columnInterior.depth} onChange={(e) => onUpdate({ columnInterior: { ...input.columnInterior, depth: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">N (kN)</Label><Input type="number" value={input.loadsInterior.N} onChange={(e) => onUpdate({ loadsInterior: { N: +e.target.value } })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Geometria</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div><Label className="text-xs text-muted-foreground">Distancia entre columnas (m)</Label><Input type="number" step="0.1" value={input.distanceBetweenColumns} onChange={(e) => onUpdate({ distanceBetweenColumns: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Dist. al borde medianera (m)</Label><Input type="number" step="0.05" value={input.edgeDistance} onChange={(e) => onUpdate({ edgeDistance: +e.target.value })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Suelo y Materiales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div><Label className="text-xs text-muted-foreground">sigma adm (kN/m2)</Label><Input type="number" value={input.soil.sigmaAdm} onChange={(e) => onUpdate({ soil: { ...input.soil, sigmaAdm: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">gamma suelo (kN/m3)</Label><Input type="number" value={input.soil.gamma_s} onChange={(e) => onUpdate({ soil: { ...input.soil, gamma_s: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Df (m)</Label><Input type="number" step="0.1" value={input.soil.Df} onChange={(e) => onUpdate({ soil: { ...input.soil, Df: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Hormigon</Label><Select value={input.materials.concreteGrade} onValueChange={(v) => onUpdate({ materials: { ...input.materials, concreteGrade: v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CONCRETE_GRADES).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs text-muted-foreground">Acero</Label><Select value={input.materials.steelGrade} onValueChange={(v) => onUpdate({ materials: { ...input.materials, steelGrade: v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STEEL_GRADES).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs text-muted-foreground">Recubrimiento</Label><Select value={String(input.materials.cover)} onValueChange={(v) => onUpdate({ materials: { ...input.materials, cover: +v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="70">70mm</SelectItem><SelectItem value="50">50mm</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>
    </div>
  )
}

function M5StepBases({ results }: { results: M5Results }) {
  return (
    <div className="flex flex-col gap-4">
      {[{ label: "Base 1 (Medianera)", dim: results.footing1.dimensioning, R: results.footing1.R1 }, { label: "Base 2 (Interior)", dim: results.footing2.dimensioning, R: results.footing2.R2 }].map(({ label, dim, R }) => (
        <Card key={label} className="border-border bg-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{label} (R = {R.toFixed(1)} kN)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {[["B", dim.B, "m"], ["L", dim.L, "m"], ["H", dim.H, "m"], ["Ratio", dim.ratio, ""]].map(([l, v, u]) => (
                <div key={l as string} className="rounded border border-border p-2">
                  <span className="block text-[10px] text-muted-foreground">{l as string}</span>
                  <span className="text-sm font-mono font-semibold text-foreground">{(v as number).toFixed(2)} {u as string}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function M5StepBeam({ results }: { results: M5Results }) {
  const b = results.beam
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Viga de Equilibrio ({b.bw}x{b.h} cm)</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">M+ max</span><span className="text-sm font-mono font-semibold">{b.Mmax.toFixed(1)} kN.m</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">M- (hogging)</span><span className="text-sm font-mono font-semibold">{b.Mmin.toFixed(1)} kN.m</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">V max</span><span className="text-sm font-mono font-semibold">{b.Vmax.toFixed(1)} kN</span></div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">As+ (inferior)</span><span className="text-sm font-mono font-semibold">{b.AsPositive.toFixed(2)} cm2</span><p className="text-[10px] text-primary">{b.barsPos.count}x{b.barsPos.diameter}mm</p></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">As- (superior)</span><span className="text-sm font-mono font-semibold">{b.AsNegative.toFixed(2)} cm2</span><p className="text-[10px] text-primary">{b.barsNeg.count}x{b.barsNeg.diameter}mm</p></div>
        </div>
      </CardContent>
    </Card>
  )
}

function M5StepReinforcement({ results }: { results: M5Results }) {
  const f1 = results.footing1, f2 = results.footing2
  return (
    <div className="flex flex-col gap-4">
      {[{ label: "Base 1 (Medianera)", fx: f1.flexureX, fy: f1.flexureY }, { label: "Base 2 (Interior)", fx: f2.flexureX, fy: f2.flexureY }].map(({ label, fx, fy }) => (
        <Card key={label} className="border-border bg-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{label}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[{ dir: "X", f: fx }, { dir: "Y", f: fy }].map(({ dir, f }) => (
              <div key={dir} className="rounded border border-border p-2">
                <p className="text-xs font-semibold text-foreground mb-1">Dir. {dir}: {f.bars.count} x {f.bars.diameter}mm c/{f.bars.spacing.toFixed(0)}cm ({f.bars.totalArea.toFixed(2)} cm2)</p>
                <p className="text-[10px] text-muted-foreground">Mu={f.Mu.toFixed(1)} kN.m | As_req={f.AsReq.toFixed(2)} cm2 | As_min={f.AsMin.toFixed(2)} cm2</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function M5StepSummary({ results, verifications }: { results: M5Results; verifications: VerificationStatus[] }) {
  const allPass = verifications.every((v) => v.pass)
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold">{allPass ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />} Resumen {allPass ? "- CUMPLE" : "- NO CUMPLE"}</CardTitle></CardHeader>
      <CardContent>
        <VerificationSummary verifications={verifications} />
        <p className="mt-3 text-xs text-muted-foreground">Comb. gobernante: {results.governingCombination}</p>
      </CardContent>
    </Card>
  )
}
