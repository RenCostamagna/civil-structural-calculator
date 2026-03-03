import jsPDF from "jspdf"
import type { M1Results, M2Results, M1Input, M2Input } from "@/lib/types/foundation"

const MARGIN = 20
const PAGE_W = 210
const CONTENT_W = PAGE_W - 2 * MARGIN

function addHeader(doc: jsPDF, title: string, page: number) {
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text("CalcFund - CIRSOC 201-05", MARGIN, 10)
  doc.text(`Pag. ${page}`, PAGE_W - MARGIN, 10, { align: "right" })
  doc.setDrawColor(200)
  doc.line(MARGIN, 13, PAGE_W - MARGIN, 13)
  doc.setFontSize(14)
  doc.setTextColor(30)
  doc.text(title, MARGIN, 25)
  return 35
}

function addSection(doc: jsPDF, y: number, title: string): number {
  if (y > 260) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(11)
  doc.setTextColor(50, 130, 130)
  doc.text(title, MARGIN, y)
  doc.setDrawColor(50, 130, 130)
  doc.line(MARGIN, y + 1, MARGIN + CONTENT_W, y + 1)
  return y + 8
}

function addRow(doc: jsPDF, y: number, label: string, value: string, unit = ""): number {
  if (y > 275) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(label, MARGIN + 2, y)
  doc.setTextColor(30)
  doc.text(`${value} ${unit}`, MARGIN + 90, y)
  return y + 5.5
}

function addVerificationRow(
  doc: jsPDF,
  y: number,
  label: string,
  ratio: number,
  pass: boolean,
  ref: string
): number {
  if (y > 275) {
    doc.addPage()
    y = 20
  }
  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(label, MARGIN + 2, y)
  doc.setTextColor(pass ? 30 : 180, pass ? 130 : 30, pass ? 30 : 30)
  doc.text(`${(ratio * 100).toFixed(1)}% - ${pass ? "OK" : "NO CUMPLE"}`, MARGIN + 80, y)
  doc.setTextColor(140)
  doc.setFontSize(7)
  doc.text(ref, MARGIN + 130, y)
  doc.setFontSize(9)
  return y + 5.5
}

export function generateM1Pdf(input: M1Input, results: M1Results): jsPDF {
  const doc = new jsPDF()
  let page = 1

  // Cover
  let y = addHeader(doc, `Memoria de Calculo: ${input.projectName}`, page)
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text("Modulo M1 - Base Centrada (Carga Axial)", MARGIN, y)
  y += 5
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, MARGIN, y)
  y += 5
  doc.text("Norma: CIRSOC 201-05 / CIRSOC 601-102", MARGIN, y)
  y += 12

  // Input data
  y = addSection(doc, y, "1. Datos de Entrada")
  y = addRow(doc, y, "Columna:", `${input.column.width} x ${input.column.depth}`, "cm")
  y = addRow(doc, y, "Carga axial (N):", input.loads.N.toFixed(1), "kN")
  y = addRow(doc, y, "sigma_adm:", input.soil.sigmaAdm.toFixed(1), "kN/m2")
  y = addRow(doc, y, "Profundidad Df:", input.soil.Df.toFixed(2), "m")
  y = addRow(doc, y, "gamma_suelo:", input.soil.gamma_s.toFixed(1), "kN/m3")
  y = addRow(doc, y, "Hormigon:", input.materials.concreteGrade)
  y = addRow(doc, y, "Acero:", input.materials.steelGrade)
  y = addRow(doc, y, "Recubrimiento:", input.materials.cover.toString(), "mm")
  y += 6

  // Dimensioning
  y = addSection(doc, y, "2. Dimensionamiento")
  const dim = results.dimensioning
  y = addRow(doc, y, "Ancho B:", dim.B.toFixed(2), "m")
  y = addRow(doc, y, "Largo L:", dim.L.toFixed(2), "m")
  y = addRow(doc, y, "Altura H:", dim.H.toFixed(2), "m")
  y = addRow(doc, y, "Altura util d:", (dim.d * 100).toFixed(1), "cm")
  y = addRow(doc, y, "Area zapata:", dim.Af.toFixed(2), "m2")
  y = addRow(doc, y, "sigma_neta:", dim.sigmaNet.toFixed(1), "kN/m2")
  y = addRow(doc, y, "sigma_sol:", dim.sigmaSol.toFixed(1), "kN/m2")
  y = addRow(doc, y, "Ratio:", `${(dim.ratio * 100).toFixed(1)}%`)
  y += 6

  // Verifications
  y = addSection(doc, y, "3. Verificaciones")
  y = addVerificationRow(doc, y, "Corte X (viga ancha):", results.shearX.ratio, results.shearX.pass, results.shearX.reference)
  y = addVerificationRow(doc, y, "Corte Y (viga ancha):", results.shearY.ratio, results.shearY.pass, results.shearY.reference)
  y = addVerificationRow(doc, y, "Punzonado:", results.punching.ratio, results.punching.pass, results.punching.reference)
  y += 4
  y = addRow(doc, y, "Perimetro critico bo:", results.punching.bo.toFixed(3), "m")
  y = addRow(doc, y, "Vc1 (eq 11-35):", results.punching.Vc1.toFixed(1), "kN")
  y = addRow(doc, y, "Vc2 (eq 11-36):", results.punching.Vc2.toFixed(1), "kN")
  y = addRow(doc, y, "Vc3 (eq 11-37):", results.punching.Vc3.toFixed(1), "kN")
  y = addRow(doc, y, "Vc gobernante:", results.punching.VcGov.toFixed(1), "kN")
  y = addRow(doc, y, "Comb. gobernante:", results.governingCombination)
  y += 6

  // Reinforcement
  y = addSection(doc, y, "4. Armaduras")
  const fx = results.flexureX
  const fy = results.flexureY
  y = addRow(doc, y, "Mu_x:", fx.Mu.toFixed(1), "kN.m")
  y = addRow(doc, y, "As_req_x:", fx.AsReq.toFixed(2), "cm2")
  y = addRow(doc, y, "As_min_x:", fx.AsMin.toFixed(2), "cm2")
  y = addRow(doc, y, "Armadura X:", `${fx.bars.count} ${fx.bars.diameter}mm c/${fx.bars.spacing.toFixed(0)} cm`, `(${fx.bars.totalArea.toFixed(2)} cm2)`)
  y += 3
  y = addRow(doc, y, "Mu_y:", fy.Mu.toFixed(1), "kN.m")
  y = addRow(doc, y, "As_req_y:", fy.AsReq.toFixed(2), "cm2")
  y = addRow(doc, y, "As_min_y:", fy.AsMin.toFixed(2), "cm2")
  y = addRow(doc, y, "Armadura Y:", `${fy.bars.count} ${fy.bars.diameter}mm c/${fy.bars.spacing.toFixed(0)} cm`, `(${fy.bars.totalArea.toFixed(2)} cm2)`)

  return doc
}

