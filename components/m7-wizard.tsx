"use client"

import { useState, useMemo } from "react"
import { calculateM7, type M7Input, type M7Results, type SoilLayer } from "@/lib/calculations/m7-engine"
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
import { ArrowLeft, ArrowRight, Calculator, RotateCcw, Download, CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react"

const MODULE = MODULES.find((m) => m.id === "m7")!
const STEPS = MODULE.steps

const defaultLayer: SoilLayer = { name: "Arcilla blanda", thickness: 3, type: "cohesive", gamma: 17, cu: 40 }

const defaults: M7Input = {
  projectName: "",
  column: { width: 40, depth: 40, shape: "rectangular" },
  loads: { N: 1200 },
  soilProfile: [
    { name: "Relleno", thickness: 1.5, type: "granular", gamma: 16, Nspt: 5 },
    { name: "Arcilla firme", thickness: 4, type: "cohesive", gamma: 18, cu: 60 },
    { name: "Arena densa", thickness: 6, type: "granular", gamma: 19, phi: 35, Nspt: 30 },
  ],
  pileDiameter: 40,
  pileLength: 10,
  pileType: "bored",
  numPiles: 4,
  materials: { concreteGrade: "H25", steelGrade: "ADN420", cover: 70 },
}

export function M7Wizard() {
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<M7Input>(defaults)
  const [results, setResults] = useState<M7Results | null>(null)

  function update(partial: Partial<M7Input>) { setInput((prev) => ({ ...prev, ...partial })) }

  function handleCalculate() {
    try { setResults(calculateM7(input)); setStep(3) } catch (e) { console.error("M7:", e) }
  }

  function handleNext() {
    if (step === 2) handleCalculate()
    else setStep(Math.min(step + 1, STEPS.length - 1))
  }

  const verifications = useMemo<VerificationStatus[]>(() => {
    if (!results) return []
    return [
      { label: "Capacidad pilote", value: results.capDesign.maxPileLoad / 1.4, limit: results.pileCapacity.Qadm, ratio: (results.capDesign.maxPileLoad / 1.4) / results.pileCapacity.Qadm, pass: results.capDesign.passCapacity, reference: "Q_pile <= Q_adm", severity: results.capDesign.passCapacity ? "ok" : "error" },
      { label: "Angulo biela", value: results.strutTie.thetaStrut, limit: 25, ratio: 25 / Math.max(results.strutTie.thetaStrut, 1), pass: results.strutTie.thetaStrut >= 25, reference: "theta >= 25 deg", severity: results.strutTie.thetaStrut >= 25 ? "ok" : "error" },
    ]
  }, [results])

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">M7</Badge>
            <h1 className="text-xl font-bold text-foreground">Pilotes (Cabezales)</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Perfil estratigrafico, capacidad, cabezal Jimenez Montoya</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStep(0); setResults(null); setInput(defaults) }} className="gap-2 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Reiniciar</Button>
      </div>

      <WizardStepper steps={STEPS} currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />
      <Separator />

      <div className="lg:col-span-2">
        {step === 0 && <M7StepInputs input={input} onUpdate={update} />}
        {step === 1 && <M7StepSoilProfile input={input} onUpdate={update} />}
        {step === 2 && !results && <PreCalcCard />}
        {step === 2 && results && <M7StepCapacity results={results} />}
        {step === 3 && results && <M7StepCap results={results} />}
        {step === 4 && results && <M7StepReinforcement results={results} />}
        {step === 5 && results && <M7StepSummary results={results} verifications={verifications} />}
      </div>

      <Separator />
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0} className="gap-2"><ArrowLeft className="h-4 w-4" /> Anterior</Button>
        <span className="text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-2">{step === 2 && !results ? <><Calculator className="h-4 w-4" /> Calcular</> : <>Siguiente <ArrowRight className="h-4 w-4" /></>}</Button>
        ) : <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Exportar PDF</Button>}
      </div>
    </div>
  )
}

function PreCalcCard() {
  return <Card className="border-border bg-card"><CardContent className="py-8"><div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">Pulse <strong className="text-foreground">Calcular</strong> para ejecutar el motor.</p></div></CardContent></Card>
}

