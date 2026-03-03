"use client"

import { useState, useMemo } from "react"
import { calculateM4, type M4Input, type M4Results } from "@/lib/calculations/m4-engine"
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

const MODULE = MODULES.find((m) => m.id === "m4")!
const STEPS = MODULE.steps

const defaults: M4Input = {
  projectName: "",
  column: { width: 30, depth: 30, shape: "rectangular" },
  columnInterior: { width: 40, depth: 40, shape: "rectangular" },
  loads: { N: 400 },
  loadsInterior: { N: 800 },
  soil: { sigmaAdm: 150, gamma_s: 18, Df: 1.2 },
  materials: { concreteGrade: "H25", steelGrade: "ADN420", cover: 70 },
  distanceBetweenColumns: 5.0,
  edgeDistance: 0.20,
}

export function M4Wizard() {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<M4Input>(defaults)
  const [results, setResults] = useState<M4Results | null>(null)

  function update(partial: Partial<M4Input>) { setInput((prev) => ({ ...prev, ...partial })) }

  function handleCalculate() {
    try { setResults(calculateM4(input)); setStep(2) } catch (e) { console.error("M4:", e) }
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
      { label: "Corte X B1", value: f1.shearX.Vu, limit: f1.shearX.phiVc, ratio: f1.shearX.ratio, pass: f1.shearX.pass, reference: f1.shearX.reference, severity: f1.shearX.pass ? "ok" : "error" },
      { label: "Corte X B2", value: f2.shearX.Vu, limit: f2.shearX.phiVc, ratio: f2.shearX.ratio, pass: f2.shearX.pass, reference: f2.shearX.reference, severity: f2.shearX.pass ? "ok" : "error" },
      { label: "Mensula (a/d<=1)", value: results.mensula.aOverD, limit: 1.0, ratio: results.mensula.aOverD, pass: results.mensula.pass, reference: results.mensula.reference, severity: results.mensula.pass ? "ok" : "error" },
      { label: "Corte friccion", value: results.shearFriction.Vuf, limit: results.shearFriction.Avf * 1000, ratio: 0.5, pass: results.shearFriction.pass, reference: results.shearFriction.reference, severity: results.shearFriction.pass ? "ok" : "error" },
    ]
  }, [results])

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">M4</Badge>
            <h1 className="text-xl font-bold text-foreground">Base Excentrica con Tensor</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Mensula corta, tensor y corte por friccion</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStep(0); setResults(null); setInput(defaults) }} className="gap-2 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Reiniciar</Button>
      </div>

      <WizardStepper steps={STEPS} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />
      <Separator />

      <div className="lg:col-span-2">
        {step === 0 && <M4StepInputs input={input} onUpdate={update} />}
        {step === 1 && results && <M4StepBases results={results} />}
        {step === 1 && !results && <PreCalcCard />}
        {step === 2 && results && <M4StepTensor results={results} />}
        {step === 3 && results && <VerificationSummary verifications={verifications} />}
        {step === 4 && results && <M4StepReinforcement results={results} />}
        {step === 5 && results && <M4StepSummary results={results} verifications={verifications} />}
      </div>

      <Separator />
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0} className="gap-2"><ArrowLeft className="h-4 w-4" /> Anterior</Button>
        <span className="text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-2">
            {step === 1 && !results ? <><Calculator className="h-4 w-4" /> Calcular</> : <>Siguiente <ArrowRight className="h-4 w-4" /></>}
          </Button>
        ) : <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Exportar PDF</Button>}
      </div>
    </div>
  )
}

function PreCalcCard() {
  return (
    <Card className="border-border bg-card">
      <CardContent className="py-8">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">Pulse <strong className="text-foreground">Calcular</strong> para ejecutar el motor.</p></div>
      </CardContent>
    </Card>
  )
}