export function generateM2Pdf(input: M2Input, results: M2Results): jsPDF {
  const doc = new jsPDF()
  let page = 1

  let y = addHeader(doc, `Memoria de Calculo: ${input.projectName}`, page)
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text("Modulo M2 - Base Centrada con Momento", MARGIN, y)
  y += 5
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, MARGIN, y)
  y += 5
  doc.text("Norma: CIRSOC 201-05 / CIRSOC 601-102", MARGIN, y)
  y += 12

  // Input
  y = addSection(doc, y, "1. Datos de Entrada")
  y = addRow(doc, y, "Columna:", `${input.column.width} x ${input.column.depth}`, "cm")
  y = addRow(doc, y, "N (servicio):", input.loads.N.toFixed(1), "kN")
  y = addRow(doc, y, "Mx (servicio):", (input.loads.Mx ?? 0).toFixed(1), "kN.m")
  y = addRow(doc, y, "sigma_adm:", input.soil.sigmaAdm.toFixed(1), "kN/m2")
  y = addRow(doc, y, "Df:", input.soil.Df.toFixed(2), "m")
  y += 6

  // Pressure
  y = addSection(doc, y, "2. Presiones (ELS)")
  const p = results.pressureELS
  y = addRow(doc, y, "Tipo:", p.type)
  y = addRow(doc, y, "sigma_max:", p.sigmaMax.toFixed(1), "kN/m2")
  y = addRow(doc, y, "sigma_min:", p.sigmaMin.toFixed(1), "kN/m2")
  y = addRow(doc, y, "Excentricidad:", p.eccentricity.toFixed(3), "m")
  y = addRow(doc, y, "Limite nucleo:", p.kernelLimit.toFixed(3), "m")
  y = addRow(doc, y, "Comb. ELS gob.:", results.elsCombiGov)
  y += 6

  // Stability
  y = addSection(doc, y, "3. Estabilidad")
  for (const s of results.stability) {
    y = addVerificationRow(doc, y, `${s.type} (FS=${s.FS.toFixed(2)} >= ${s.FSmin.toFixed(2)}):`, s.FS / (s.FSmin * 2), s.pass, s.reference)
  }
  y += 6

  // Verifications
  y = addSection(doc, y, "4. Verificaciones (ELU)")
  y = addVerificationRow(doc, y, "Corte X:", results.shearX.ratio, results.shearX.pass, results.shearX.reference)
  y = addVerificationRow(doc, y, "Corte Y:", results.shearY.ratio, results.shearY.pass, results.shearY.reference)
  y = addVerificationRow(doc, y, "Punzonado + momento:", results.punching.ratio, results.punching.pass, results.punching.reference)
  y += 4
  y = addRow(doc, y, "gamma_v:", results.punching.gamma_v.toFixed(3))
  y = addRow(doc, y, "Jc:", results.punching.Jc.toFixed(0), "cm4")
  y = addRow(doc, y, "vu_max:", results.punching.vu_max.toFixed(3), "MPa")
  y += 6

  // Reinforcement
  y = addSection(doc, y, "5. Armaduras")
  const fx = results.flexureX
  const fyR = results.flexureY
  y = addRow(doc, y, "Arm. inf. X:", `${fx.bars.count} ${fx.bars.diameter}mm c/${fx.bars.spacing.toFixed(0)} cm`, `(${fx.bars.totalArea.toFixed(2)} cm2)`)
  y = addRow(doc, y, "Arm. inf. Y:", `${fyR.bars.count} ${fyR.bars.diameter}mm c/${fyR.bars.spacing.toFixed(0)} cm`, `(${fyR.bars.totalArea.toFixed(2)} cm2)`)
  if (results.flexureSuperior) {
    const fs = results.flexureSuperior
    y += 3
    y = addRow(doc, y, "Arm. sup.:", `${fs.bars.count} ${fs.bars.diameter}mm c/${fs.bars.spacing.toFixed(0)} cm`, `(${fs.bars.totalArea.toFixed(2)} cm2)`)
  }

  return doc
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(`${filename}.pdf`)
}
