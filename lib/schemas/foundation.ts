import { z } from "zod"

// ─── Common Schemas ──────────────────────────────────────────────────
export const columnSchema = z.object({
  width: z.coerce.number().min(15, "Min 15 cm").max(200, "Max 200 cm"),
  depth: z.coerce.number().min(15, "Min 15 cm").max(200, "Max 200 cm"),
  shape: z.enum(["rectangular", "circular"]),
})

export const loadsServiceSchema = z.object({
  N: z.coerce.number().min(1, "Carga axial requerida"),
  Mx: z.coerce.number().optional(),
  My: z.coerce.number().optional(),
  Vx: z.coerce.number().optional(),
  Vy: z.coerce.number().optional(),
})

export const loadComponentsSchema = z.object({
  D: z.coerce.number().min(0, "Carga permanente requerida"),
  L: z.coerce.number().min(0),
  Lr: z.coerce.number().optional(),
  W: z.coerce.number().optional(),
  E: z.coerce.number().optional(),
  S: z.coerce.number().optional(),
  R: z.coerce.number().optional(),
  H: z.coerce.number().optional(),
  MD: z.coerce.number().optional(),
  ML: z.coerce.number().optional(),
  MW: z.coerce.number().optional(),
  ME: z.coerce.number().optional(),
})

export const soilSchema = z.object({
  sigmaAdm: z.coerce.number().min(10, "Min 10 kN/m2").max(2000, "Max 2000 kN/m2"),
  gamma_s: z.coerce.number().min(10, "Min 10 kN/m3").max(30, "Max 30 kN/m3"),
  Df: z.coerce.number().min(0.3, "Min 0.3 m").max(10, "Max 10 m"),
  waterTable: z.coerce.number().optional(),
})

export const materialSchema = z.object({
  concreteGrade: z.string().min(1, "Seleccione hormigon"),
  steelGrade: z.string().min(1, "Seleccione acero"),
  cover: z.coerce.number().min(40, "Min 40 mm").max(100, "Max 100 mm"),
})

// ─── M1 Schema ───────────────────────────────────────────────────────
export const m1InputSchema = z.object({
  projectName: z.string().min(1, "Nombre requerido").max(100),
  column: columnSchema,
  loads: loadsServiceSchema,
  loadComponents: loadComponentsSchema.optional(),
  soil: soilSchema,
  materials: materialSchema,
  footingWidth: z.coerce.number().min(0.3).max(10).optional(),
  footingDepth: z.coerce.number().min(0.3).max(10).optional(),
  footingHeight: z.coerce.number().min(0.2).max(3).optional(),
})

// ─── M2 Schema ───────────────────────────────────────────────────────
export const m2InputSchema = z.object({
  projectName: z.string().min(1, "Nombre requerido").max(100),
  column: columnSchema,
  loads: loadsServiceSchema.extend({
    Mx: z.coerce.number().min(0.01, "Momento requerido para M2"),
  }),
  loadComponents: loadComponentsSchema,
  soil: soilSchema,
  materials: materialSchema,
  momentDirection: z.enum(["x", "y", "biaxial"]),
  footingWidth: z.coerce.number().min(0.3).max(10).optional(),
  footingDepth: z.coerce.number().min(0.3).max(10).optional(),
  footingHeight: z.coerce.number().min(0.2).max(3).optional(),
})

// ─── M3: Base con Viga Central ────────────────────────────────────────
export const m3InputSchema = z.object({
  projectName: z.string().min(1).max(100),
  column: columnSchema,
  loads: loadsServiceSchema,
  loadComponents: loadComponentsSchema.optional(),
  soil: soilSchema,
  materials: materialSchema,
  beamWidth: z.coerce.number().min(20, "Min 20 cm").max(100),
  beamHeight: z.coerce.number().min(30, "Min 30 cm").max(200),
  cantileverLength: z.coerce.number().min(0.3).max(5),
})

// ─── M4: Base Excentrica con Tensor ───────────────────────────────────
export const m4InputSchema = z.object({
  projectName: z.string().min(1).max(100),
  column: columnSchema,
  columnInterior: columnSchema,
  loads: loadsServiceSchema,
  loadsInterior: loadsServiceSchema,
  soil: soilSchema,
  materials: materialSchema,
  distanceBetweenColumns: z.coerce.number().min(1).max(20),
  edgeDistance: z.coerce.number().min(0).max(2),
})

// ─── M5: Viga de Equilibrio ────────────────────────────────────────
export const m5InputSchema = z.object({
  projectName: z.string().min(1).max(100),
  columnMedianera: columnSchema,
  columnInterior: columnSchema,
  loadsMedianera: loadsServiceSchema,
  loadsInterior: loadsServiceSchema,
  soil: soilSchema,
  materials: materialSchema,
  distanceBetweenColumns: z.coerce.number().min(2).max(20),
  edgeDistance: z.coerce.number().min(0).max(1),
})

// ─── M6: Base Unificada ────────────────────────────────────────────
export const m6InputSchema = z.object({
  projectName: z.string().min(1).max(100),
  column1: columnSchema,
  column2: columnSchema,
  loads1: loadsServiceSchema,
  loads2: loadsServiceSchema,
  soil: soilSchema,
  materials: materialSchema,
  distanceBetweenColumns: z.coerce.number().min(1).max(15),
  footingShape: z.enum(["rectangular", "trapezoidal"]),
})

// ─── M7: Pilotes ────────────────────────────────────────────────────
export const pileLayerSchema = z.object({
  depth: z.coerce.number().min(0),
  soilType: z.string(),
  Nspt: z.coerce.number().min(0),
  cu: z.coerce.number().optional(),
  phi: z.coerce.number().optional(),
  gamma: z.coerce.number().min(10).max(30),
})

export const m7InputSchema = z.object({
  projectName: z.string().min(1).max(100),
  column: columnSchema,
  loads: loadsServiceSchema,
  materials: materialSchema,
  pileDiameter: z.coerce.number().min(20).max(200),
  pileLength: z.coerce.number().min(3).max(60),
  numberOfPiles: z.coerce.number().int().min(2).max(6),
  soilProfile: z.array(pileLayerSchema).min(1),
})

// ─── M8: Resistencia Lateral Broms ───────────────────────────────────
export const m8InputSchema = z.object({
  projectName: z.string().min(1).max(100),
  pileDiameter: z.coerce.number().min(20).max(200),
  pileLength: z.coerce.number().min(3).max(30),
  soilType: z.enum(["granular", "cohesive"]),
  cu: z.coerce.number().optional(),
  phi: z.coerce.number().optional(),
  gamma: z.coerce.number().min(10).max(30),
  lateralLoad: z.coerce.number().min(0.1),
  headCondition: z.enum(["free", "fixed"]),
  materials: materialSchema,
})

// ─── Project Schema ──────────────────────────────────────────────────
export const projectSaveSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  description: z.string().max(500).optional(),
  moduleType: z.string().min(1),
  inputData: z.record(z.unknown()),
  results: z.record(z.unknown()).optional(),
})

export type M1InputSchema = z.infer<typeof m1InputSchema>
export type M2InputSchema = z.infer<typeof m2InputSchema>
export type ProjectSaveSchema = z.infer<typeof projectSaveSchema>
