'use client'

import { useState } from 'react'
import type { Diet } from '@nutripro/shared'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { parseDietContent, cleanMealText, type DietContent, type DietContentV2, type DayKey, type MealKey } from '@/lib/utils'

export const DAYS = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',  label: 'Martes' },
  { key: 'wednesday',label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday',   label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday',   label: 'Domingo' },
] as const

export const MEALS = [
  { key: 'breakfast',   label: 'Desayuno',       color: 'from-orange-500/20 to-amber-500/5' },
  { key: 'mid_morning', label: 'Media Mañana',    color: 'from-yellow-500/20 to-yellow-500/5' },
  { key: 'lunch',       label: 'Comida',          color: 'from-emerald-500/20 to-green-500/5' },
  { key: 'snack',       label: 'Merienda',        color: 'from-sky-500/20 to-blue-500/5' },
  { key: 'dinner',      label: 'Cena',            color: 'from-purple-500/20 to-violet-500/5' },
] as const

const MEAL_STYLES = {
  breakfast: {
    border: 'border-l-orange-500',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
  },
  mid_morning: {
    border: 'border-l-amber-500',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  lunch: {
    border: 'border-l-emerald-500',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  snack: {
    border: 'border-l-sky-500',
    text: 'text-sky-700',
    dot: 'bg-sky-500',
  },
  dinner: {
    border: 'border-l-purple-500',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
  },
} as const


function DietTable({ content }: { content: DietContent | DietContentV2 }) {
  if (content.version === 2) {
    return (
      <div className="w-full rounded-2xl border border-orange-200/60 shadow-xl shadow-orange-950/[0.01] bg-white">
        <table className="w-full text-xs border-separate border-spacing-0 table-fixed">
          <thead>
            <tr className="bg-[#FAF3EC] text-foreground/80">
              <th className="p-3 text-left font-bold uppercase tracking-wider w-[16%] rounded-tl-2xl border-b border-orange-200/60">
                Día / Totales
              </th>
              {MEALS.map((m, idx) => (
                <th
                  key={m.key}
                  className={`p-3 text-center font-bold uppercase tracking-wider border-l border-b border-orange-200/60 w-[16.8%] ${
                    idx === MEALS.length - 1 ? 'rounded-tr-2xl' : ''
                  }`}
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d, i) => {
              const dayData = content.weeklyPlan[d.key]
              const totals = dayData?.dayTotals
              const isLastRow = i === DAYS.length - 1
              return (
                <tr key={d.key} className={i % 2 === 0 ? 'bg-white' : 'bg-primary/[0.01]'}>
                  <td className={`p-3 border-orange-200/50 bg-[#FAF3EC]/30 align-top ${
                    isLastRow ? 'rounded-bl-2xl' : 'border-b'
                  }`}>
                    <div className="font-bold text-[#2D1E1B] mb-2">{d.label}</div>
                    {totals && (totals.calories > 0 || totals.protein > 0) && (
                      <div className="space-y-1 p-1.5 rounded-xl bg-orange-100/40 border border-orange-200/60 text-[11px] text-[#2D1E1B] leading-tight">
                        <div className="font-extrabold text-primary text-xs whitespace-nowrap">{totals.calories} kcal</div>
                        <div className="grid grid-cols-1 font-mono text-[10px] text-muted-foreground mt-1 whitespace-nowrap">
                          <div>P: <span className="font-sans font-medium text-[#2D1E1B]">{totals.protein}g</span></div>
                          <div>HC: <span className="font-sans font-medium text-[#2D1E1B]">{totals.carbs}g</span></div>
                          <div>G: <span className="font-sans font-medium text-[#2D1E1B]">{totals.fat}g</span></div>
                        </div>
                      </div>
                    )}
                  </td>
                  {MEALS.map((m, index) => {
                    const meal = dayData?.meals?.[m.key]
                    const text = meal?.text ?? ''
                    const macros = meal?.macros
                    const isLastCell = index === MEALS.length - 1
                    return (
                      <td
                        key={m.key}
                        className={`p-3 border-l border-orange-200/50 align-top text-[13px] font-medium text-[#2D1E1B]/90 leading-relaxed relative group break-words ${
                          isLastRow && isLastCell ? 'rounded-br-2xl' : ''
                        } ${
                          !isLastRow ? 'border-b' : ''
                        }`}
                      >
                        {text ? (
                          <>
                            <span className="whitespace-pre-line">{cleanMealText(text)}</span>
                            {macros && (macros.calories > 0 || macros.protein > 0) && (
                              <div className={`hidden group-hover:block absolute z-50 bg-[#FAF3EC]/95 backdrop-blur-md text-foreground rounded-2xl p-3.5 shadow-2xl text-xs space-y-2 w-44 -top-2 border border-orange-200/50 animate-in fade-in duration-100 pointer-events-none ${
                                index >= 3 ? 'right-[102%] left-auto' : 'left-[85%] right-auto'
                              }`}>
                                <div className="font-bold text-primary border-b border-orange-100/40 pb-1 mb-1 text-[13px]">
                                  Macros Comida
                                </div>
                                <div className="font-extrabold text-[#2D1E1B] text-sm">{macros.calories} kcal</div>
                                <div className="grid grid-cols-1 gap-1 text-[11px] font-medium text-foreground/80">
                                  <div className="flex justify-between"><span>Proteínas:</span> <span className="text-[#2D1E1B] font-bold">{macros.protein}g</span></div>
                                  <div className="flex justify-between"><span>Carbohidratos:</span> <span className="text-[#2D1E1B] font-bold">{macros.carbs}g</span></div>
                                  <div className="flex justify-between"><span>Grasas:</span> <span className="text-[#2D1E1B] font-bold">{macros.fat}g</span></div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-foreground/20 italic text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Version 1
  return (
    <div className="w-full rounded-2xl border border-orange-200/60 shadow-xl shadow-orange-950/[0.01] bg-white">
      <table className="w-full text-xs border-separate border-spacing-0 table-fixed">
        <thead>
          <tr className="bg-[#FAF3EC] text-foreground/80">
            <th className="p-3 text-left font-bold uppercase tracking-wider w-[16%] rounded-tl-2xl border-b border-orange-200/60">
              Día
            </th>
            {MEALS.map((m, idx) => (
              <th
                key={m.key}
                className={`p-3 text-center font-bold uppercase tracking-wider border-l border-b border-orange-200/60 w-[16.8%] ${
                  idx === MEALS.length - 1 ? 'rounded-tr-2xl' : ''
                }`}
              >
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d, i) => {
            const isLastRow = i === DAYS.length - 1
            return (
              <tr key={d.key} className={i % 2 === 0 ? 'bg-white' : 'bg-primary/[0.01]'}>
                <td className={`p-3 font-bold text-foreground border-orange-200/50 bg-[#FAF3EC]/30 align-top ${
                  isLastRow ? 'rounded-bl-2xl' : 'border-b'
                }`}>
                  {d.label}
                </td>
                {MEALS.map((m, idx) => {
                  const cell = content.weeklyPlan[d.key]?.[m.key]
                  const isLastCell = idx === MEALS.length - 1
                  return (
                    <td
                      key={m.key}
                      className={`p-3 border-l border-orange-200/50 align-top text-[13px] font-medium text-[#2D1E1B]/90 leading-relaxed break-words ${
                        isLastRow && isLastCell ? 'rounded-br-2xl' : ''
                      } ${
                        !isLastRow ? 'border-b' : ''
                      }`}
                    >
                      {cell ? (
                        <span className="whitespace-pre-line">{cell}</span>
                      ) : (
                        <span className="text-foreground/20 italic text-xs">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DietAccordion({ content }: { content: DietContent | DietContentV2 }) {
  const [openDay, setOpenDay] = useState<DayKey | null>('monday')

  if (content.version === 2) {
    return (
      <div className="space-y-2">
        {DAYS.map((d) => {
          const isOpen = openDay === d.key
          const dayData = content.weeklyPlan[d.key]
          const hasMeals = dayData?.meals && MEALS.some((m) => dayData.meals[m.key]?.text)
          const totals = dayData?.dayTotals

          return (
            <div key={d.key} className="rounded-xl border border-orange-100/60 overflow-hidden bg-white/80">
              <button
                type="button"
                onClick={() => setOpenDay(isOpen ? null : d.key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF3EC]/40 hover:bg-[#FAF3EC]/60 transition-colors text-left"
              >
                <div className="space-y-1">
                  <span className="font-bold text-sm text-[#2D1E1B]">{d.label}</span>
                  {totals && (totals.calories > 0 || totals.protein > 0) && (
                    <div className="text-[10px] text-muted-foreground flex gap-2 font-mono">
                      <span className="text-primary font-bold">{totals.calories} kcal</span>
                      <span>•</span>
                      <span>P: {totals.protein}g</span>
                      <span>HC: {totals.carbs}g</span>
                      <span>G: {totals.fat}g</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!hasMeals && (
                    <span className="text-xs text-muted-foreground italic">Sin especificar</span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="bg-[#FAF3EC]/10 px-4 py-4 space-y-4">
                  {MEALS.map((m) => {
                    const meal = dayData?.meals?.[m.key]
                    const text = meal?.text ?? ''
                    const macros = meal?.macros
                    const styles = MEAL_STYLES[m.key]

                    return (
                      <div
                        key={m.key}
                        className={`bg-white rounded-xl border border-orange-100/50 shadow-sm border-l-4 ${styles.border} p-3.5 transition-all duration-200 hover:shadow-md`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-dashed border-orange-100/30">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                            <span className={`text-xs font-extrabold uppercase tracking-wider ${styles.text}`}>
                              {m.label}
                            </span>
                          </div>
                          {macros && (macros.calories > 0 || macros.protein > 0) && (
                            <span className="text-[10px] font-semibold font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full text-slate-600 flex items-center gap-1.5">
                              <span className="text-primary font-bold">{macros.calories} kcal</span>
                              <span className="text-slate-300">|</span>
                              <span>P:{macros.protein}g</span>
                              <span>HC:{macros.carbs}g</span>
                              <span>G:{macros.fat}g</span>
                            </span>
                          )}
                        </div>
                        {text ? (
                          <p className="text-sm text-[#2D1E1B]/90 leading-relaxed whitespace-pre-line font-medium pl-1">
                            {cleanMealText(text)}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground/40 italic pl-1">No especificado</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {DAYS.map((d) => {
        const isOpen = openDay === d.key
        const dayData = content.weeklyPlan[d.key]
        const hasMeals = dayData && MEALS.some((m) => dayData[m.key])

        return (
          <div key={d.key} className="rounded-xl border border-orange-100/60 overflow-hidden bg-white/80">
            <button
              type="button"
              onClick={() => setOpenDay(isOpen ? null : d.key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF3EC]/40 hover:bg-[#FAF3EC]/60 transition-colors"
            >
              <span className="font-bold text-sm text-[#2D1E1B]">{d.label}</span>
              <div className="flex items-center gap-2">
                {!hasMeals && (
                  <span className="text-xs text-muted-foreground italic">Sin especificar</span>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {isOpen && (
              <div className="bg-[#FAF3EC]/10 px-4 py-4 space-y-4">
                {MEALS.map((m) => {
                  const cell = dayData?.[m.key]
                  const styles = MEAL_STYLES[m.key]
                  return (
                    <div
                      key={m.key}
                      className={`bg-white rounded-xl border border-orange-100/50 shadow-sm border-l-4 ${styles.border} p-3.5 transition-all duration-200 hover:shadow-md`}
                    >
                      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-dashed border-orange-100/30">
                        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                        <span className={`text-xs font-extrabold uppercase tracking-wider ${styles.text}`}>
                          {m.label}
                        </span>
                      </div>
                      {cell ? (
                        <p className="text-sm text-[#2D1E1B]/90 leading-relaxed whitespace-pre-line font-medium pl-1">
                          {cell}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground/40 italic pl-1">No especificado</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function DietTableReadOnly({ diet }: { diet: Diet }) {
  const content = parseDietContent(diet.content)
  if (!content) {
    return (
      <div className="p-5 rounded-xl border border-orange-100 bg-[#FAF3EC]/10 leading-relaxed text-sm text-foreground/90 whitespace-pre-line shadow-inner">
        {diet.content}
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Desktop table */}
      <div className="hidden md:block">
        <DietTable content={content} />
      </div>
      {/* Mobile accordion */}
      <div className="md:hidden">
        <DietAccordion content={content} />
      </div>
      {content.notes && (
        <div className="px-4 py-3 rounded-xl bg-[#FAF3EC]/20 border border-orange-100/40">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Observaciones del nutricionista
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">{content.notes}</p>
        </div>
      )}
    </div>
  )
}
