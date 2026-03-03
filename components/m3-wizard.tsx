"use client"

import { useState, useMemo } from "react"
import { calculateM3, type M3Input, type M3Results } from "@/lib/calculations/m3-engine"
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

const MODULE = MODULES.find((m) => m.id === "m3")!
const STEPS = MODULE.steps

const defaults: M3Input = {
  projectName: "",
  column: { width: 30, depth: 30, shape: "rectangular" },
  loads: { N: 600 },
  soil: { sigmaAdm: 150, gamma_s: 18, Df: 1.2 },
  materials: { concreteGrade: "H25", steelGrade: "ADN420", cover: 70 },
  beamWidth: 30,
  beamHeight: 60,
  cantileverLength: 0.8,
}

export function M3Wizard() {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<M3Input>(defaults)
  const [results, setResults] = useState<M3Results | null>(null)

  function update(partial: Partial<M3Input>) {
    setInput((prev) => ({ ...prev, ...partial }))
  }

  function handleCalculate() {
    try {
      setResults(calculateM3(input))
      setStep(2)
    } catch (e) {
      console.error("M3 error:", e)
    }
  }

  function handleNext() {
    if (step === 1) handleCalculate()
    else setStep(Math.min(step + 1, STEPS.length - 1))
  }

  const verifications = useMemo<VerificationStatus[]>(() => {
    if (!results) return []
    return [
      { label: "Presion suelo", value: results.dimensioning.sigmaSol, limit: results.dimensioning.sigmaNet, ratio: results.dimensioning.ratio, pass: results.dimensioning.ratio <= 1, reference: "sigma_sol <= sigma_net", severity: results.dimensioning.ratio <= 1 ? (results.dimensioning.ratio > 0.9 ? "warning" : "ok") : "error" },
      { label: "Corte X", value: results.shearX.Vu, limit: results.shearX.phiVc, ratio: results.shearX.ratio, pass: results.shearX.pass, reference: results.shearX.reference, severity: results.shearX.pass ? (results.shearX.ratio > 0.9 ? "warning" : "ok") : "error" },
      { label: "Corte Y", value: results.shearY.Vu, limit: results.shearY.phiVc, ratio: results.shearY.ratio, pass: results.shearY.pass, reference: results.shearY.reference, severity: results.shearY.pass ? (results.shearY.ratio > 0.9 ? "warning" : "ok") : "error" },
      { label: "Punzonado", value: results.punching.Vu, limit: results.punching.phiVc, ratio: results.punching.ratio, pass: results.punching.pass, reference: results.punching.reference, severity: results.punching.pass ? (results.punching.ratio > 0.9 ? "warning" : "ok") : "error" },
    ]
  }, [results])

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">M3</Badge>
            <h1 className="text-xl font-bold text-foreground">Base con Viga Central</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Zapata con viga rigida en voladizo</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStep(0); setResults(null); setInput(defaults) }} className="gap-2 text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
        </Button>
      </div>

      <WizardStepper steps={STEPS} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />
      <Separator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 0 && <M3StepInputs input={input} onUpdate={update} />}
          {step === 1 && <M3StepDimensioning input={input} />}
          {step === 2 && results && <M3StepVerifications verifications={verifications} results={results} />}
          {step === 3 && results && <M3StepBeam results={results} />}
          {step === 4 && results && <M3StepReinforcement results={results} />}
          {step === 5 && results && <M3StepSummary results={results} verifications={verifications} />}
        </div>
        <div className="flex flex-col gap-4">
          {(results || step > 0) && (
            <>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Planta</CardTitle></CardHeader>
                <CardContent className="flex justify-center">
                  <FootingPlanView B={results?.dimensioning.B || 1.5} L={results?.dimensioning.L || 1.5} colX={input.column.width} colY={input.column.depth} />
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Corte</CardTitle></CardHeader>
                <CardContent className="flex justify-center">
                  <FootingSectionView B={results?.dimensioning.B || 1.5} H={results?.dimensioning.H || 0.4} colX={input.column.width} d={results?.dimensioning.d} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Separator />
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Anterior
        </Button>
        <span className="text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-2">
            {step === 1 && !results ? <><Calculator className="h-4 w-4" /> Calcular</> : <>Siguiente <ArrowRight className="h-4 w-4" /></>}
          </Button>
        ) : (
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Exportar PDF</Button>
        )}
      </div>
    </div>
  )
}

