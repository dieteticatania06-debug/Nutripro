'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useClientDashboardStore } from '@/features/dashboard/store/dashboardStore'
import type { Diet, Profile } from '@nutripro/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { formatDate, parseDietContent, getDietAverageCalories } from '@/lib/utils'
import { Utensils, Download, Calendar, Flame, Activity, ShoppingCart, CheckSquare, Square, Copy, Check, Eye } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import {
  DietTableReadOnly,
  DAYS,
  MEALS
} from '@/components/diets/DietTableReadOnly'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DietasPage() {
  const { activeDiet: storeActiveDiet, allDiets: storeAllDiets, profile: storeProfile, isLoaded } = useClientDashboardStore()
  const [activeDiet, setActiveDiet] = useState<Diet | null>(null)
  const [history, setHistory]       = useState<Diet[]>([])
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [isLoading, setIsLoading]   = useState(!isLoaded)
  const [isGroceryOpen, setIsGroceryOpen] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [selectedDietForView, setSelectedDietForView] = useState<Diet | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isLoaded) {
      setActiveDiet(storeActiveDiet)
      setHistory(storeAllDiets.filter((d) => d.status === 'archived'))
      setProfile(storeProfile)
      setIsLoading(false)
    }
  }, [isLoaded, storeActiveDiet, storeAllDiets, storeProfile])

  const downloadPDF = async (diet: Diet) => {
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Page dimensions
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 12 // compact margin to gain space

      // Paint whole page background with warm green/cream gradient matching the website
      for (let i = 0; i < pageHeight; i++) {
        const ratio = i / pageHeight
        // Soft gradient from sage green rgb(208, 226, 214) to light cream rgb(246, 244, 239)
        const r = Math.round(208 + ratio * 38)
        const g = Math.round(226 + ratio * 18)
        const b = Math.round(214 + ratio * 25)
        doc.setFillColor(r, g, b)
        doc.rect(0, i, pageWidth, 1, 'F')
      }

      // Helper to set opacity safely without using saveState/restoreState
      const setOpacity = (opacity: number) => {
        try {
          if ((doc as any).GState) {
            const gState = new (doc as any).GState({ opacity })
            doc.setGState(gState)
          }
        } catch (e) {
          console.warn('setOpacity not supported', e)
        }
      }

      // Brand Colors matching site theme
      const primaryColor: [number, number, number] = [58, 135, 90] // #3A875A (Brand Green)
      const logoColor: [number, number, number] = [107, 34, 69] // #6B2245 (Burgundy/Borgoña)
      const textColorDark: [number, number, number] = [45, 30, 27] // #2D1E1B (Brand Charcoal)
      const textColorMuted: [number, number, number] = [120, 110, 105] // Muted gray
      const borderColor: [number, number, number] = [243, 220, 201] // warm cream/orange border (rgb matching border-orange-200/60)
      const creamHeaderColor: [number, number, number] = [250, 243, 236] // #FAF3EC
      const alternateRowBg: [number, number, number] = [252, 250, 248] // #FCFAF8

      // ─── Header drawing ───
      // Decorative top bar in primary green
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.rect(0, 0, pageWidth, 4, 'F')

      // App Logo
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(logoColor[0], logoColor[1], logoColor[2])
      doc.text('NutriPro', margin, 12)

      // Document Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2])
      doc.text(diet.title, margin, 19)

      // Date alignment (top right)
      const dateText = `Pauta del: ${formatDate(diet.assignedAt)}`
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(textColorMuted[0], textColorMuted[1], textColorMuted[2])
      const dateWidth = doc.getTextWidth(dateText)
      doc.text(dateText, pageWidth - margin - dateWidth, 12)

      // Calories target alignment (below date)
      if (diet.totalCalories) {
        const calText = `Calorías diarias: ${diet.totalCalories} kcal`
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        const calWidth = doc.getTextWidth(calText)
        doc.text(calText, pageWidth - margin - calWidth, 18.5)
      }

      // Horizontal separation line
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
      doc.setLineWidth(0.4)
      doc.line(margin, 23, pageWidth - margin, 23)

      const parsed = parseDietContent(diet.content)

      if (parsed) {
        const headers = ['Día / Totales', ...MEALS.map((m) => m.label)]
        // Provide blank structure for cells that we draw manually in didDrawCell
        const body = DAYS.map((d) => [
          '', // Drawn manually in didDrawCell to control formatting, borders, and rounded macro cards
          ...MEALS.map((m) => {
            if (parsed.version === 2) {
              return parsed.weeklyPlan[d.key]?.meals?.[m.key]?.text || '—'
            }
            return (parsed.weeklyPlan[d.key] as any)?.[m.key] || '—'
          }),
        ])

        autoTable(doc, {
          startY: 27,
          margin: { top: 27, right: margin, bottom: 8, left: margin },
          head: [headers],
          body: body,
          theme: 'grid',
          styles: {
            font: 'helvetica',
            fontSize: 7.5,
            cellPadding: 2.2,
            textColor: textColorDark,
            lineColor: borderColor,
            lineWidth: 0.1,
            valign: 'middle',
            minCellHeight: 20, // Ensure custom Day totals cards fit nicely without clipping
          },
          headStyles: {
            textColor: textColorDark,
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'center',
          },
          columnStyles: {
            0: {
              cellWidth: 28,
            },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 'auto' },
          },
          alternateRowStyles: {},
          pageBreak: 'avoid',
          willDrawCell: (data) => {
            const cell = data.cell
            const isHeader = data.section === 'head'

            // Implement translucent glassmorphic look for cells matching web opacity
            if (isHeader) {
              setOpacity(0.85)
              doc.setFillColor(creamHeaderColor[0], creamHeaderColor[1], creamHeaderColor[2])
              doc.rect(cell.x, cell.y, cell.width, cell.height, 'F')
              setOpacity(1.0)
              cell.styles.fillColor = false // disable default solid background fill
            } else if (data.column.index === 0) {
              setOpacity(0.4)
              doc.setFillColor(creamHeaderColor[0], creamHeaderColor[1], creamHeaderColor[2])
              doc.rect(cell.x, cell.y, cell.width, cell.height, 'F')
              setOpacity(1.0)
              cell.styles.fillColor = false
              
              // Clear text for custom drawing in didDrawCell
              cell.text = []
            } else {
              const bgCol = data.row.index % 2 === 0 ? [255, 255, 255] : alternateRowBg
              setOpacity(0.55)
              doc.setFillColor(bgCol[0], bgCol[1], bgCol[2])
              doc.rect(cell.x, cell.y, cell.width, cell.height, 'F')
              setOpacity(1.0)
              cell.styles.fillColor = false
            }
          },
          didDrawCell: (data) => {
            const cell = data.cell
            const isHeader = data.section === 'head'

            if (!isHeader && data.column.index === 0) {
              const dayName = DAYS[data.row.index].label

              // Draw Day Name (bold charcoal)
              doc.setFont('helvetica', 'bold')
              doc.setFontSize(8)
              doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2])
              doc.text(dayName, cell.x + 3.5, cell.y + 4.5)

              if (parsed.version === 2) {
                const totals = parsed.weeklyPlan[DAYS[data.row.index].key]?.dayTotals
                if (totals && (totals.calories > 0 || totals.protein > 0)) {
                  const boxX = cell.x + 2.5
                  const boxY = cell.y + 6.2
                  const boxW = cell.width - 5
                  const boxH = cell.height - 8.5

                  // Draw totals sub-card background translucent
                  setOpacity(0.85)
                  doc.setFillColor(253, 242, 232) // Warm soft orange background
                  doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'F')
                  setOpacity(1.0)

                  // Draw totals sub-card border
                  doc.setDrawColor(248, 225, 205)
                  doc.setLineWidth(0.1)
                  doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'S')

                  // Draw Calories target in bold green
                  doc.setFont('helvetica', 'bold')
                  doc.setFontSize(7)
                  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
                  doc.text(`${totals.calories} kcal`, boxX + 2, boxY + 3.2)

                  // Draw macros in charcoal
                  doc.setFont('helvetica', 'normal')
                  doc.setFontSize(5.5)
                  doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2])
                  doc.text(`P: ${totals.protein}g | HC: ${totals.carbs}g`, boxX + 2, boxY + 6.0)
                  doc.text(`G: ${totals.fat}g`, boxX + 2, boxY + 8.2)
                }
              }
            }
          },
        })

        // Draw observations / notes
        if (parsed.notes) {
          const finalY = (doc as any).lastAutoTable.finalY || 27
          const maxNotesWidth = pageWidth - (margin * 2) - 8
          
          const footerMargin = 8
          const availableHeight = pageHeight - finalY - footerMargin - 4
          
          let notesFontSize = 7.5
          let notesPadding = 3
          let notesLines = doc.splitTextToSize(parsed.notes, maxNotesWidth)
          let notesHeight = (notesLines.length * 3.5) + (notesPadding * 2) + 6
          
          // Shrink box size if space is very tight to enforce single-page
          if (notesHeight > availableHeight && availableHeight > 12) {
            notesFontSize = 7.0
            notesPadding = 2
            notesLines = doc.splitTextToSize(parsed.notes, maxNotesWidth)
            notesHeight = (notesLines.length * 3.1) + (notesPadding * 2) + 5
          }
          
          const notesY = finalY + 4
          
          // Translucent background box matching website notes style
          setOpacity(0.55)
          doc.setFillColor(creamHeaderColor[0], creamHeaderColor[1], creamHeaderColor[2])
          doc.rect(margin, notesY, pageWidth - (margin * 2), notesHeight, 'F')
          setOpacity(1.0)
          
          // Green accent left bar
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
          doc.rect(margin, notesY, 1.2, notesHeight, 'F')

          // Notes header
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(notesFontSize + 0.5)
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
          doc.text('OBSERVACIONES DEL NUTRICIONISTA', margin + 4, notesY + notesPadding + 2)

          // Notes body text
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(notesFontSize)
          doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2])
          doc.text(notesLines, margin + 4, notesY + notesPadding + 6)
        }
      } else {
        // Legacy/Plain Text Fallback
        const contentY = 30
        const maxContentWidth = pageWidth - (margin * 2)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2])
        
        const textLines = doc.splitTextToSize(diet.content, maxContentWidth)
        doc.text(textLines, margin, contentY)
      }

      const sanitizeName = (str: string) => {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove accents
          .replace(/[^a-z0-9]/g, '-')     // replace spaces & special chars with hyphen
          .replace(/-+/g, '-')            // collapse multiple hyphens
          .replace(/^-|-$/g, '')          // trim hyphens
      }

      const nameSlug = profile
        ? sanitizeName(`${profile.firstName}_${profile.lastName || ''}`)
        : 'cliente'

      const dietDate = new Date(diet.assignedAt)
      const formattedDate = isNaN(dietDate.getTime())
        ? 'pauta'
        : dietDate.toISOString().split('T')[0]

      doc.save(`dieta-${nameSlug}-${formattedDate}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      toast({ title: 'Error al descargar PDF', variant: 'destructive' })
    }
  }

  const avgCalories = activeDiet ? getDietAverageCalories(activeDiet.content, activeDiet.totalCalories) : 0

  if (isLoading) {
    return <Loader label="Cargando dietas..." />
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Dietas</h1>
        <p className="text-muted-foreground">Tu plan nutricional personalizado e histórico de pautas</p>
      </div>

      {/* Active Diet Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-primary rounded-full" />
          Dieta Activa
        </h2>

        {activeDiet ? (
          <div className="space-y-5">
            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="shadow-sm border-l-4 border-l-primary bg-white/45 backdrop-blur-xl border border-white/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500/50" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Calorías (Media)</p>
                    <p className="text-base font-extrabold text-foreground">
                      {avgCalories > 0 ? `${avgCalories} kcal` : 'No pautado'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-blue-500 bg-white/45 backdrop-blur-xl border border-white/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Calendar className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inicio</p>
                    <p className="text-base font-extrabold text-foreground">{formatDate(activeDiet.assignedAt)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-white/45 backdrop-blur-xl border border-white/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estado</p>
                    <p className="text-base font-extrabold text-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Activo
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Diet Card */}
            <Card className="shadow-md border-white/40 overflow-hidden bg-white/45 backdrop-blur-xl">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold">{activeDiet.title}</CardTitle>
                  {activeDiet.description && (
                    <CardDescription className="text-xs">{activeDiet.description}</CardDescription>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setIsGroceryOpen(true)}
                    className="gap-2 shadow-sm bg-primary hover:bg-primary/90 text-white"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Lista de la Compra
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPDF(activeDiet)}
                    className="gap-2 shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <DietTableReadOnly diet={activeDiet} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed border-white/40 bg-white/30 backdrop-blur-xl">
            <CardContent className="text-center py-16 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Utensils className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Sin pauta dietética asignada</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Tu dietista preparará un plan nutricional adecuado para ti una vez revise tu cuestionario.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-muted-foreground/60 rounded-full" />
            Historial de Planes Nutricionales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((diet) => (
              <Card
                key={diet.id}
                onClick={() => setSelectedDietForView(diet)}
                className="shadow-sm opacity-80 hover:opacity-100 transition-all hover:shadow-md border border-white/30 bg-white/20 backdrop-blur-md cursor-pointer group"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 truncate">
                    <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{diet.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(diet.assignedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSelectedDietForView(diet)}
                      className="shrink-0 text-muted-foreground hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => downloadPDF(diet)}
                      className="shrink-0 text-muted-foreground hover:text-primary"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Grocery List Modal */}
      {mounted && isGroceryOpen && activeDiet && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl max-w-xl w-full rounded-[2rem] shadow-2xl border border-orange-100/60 overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-orange-100/40 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-extrabold text-lg text-[#2D1E1B]">Lista de la Compra</h3>
                  <p className="text-xs text-muted-foreground">Consolidada de tu pauta semanal</p>
                </div>
              </div>
              <button
                onClick={() => setIsGroceryOpen(false)}
                className="text-muted-foreground hover:text-primary transition-colors text-lg font-bold p-1"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              {extractIngredients(activeDiet.content).map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <h4 className="text-xs font-bold text-[#2D1E1B]/70 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    {cat.name}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {cat.items.map((item) => {
                      const isChecked = !!checkedItems[item]
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setCheckedItems((prev) => ({
                              ...prev,
                              [item]: !prev[item],
                            }))
                          }}
                          className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                            isChecked
                              ? 'bg-muted/30 border-muted text-muted-foreground/60 line-through'
                              : 'bg-white border-orange-100/40 text-foreground hover:bg-orange-50/30'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isChecked ? (
                              <CheckSquare className="h-4.5 w-4.5 text-primary" />
                            ) : (
                              <Square className="h-4.5 w-4.5 text-muted-foreground/40" />
                            )}
                          </div>
                          <span className="text-sm font-semibold leading-tight">{item}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-orange-100/40 flex items-center justify-between bg-gray-50/50">
              <button
                type="button"
                onClick={() => {
                  const ingredients = extractIngredients(activeDiet.content)
                  const text = ingredients
                    .map((cat) => {
                      const catItems = cat.items
                        .map((item) => {
                          const isChecked = checkedItems[item] ? '[x]' : '[ ]'
                          return `  ${isChecked} ${item}`
                        })
                        .join('\n')
                      return `* ${cat.name} ${cat.icon}:\n${catItems}`
                    })
                    .join('\n\n')

                  navigator.clipboard.writeText(text)
                  toast({
                    title: 'Lista copiada',
                    description: 'La lista de la compra se ha copiado al portapapeles.',
                  })
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? '¡Copiado!' : 'Copiar al portapapeles'}
              </button>
              <Button onClick={() => setIsGroceryOpen(false)} size="sm" className="rounded-full shadow-sm">
                Listo
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* View Diet Modal */}
      {mounted && selectedDietForView && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl max-w-4xl w-full rounded-[2rem] shadow-2xl border border-orange-100/60 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-orange-100/40 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Utensils className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-extrabold text-lg text-[#2D1E1B]">{selectedDietForView.title}</h3>
                  <p className="text-xs text-muted-foreground">Plan nutricional del {formatDate(selectedDietForView.assignedAt)} (Archivado)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadPDF(selectedDietForView)}
                  className="gap-2 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </Button>
                <button
                  onClick={() => setSelectedDietForView(null)}
                  className="text-muted-foreground hover:text-primary transition-colors text-lg font-bold p-1 ml-2"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-grow bg-muted/5">
              <DietTableReadOnly diet={selectedDietForView} />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-orange-100/40 flex justify-end bg-gray-50/50">
              <Button onClick={() => setSelectedDietForView(null)} size="sm" className="rounded-full shadow-sm">
                Cerrar
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}


function extractIngredients(rawContent: string): { name: string; icon: string; items: string[] }[] {
  const parsed = parseDietContent(rawContent)
  const textBlocks: string[] = []

  if (parsed) {
    if (parsed.version === 2) {
      for (const day of Object.values(parsed.weeklyPlan) as any) {
        if (day?.meals) {
          for (const meal of Object.values(day.meals) as any) {
            if (meal?.text) {
              textBlocks.push(meal.text)
            }
          }
        }
      }
    } else {
      for (const day of Object.values(parsed.weeklyPlan) as any) {
        for (const mealText of Object.values(day) as any) {
          if (typeof mealText === 'string') {
            textBlocks.push(mealText)
          }
        }
      }
    }
  } else {
    const lines = rawContent.split('\n')
    for (const line of lines) {
      const clean = line.trim()
      if (
        clean.startsWith('-') || 
        clean.startsWith('*') || 
        /^\d+\./.test(clean) || 
        /desayuno|media mañana|comida|merienda|cena/i.test(clean)
      ) {
        textBlocks.push(clean)
      }
    }
  }

  const rawItems: string[] = []
  for (const block of textBlocks) {
    const segments = block
      .split(/,|\n|;|\s+y\s+|\s+con\s+|\+/i)
      .map(s => s.trim())
      .filter(s => s.length > 2)
    rawItems.push(...segments)
  }

  const catalog = [
    {
      name: 'Carnes, Pescados y Huevos',
      icon: '🥩',
      mappings: [
        { keywords: [/pollo/i, /pechuga de pollo/i], value: 'Pechuga de pollo' },
        { keywords: [/pavo/i, /pechuga de pavo/i], value: 'Pechuga de pavo' },
        { keywords: [/ternera/i], value: 'Carne de ternera' },
        { keywords: [/lomo/i, /cerdo/i], value: 'Carne de cerdo / Lomo' },
        { keywords: [/atun/i, /atún/i], value: 'Atún al natural' },
        { keywords: [/salmon/i, /salmón/i], value: 'Salmón fresco' },
        { keywords: [/merluza/i, /bacalao/i, /lenguado/i], value: 'Pescado blanco (Merluza, Bacalao)' },
        { keywords: [/clara/i], value: 'Claras de huevo' },
        { keywords: [/huevo/i], value: 'Huevos enteros' },
        { keywords: [/jamon/i, /jamón/i], value: 'Jamón serrano o de york (bajo en grasa)' }
      ]
    },
    {
      name: 'Frutas y Verduras',
      icon: '🥦',
      mappings: [
        { keywords: [/espinaca/i], value: 'Espinacas frescas' },
        { keywords: [/tomate/i], value: 'Tomates' },
        { keywords: [/lechuga/i, /canónigos/i, /rucula/i, /rúcula/i], value: 'Lechuga / Hojas verdes' },
        { keywords: [/brocoli/i, /brócoli/i], value: 'Brócoli' },
        { keywords: [/calabacin/i, /calabacín/i], value: 'Calabacín' },
        { keywords: [/platano/i, /plátano/i], value: 'Plátanos' },
        { keywords: [/manzana/i], value: 'Manzanas' },
        { keywords: [/fresa/i, /arandano/i, /arándano/i, /frambuesa/i], value: 'Frutos rojos (Fresas, Arándanos)' },
        { keywords: [/pera/i], value: 'Peras' },
        { keywords: [/naranja/i, /mandarina/i], value: 'Naranjas / Mandarinas' },
        { keywords: [/aguacate/i], value: 'Aguacate' },
        { keywords: [/zanahoria/i], value: 'Zanahorias' },
        { keywords: [/cebolla/i], value: 'Cebolla' },
        { keywords: [/pimiento/i], value: 'Pimientos (rojo, verde)' },
        { keywords: [/esparrago/i, /espárrago/i], value: 'Espárragos trigueros' },
        { keywords: [/champi/i, /setas/i], value: 'Champiñones / Setas' },
        { keywords: [/judia/i, /judía/i], value: 'Judías verdes' },
        { keywords: [/fruta/i], value: 'Fruta variada' },
        { keywords: [/verdura/i], value: 'Verdura de temporada' }
      ]
    },
    {
      name: 'Lácteos y Proteínas',
      icon: '🥛',
      mappings: [
        { keywords: [/yogur/i, /yoghurt/i], value: 'Yogur (griego o natural sin azúcar)' },
        { keywords: [/leche/i], value: 'Leche (desnatada, semidesnatada o vegetal)' },
        { keywords: [/queso/i, /mozzarella/i], value: 'Queso fresco batido o Cottage' },
        { keywords: [/requeson/i, /requesón/i], value: 'Requesón' },
        { keywords: [/kefir/i, /kéfir/i], value: 'Kéfir' },
        { keywords: [/whey/i, /proteina/i, /proteína/i], value: 'Proteína de suero (Whey Protein)' },
        { keywords: [/tofu/i], value: 'Tofu' },
        { keywords: [/seitan/i, /seitán/i], value: 'Seitán' },
        { keywords: [/tempeh/i], value: 'Tempeh' },
        { keywords: [/soja texturizada/i], value: 'Soja texturizada' }
      ]
    },
    {
      name: 'Cereales, Tubérculos y Legumbres',
      icon: '🌾',
      mappings: [
        { keywords: [/arroz/i], value: 'Arroz (integral o basmati)' },
        { keywords: [/avena/i], value: 'Copos de avena' },
        { keywords: [/pan/i, /tostada/i], value: 'Pan integral / de centeno' },
        { keywords: [/patata/i], value: 'Patatas' },
        { keywords: [/boniato/i], value: 'Boniato' },
        { keywords: [/quinoa/i], value: 'Quinoa' },
        { keywords: [/pasta/i, /macarrones/i, /espagueti/i], value: 'Pasta integral' },
        { keywords: [/lenteja/i], value: 'Lentejas' },
        { keywords: [/garbanzo/i], value: 'Garbanzos' },
        { keywords: [/alubia/i, /judión/i, /frijol/i], value: 'Alubias / Legumbres' },
        { keywords: [/tortitas de arroz/i, /tortita/i], value: 'Tortitas de arroz o maíz' }
      ]
    },
    {
      name: 'Grasas y Frutos Secos',
      icon: '🥜',
      mappings: [
        { keywords: [/nuez/i, /nueces/i], value: 'Nueces' },
        { keywords: [/almendra/i], value: 'Almendras al natural' },
        { keywords: [/pistacho/i], value: 'Pistachos' },
        { keywords: [/cacahuete/i], value: 'Crema de cacahuete (100% natural)' },
        { keywords: [/aceite/i], value: 'Aceite de oliva virgen extra' },
        { keywords: [/chia/i, /chía/i], value: 'Semillas de chía' },
        { keywords: [/lino/i], value: 'Semillas de lino' }
      ]
    },
    {
      name: 'Otros e Infusiones',
      icon: '🧂',
      mappings: [
        { keywords: [/cafe/i, /café/i], value: 'Café solo o con leche' },
        { keywords: [/te/i, /té/i, /infusion/i, /infusión/i], value: 'Té / Infusiones variadas' },
        { keywords: [/granola/i], value: 'Granola (sin azúcar añadido)' },
        { keywords: [/sal/i], value: 'Sal' },
        { keywords: [/pimienta/i, /especias/i, /curry/i, /oregano/i, /orégano/i], value: 'Especias al gusto (Curry, Orégano, Pimienta)' }
      ]
    }
  ]

  const categorizedItems: Record<string, Set<string>> = {}
  for (const cat of catalog) {
    categorizedItems[cat.name] = new Set<string>()
  }
  const unmatched = new Set<string>()

  for (const item of rawItems) {
    let cleaned = item
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/^y\s+/i, '')
      .replace(/^o\s+/i, '')
      .replace(/^con\s+/i, '')
      .replace(/^-\s+/g, '')
      .replace(/^\*\s+/g, '')
      .replace(/^\d+\.\s+/g, '')
      .replace(/##.*/g, '')
      .trim()

    if (cleaned.length < 3) continue
    if (/plan alimentario|pautas:|distribución:|proteínas:|carbos:|grasas:/i.test(cleaned)) continue

    let matched = false
    for (const cat of catalog) {
      for (const mapping of cat.mappings) {
        if (mapping.keywords.some(kw => kw.test(cleaned))) {
          categorizedItems[cat.name].add(mapping.value)
          matched = true
          break
        }
      }
      if (matched) break
    }

    if (!matched) {
      let cleanItem = cleaned
        .replace(/\b\d+\s*(g|ml|l|kg|unidades|cucharadas|cucharaditas|tazas|rebanadas|tortitas|scoops?|un|una|g\b|ml\b)\b/gi, '')
        .replace(/^(de|del|y|con|a|en|para|un|una|unos|unas|al)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (cleanItem.length > 2) {
        cleanItem = cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1)
        unmatched.add(cleanItem)
      }
    }
  }

  const result = catalog
    .map(c => ({
      name: c.name,
      icon: c.icon,
      items: Array.from(categorizedItems[c.name])
    }))
    .filter(c => c.items.length > 0)

  if (unmatched.size > 0) {
    result.push({
      name: 'Otros alimentos',
      icon: '🛒',
      items: Array.from(unmatched)
    })
  }

  return result
}


