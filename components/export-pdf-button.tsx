"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { M1Input, M1Results, M2Input, M2Results } from "@/lib/types/foundation"
import { generateM1Pdf, generateM2Pdf, downloadPdf } from "@/lib/utils/pdf-export"

interface ExportPdfButtonProps {
  module: "m1" | "m2"
  input: M1Input | M2Input
  results: M1Results | M2Results
  projectName: string
}

export function ExportPdfButton({ module, input, results, projectName }: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const doc =
        module === "m1"
          ? generateM1Pdf(input as M1Input, results as M1Results)
          : generateM2Pdf(input as M2Input, results as M2Results)

      const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50)
      downloadPdf(doc, `CalcFund_${module.toUpperCase()}_${safeName}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline" size="sm" className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      Exportar PDF
    </Button>
  )
}