function M7StepInputs({ input, onUpdate }: { input: M7Input; onUpdate: (d: Partial<M7Input>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border bg-card"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Proyecto</CardTitle></CardHeader><CardContent><Input value={input.projectName} onChange={(e) => onUpdate({ projectName: e.target.value })} placeholder="Nombre" /></CardContent></Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Columna y Cargas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">Ancho col. (cm)</Label><Input type="number" value={input.column.width} onChange={(e) => onUpdate({ column: { ...input.column, width: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">N (kN)</Label><Input type="number" value={input.loads.N} onChange={(e) => onUpdate({ loads: { ...input.loads, N: +e.target.value } })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Mx (kN.m)</Label><Input type="number" value={input.loads.Mx || 0} onChange={(e) => onUpdate({ loads: { ...input.loads, Mx: +e.target.value } })} className="mt-1 font-mono" /></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Pilotes</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground">Diametro (cm)</Label><Input type="number" value={input.pileDiameter} onChange={(e) => onUpdate({ pileDiameter: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Longitud (m)</Label><Input type="number" value={input.pileLength} onChange={(e) => onUpdate({ pileLength: +e.target.value })} className="mt-1 font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Tipo</Label><Select value={input.pileType} onValueChange={(v: "bored" | "driven") => onUpdate({ pileType: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bored">Perforado</SelectItem><SelectItem value="driven">Hincado</SelectItem></SelectContent></Select></div>
          <div><Label className="text-xs text-muted-foreground">Cantidad</Label><Select value={String(input.numPiles)} onValueChange={(v) => onUpdate({ numPiles: +v as 2|3|4|5|6 })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{[2,3,4,5,6].map((n) => <SelectItem key={n} value={String(n)}>{n} pilotes</SelectItem>)}</SelectContent></Select></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Materiales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs text-muted-foreground">Hormigon</Label><Select value={input.materials.concreteGrade} onValueChange={(v) => onUpdate({ materials: { ...input.materials, concreteGrade: v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CONCRETE_GRADES).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs text-muted-foreground">Acero</Label><Select value={input.materials.steelGrade} onValueChange={(v) => onUpdate({ materials: { ...input.materials, steelGrade: v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STEEL_GRADES).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs text-muted-foreground">Recubrimiento</Label><Select value={String(input.materials.cover)} onValueChange={(v) => onUpdate({ materials: { ...input.materials, cover: +v } })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="70">70mm</SelectItem><SelectItem value="50">50mm</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>
    </div>
  )
}

function M7StepSoilProfile({ input, onUpdate }: { input: M7Input; onUpdate: (d: Partial<M7Input>) => void }) {
  function addLayer() {
    onUpdate({ soilProfile: [...input.soilProfile, { ...defaultLayer, name: `Capa ${input.soilProfile.length + 1}` }] })
  }
  function removeLayer(i: number) {
    onUpdate({ soilProfile: input.soilProfile.filter((_, idx) => idx !== i) })
  }
  function updateLayer(i: number, partial: Partial<SoilLayer>) {
    const updated = [...input.soilProfile]
    updated[i] = { ...updated[i], ...partial }
    onUpdate({ soilProfile: updated })
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Perfil Estratigrafico</CardTitle>
          <Button variant="outline" size="sm" onClick={addLayer} className="gap-1"><Plus className="h-3 w-3" /> Agregar capa</Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {input.soilProfile.map((layer, i) => (
          <div key={i} className="rounded border border-border p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Capa {i + 1}</span>
              {input.soilProfile.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeLayer(i)}><Trash2 className="h-3 w-3" /></Button>}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-[10px]">Nombre</Label><Input value={layer.name} onChange={(e) => updateLayer(i, { name: e.target.value })} className="mt-1 text-xs" /></div>
              <div><Label className="text-[10px]">Espesor (m)</Label><Input type="number" step="0.5" value={layer.thickness} onChange={(e) => updateLayer(i, { thickness: +e.target.value })} className="mt-1 font-mono text-xs" /></div>
              <div><Label className="text-[10px]">Tipo</Label><Select value={layer.type} onValueChange={(v: "granular" | "cohesive") => updateLayer(i, { type: v })}><SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="granular">Granular</SelectItem><SelectItem value="cohesive">Cohesivo</SelectItem></SelectContent></Select></div>
              <div><Label className="text-[10px]">gamma (kN/m3)</Label><Input type="number" value={layer.gamma} onChange={(e) => updateLayer(i, { gamma: +e.target.value })} className="mt-1 font-mono text-xs" /></div>
            </div>
            {layer.type === "granular" ? (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px]">phi (deg)</Label><Input type="number" value={layer.phi || 30} onChange={(e) => updateLayer(i, { phi: +e.target.value })} className="mt-1 font-mono text-xs" /></div>
                <div><Label className="text-[10px]">N SPT</Label><Input type="number" value={layer.Nspt || 15} onChange={(e) => updateLayer(i, { Nspt: +e.target.value })} className="mt-1 font-mono text-xs" /></div>
              </div>
            ) : (
              <div><Label className="text-[10px]">cu (kPa)</Label><Input type="number" value={layer.cu || 50} onChange={(e) => updateLayer(i, { cu: +e.target.value })} className="mt-1 font-mono text-xs w-1/2" /></div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function M7StepCapacity({ results }: { results: M7Results }) {
  const q = results.pileCapacity
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Capacidad de Pilote Individual</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Qp (punta)</span><span className="text-sm font-mono font-semibold">{q.Qp.toFixed(0)} kN</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Qs (fuste)</span><span className="text-sm font-mono font-semibold">{q.Qs.toFixed(0)} kN</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Qu (ultima)</span><span className="text-sm font-mono font-semibold">{q.Qu.toFixed(0)} kN</span></div>
          <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Qadm</span><span className="text-sm font-mono font-semibold text-primary">{q.Qadm.toFixed(0)} kN</span></div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">FS punta = 3.0, FS fuste = 2.0</p>
      </CardContent>
    </Card>
  )
}

function M7StepCap({ results }: { results: M7Results }) {
  const c = results.capDesign, st = results.strutTie
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Cabezal ({c.type})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Ancho</span><span className="text-sm font-mono font-semibold">{c.width.toFixed(2)} m</span></div>
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Largo</span><span className="text-sm font-mono font-semibold">{c.length.toFixed(2)} m</span></div>
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Alto</span><span className="text-sm font-mono font-semibold">{c.height.toFixed(2)} m</span></div>
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">N max pilote</span><span className="text-sm font-mono font-semibold">{(c.maxPileLoad / 1.4).toFixed(0)} kN</span></div>
          </div>
          <div className="flex items-center gap-2">{c.passCapacity ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}<span className="text-sm">{c.passCapacity ? "Capacidad OK" : "Excede capacidad"}</span></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Modelo Biela-Tirante</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">theta biela</span><span className="text-sm font-mono font-semibold">{st.thetaStrut.toFixed(1)} deg</span></div>
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Fc biela</span><span className="text-sm font-mono font-semibold">{st.Fc_strut.toFixed(0)} kN</span></div>
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">Ft tirante</span><span className="text-sm font-mono font-semibold">{st.Ft_tie.toFixed(0)} kN</span></div>
            <div className="rounded border border-border p-2"><span className="block text-[10px] text-muted-foreground">As tirante</span><span className="text-sm font-mono font-semibold">{st.As_tie.toFixed(2)} cm2</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function M7StepReinforcement({ results }: { results: M7Results }) {
  const st = results.strutTie, fl = results.flexure
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Armadura Tirante</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded border border-border p-2"><p className="text-xs font-semibold text-primary">{st.bars.count} x {st.bars.diameter}mm ({st.bars.totalArea.toFixed(2)} cm2)</p><p className="text-[10px] text-muted-foreground">As req = {st.As_tie.toFixed(2)} cm2</p></div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Armadura Flexion Cabezal</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded border border-border p-2"><p className="text-xs font-semibold text-primary">{fl.bars.count} x {fl.bars.diameter}mm c/{fl.bars.spacing.toFixed(0)}cm ({fl.bars.totalArea.toFixed(2)} cm2)</p><p className="text-[10px] text-muted-foreground">Mu={fl.Mu.toFixed(1)} kN.m | As_req={fl.AsReq.toFixed(2)} cm2 | As_min={fl.AsMin.toFixed(2)} cm2</p></div>
        </CardContent>
      </Card>
    </div>
  )
}

function M7StepSummary({ results, verifications }: { results: M7Results; verifications: VerificationStatus[] }) {
  const allPass = verifications.every((v) => v.pass)
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold">{allPass ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />} Resumen {allPass ? "- CUMPLE" : "- NO CUMPLE"}</CardTitle></CardHeader>
      <CardContent>
        <VerificationSummary verifications={verifications} />
        <p className="mt-3 text-xs text-muted-foreground">Comb. gob.: {results.governingCombination}</p>
      </CardContent>
    </Card>
  )
}