function M4StepInputs({ input, onUpdate }: { input: M4Input; onUpdate: (d: Partial<M4Input>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Proyecto</CardTitle></CardHeader>
        <CardContent><Input value={input.projectName} onChange={(e) => onUpdate({ projectName: e.target.value })} placeholder="Nombre" /></CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Columna Medianera (C1)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">Ancho (cm)</Label><Input type="number" value={input.column.width} onChange={(e) => onUpdate({ column: { ...input.column, width: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Prof. (cm)</Label><Input type="number" value={input.column.depth} onChange={(e) => onUpdate({ column: { ...input.column, depth: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">N (kN)</Label><Input type="number" value={input.loads.N} onChange={(e) => onUpdate({ loads: { ...input.loads, N: +e.target.value } })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Columna Interior (C2)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">Ancho (cm)</Label><Input type="number" value={input.columnInterior.width} onChange={(e) => onUpdate({ columnInterior: { ...input.columnInterior, width: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Prof. (cm)</Label><Input type="number" value={input.columnInterior.depth} onChange={(e) => onUpdate({ columnInterior: { ...input.columnInterior, depth: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">N (kN)</Label><Input type="number" value={input.loadsInterior.N} onChange={(e) => onUpdate({ loadsInterior: { N: +e.target.value } })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Geometria</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground">Distancia entre columnas (m)</Label><Input type="number" step="0.1" value={input.distanceBetweenColumns} onChange={(e) => onUpdate({ distanceBetweenColumns: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Dist. al borde medianera (m)</Label><Input type="number" step="0.05" value={input.edgeDistance} onChange={(e) => onUpdate({ edgeDistance: +e.target.value })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Suelo y Materiales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">sigma adm</Label><Input type="number" value={input.soil.sigmaAdm} onChange={(e) => onUpdate({ soil: { ...input.soil, sigmaAdm: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">gamma suelo</Label><Input type="number" value={input.soil.gamma_s} onChange={(e) => onUpdate({ soil: { ...input.soil, gamma_s: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Df (m)</Label><Input type="number" step="0.1" value={input.soil.Df} onChange={(e) => onUpdate({ soil: { ...input.soil, Df: +e.target.value } })} className="mt-1 font-mono" /></div>
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
            <Select value={String(input.materials.cover)} onValueChange={(v) => onUpdate({ materials: { ...input.materials, cover: +v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="70">70mm</SelectItem><SelectItem value="50">50mm</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function M4StepBases({ results }: { results: M4Results }) {
  return (
    <div className="flex flex-col gap-4">
      {[{ label: "Base 1 (Medianera)", dim: results.footing1.dimensioning }, { label: "Base 2 (Interior)", dim: results.footing2.dimensioning }].map(({ label, dim }) => (
        <Card key={label} className="border-border bg-card">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{label}</CardTitle></CardHeader>
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

function M4StepTensor({ results }: { results: M4Results }) {
  const t = results.tensor, m = results.mensula, sf = results.shearFriction
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Tensor</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Tu</span><span className="text-sm font-mono font-semibold text-foreground">{t.tensionForce.toFixed(1)} kN</span></div>
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">As req</span><span className="text-sm font-mono font-semibold text-foreground">{t.AsRequired.toFixed(2)} cm2</span></div>
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Armadura</span><span className="text-sm font-mono font-semibold text-foreground">{t.bars.count} x {t.bars.diameter}mm</span></div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Mensula Corta (CIRSOC 11.9)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><span className="text-muted-foreground">a/d:</span> <span className="font-mono">{m.aOverD.toFixed(3)}</span> {m.pass ? <Badge variant="outline" className="ml-1 text-[9px] text-green-600">OK</Badge> : <Badge variant="destructive" className="ml-1 text-[9px]">NO</Badge>}</div>
            <div><span className="text-muted-foreground">Vu:</span> <span className="font-mono">{m.Vu_mensula.toFixed(1)} kN</span></div>
            <div><span className="text-muted-foreground">Mu:</span> <span className="font-mono">{m.Mu_mensula.toFixed(1)} kN.m</span></div>
            <div><span className="text-muted-foreground">As flex:</span> <span className="font-mono">{m.As_flex.toFixed(2)} cm2</span></div>
            <div><span className="text-muted-foreground">As corte:</span> <span className="font-mono">{m.As_shear.toFixed(2)} cm2</span></div>
            <div><span className="text-muted-foreground">Ah:</span> <span className="font-mono">{m.Ah.toFixed(2)} cm2</span></div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Corte por Friccion (CIRSOC 11.7)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><span className="text-muted-foreground">Vuf:</span> <span className="font-mono">{sf.Vuf.toFixed(1)} kN</span></div>
            <div><span className="text-muted-foreground">Avf:</span> <span className="font-mono">{sf.Avf.toFixed(2)} cm2</span></div>
            <div><span className="text-muted-foreground">mu:</span> <span className="font-mono">{sf.mu_f}</span> {sf.pass ? <Badge variant="outline" className="ml-1 text-[9px] text-green-600">OK</Badge> : <Badge variant="destructive" className="ml-1 text-[9px]">NO</Badge>}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function M4StepReinforcement({ results }: { results: M4Results }) {
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

function M4StepSummary({ results, verifications }: { results: M4Results; verifications: VerificationStatus[] }) {
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
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Esbeltez: lambda={results.slenderness.lambda} {results.slenderness.isSlender ? "(esbelta)" : "(corta)"}</div>
          <div>Comb. gob.: {results.governingCombination}</div>
        </div>
      </CardContent>
    </Card>
  )
}