function M3StepInputs({ input, onUpdate }: { input: M3Input; onUpdate: (d: Partial<M3Input>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Proyecto</CardTitle></CardHeader>
        <CardContent>
          <Label className="text-xs text-muted-foreground">Nombre</Label>
          <Input value={input.projectName} onChange={(e) => onUpdate({ projectName: e.target.value })} placeholder="Ej: Edificio Norte - Z3" className="mt-1" />
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Columna y Cargas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground">Ancho col. (cm)</Label><Input type="number" value={input.column.width} onChange={(e) => onUpdate({ column: { ...input.column, width: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Prof. col. (cm)</Label><Input type="number" value={input.column.depth} onChange={(e) => onUpdate({ column: { ...input.column, depth: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">N servicio (kN)</Label><Input type="number" value={input.loads.N} onChange={(e) => onUpdate({ loads: { ...input.loads, N: +e.target.value } })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Viga Central</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">Ancho viga (cm)</Label><Input type="number" value={input.beamWidth} onChange={(e) => onUpdate({ beamWidth: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Alto viga (cm)</Label><Input type="number" value={input.beamHeight} onChange={(e) => onUpdate({ beamHeight: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Voladizo (m)</Label><Input type="number" step="0.1" value={input.cantileverLength} onChange={(e) => onUpdate({ cantileverLength: +e.target.value })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Suelo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">sigma adm (kN/m2)</Label><Input type="number" value={input.soil.sigmaAdm} onChange={(e) => onUpdate({ soil: { ...input.soil, sigmaAdm: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">gamma suelo (kN/m3)</Label><Input type="number" value={input.soil.gamma_s} onChange={(e) => onUpdate({ soil: { ...input.soil, gamma_s: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Df (m)</Label><Input type="number" step="0.1" value={input.soil.Df} onChange={(e) => onUpdate({ soil: { ...input.soil, Df: +e.target.value } })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Materiales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Hormigon</Label>
            <Select value={input.materials.concreteGrade} onValueChange={(v) => onUpdate({ materials: { ...input.materials, concreteGrade: v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CONCRETE_GRADES).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Acero</Label>
            <Select value={input.materials.steelGrade} onValueChange={(v) => onUpdate({ materials: { ...input.materials, steelGrade: v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STEEL_GRADES).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Recubrimiento</Label>
            <Select value={String(input.materials.cover)} onValueChange={(v) => onUpdate({ materials: { ...input.materials, cover: +v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="70">70mm</SelectItem><SelectItem value="50">50mm</SelectItem><SelectItem value="40">40mm</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function M3StepDimensioning({ input }: { input: M3Input }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader><CardTitle className="text-sm font-semibold">Pre-dimensionamiento</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">El motor calculara las dimensiones optimas de la base y verificara la viga central como voladizo.</p>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">Pulse <strong className="text-foreground">Calcular</strong> para continuar.</p>
        </div>
      </CardContent>
    </Card>
  )
}

function M3StepVerifications({ verifications, results }: { verifications: VerificationStatus[]; results: M3Results }) {
  const dim = results.dimensioning
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Dimensiones</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {[["B", dim.B, "m"], ["L", dim.L, "m"], ["H", dim.H, "m"], ["d", dim.d, "m"]].map(([l, v, u]) => (
              <div key={l as string} className="rounded border border-border p-2">
                <span className="block text-[10px] text-muted-foreground">{l as string}</span>
                <span className="text-sm font-mono font-semibold text-foreground">{(v as number).toFixed(2)} {u as string}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <VerificationSummary verifications={verifications} />
    </div>
  )
}

function M3StepBeam({ results }: { results: M3Results }) {
  const b = results.beam
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Viga Central (Voladizo)</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Mu viga</span><span className="text-sm font-mono font-semibold text-foreground">{b.Mu_beam.toFixed(1)} kN.m</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Vu viga</span><span className="text-sm font-mono font-semibold text-foreground">{b.Vu_beam.toFixed(1)} kN</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">As principal</span><span className="text-sm font-mono font-semibold text-foreground">{b.AsPrincipal.toFixed(2)} cm2</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">As rep. (0.20)</span><span className="text-sm font-mono font-semibold text-foreground">{b.AsRep.toFixed(2)} cm2</span></div>
        </div>
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            Armadura viga: <strong className="text-foreground">{b.bars.count} barras de {b.bars.diameter}mm</strong> ({b.bars.totalArea.toFixed(2)} cm2)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function M3StepReinforcement({ results }: { results: M3Results }) {
  const fx = results.flexureX, fy = results.flexureY
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Armaduras Base</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        {[{ dir: "X", f: fx }, { dir: "Y", f: fy }].map(({ dir, f }) => (
          <div key={dir} className="rounded border border-border p-3">
            <p className="text-xs font-semibold text-foreground mb-2">Direccion {dir}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-muted-foreground">Mu:</span> <span className="font-mono">{f.Mu.toFixed(1)} kN.m</span></div>
              <div><span className="text-muted-foreground">As req:</span> <span className="font-mono">{f.AsReq.toFixed(2)} cm2</span></div>
              <div><span className="text-muted-foreground">As min:</span> <span className="font-mono">{f.AsMin.toFixed(2)} cm2</span></div>
            </div>
            <p className="mt-2 text-xs text-primary font-medium">{f.bars.count} barras {f.bars.diameter}mm c/{f.bars.spacing.toFixed(0)}cm ({f.bars.totalArea.toFixed(2)} cm2)</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function M3StepSummary({ results, verifications }: { results: M3Results; verifications: VerificationStatus[] }) {
  const allPass = verifications.every((v) => v.pass)
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {allPass ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          Resumen {allPass ? "- CUMPLE" : "- NO CUMPLE"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <VerificationSummary verifications={verifications} />
        <p className="mt-3 text-xs text-muted-foreground">Combinacion gobernante: {results.governingCombination}</p>
      </CardContent>
    </Card>
  )
}
