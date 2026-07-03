'use client'

import { useEffect, useState, useMemo } from 'react'
import { useClientDashboardStore } from '@/features/dashboard/store/dashboardStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { progressApi } from '@/lib/api'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Scale, Trash2, Plus, Calendar, TrendingDown, ArrowUpRight, ArrowDownRight, Award, Ruler, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type ChartTab = 'peso' | 'medidas'

export function ProgressView() {
  const { progressRecords, reloadProgress } = useClientDashboardStore()
  const [weightInput, setWeightInput] = useState('')
  const [bodyFatInput, setBodyFatInput] = useState('')
  const [waistInput, setWaistInput] = useState('')
  const [hipsInput, setHipsInput] = useState('')
  const [chestInput, setChestInput] = useState('')
  const [armsInput, setArmsInput] = useState('')
  const [thighsInput, setThighsInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [showMeasures, setShowMeasures] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [chartTab, setChartTab] = useState<ChartTab>('peso')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Obtener fecha de hoy en formato local YYYY-MM-DD
  const todayStr = useMemo(() => {
    const localDate = new Date()
    const year = localDate.getFullYear()
    const month = String(localDate.getMonth() + 1).padStart(2, '0')
    const day = String(localDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Comprobar si ya se ha registrado hoy
  const todayRecord = useMemo(() => {
    return progressRecords.find((r) => r.recordedAt === todayStr) ?? null
  }, [progressRecords, todayStr])

  // Ordenar registros por fecha ascendente para el gráfico
  const chartData = useMemo(() => {
    return [...progressRecords]
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .map((r) => {
        const date = new Date(r.recordedAt)
        const day = date.getDate()
        const month = date.toLocaleDateString('es-ES', { month: 'short' })
        return {
          fecha: `${day} ${month}`,
          fechaCompleta: r.recordedAt,
          Peso: r.weight ?? undefined,
          Cintura: r.waist ?? undefined,
          Cadera: r.hips ?? undefined,
          Pecho: r.chest ?? undefined,
          Brazos: r.arms ?? undefined,
          Muslos: r.thighs ?? undefined,
        }
      })
  }, [progressRecords])

  // Estadísticas
  const stats = useMemo(() => {
    if (progressRecords.length === 0) return null

    const sorted = [...progressRecords].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    const startWeight = sorted[0]?.weight ?? 0
    const currentWeight = sorted[sorted.length - 1]?.weight ?? 0
    const diff = currentWeight - startWeight

    const weights = progressRecords.map((r) => r.weight).filter((w): w is number => w !== null)
    const min = weights.length > 0 ? Math.min(...weights) : 0
    const max = weights.length > 0 ? Math.max(...weights) : 0

    // Latest measurements
    const lastWithMeasures = [...sorted].reverse().find(r => r.waist || r.hips || r.chest)
    const firstWithMeasures = sorted.find(r => r.waist || r.hips || r.chest)

    return {
      startWeight,
      currentWeight,
      diff,
      min,
      max,
      latestWaist: lastWithMeasures?.waist ?? null,
      initialWaist: firstWithMeasures?.waist ?? null,
    }
  }, [progressRecords])

  // Does any record have measurements?
  const hasMeasurements = useMemo(() =>
    progressRecords.some(r => r.waist || r.hips || r.chest || r.arms || r.thighs),
    [progressRecords]
  )

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    const weightVal = weightInput ? parseFloat(weightInput) : undefined
    if (weightVal !== undefined && (isNaN(weightVal) || weightVal <= 20 || weightVal > 500)) {
      toast({ 
        title: 'Valor inválido', 
        description: 'Por favor introduce un peso válido entre 20 y 500 kg.', 
        variant: 'destructive' 
      })
      return
    }

    const parseOptional = (val: string) => {
      if (!val.trim()) return undefined
      const n = parseFloat(val)
      return isNaN(n) ? undefined : n
    }

    setIsSubmitting(true)
    try {
      await progressApi.create({
        recordedAt: todayStr,
        weight: weightVal ?? undefined,
        bodyFat: parseOptional(bodyFatInput),
        waist: parseOptional(waistInput),
        hips: parseOptional(hipsInput),
        chest: parseOptional(chestInput),
        arms: parseOptional(armsInput),
        thighs: parseOptional(thighsInput),
        notes: notesInput.trim() || undefined,
      })
      await reloadProgress()
      setWeightInput('')
      setBodyFatInput('')
      setWaistInput('')
      setHipsInput('')
      setChestInput('')
      setArmsInput('')
      setThighsInput('')
      setNotesInput('')
      setShowMeasures(false)
      toast({ title: '¡Progreso registrado!', description: 'Tu registro ha sido guardado exitosamente.' })
    } catch (err: any) {
      toast({ 
        title: 'Error al guardar', 
        description: err.message || 'No se pudo guardar el registro', 
        variant: 'destructive' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) return

    try {
      await progressApi.delete(id)
      await reloadProgress()
      toast({ title: 'Registro eliminado', description: 'El registro ha sido eliminado.' })
    } catch (err: any) {
      toast({ 
        title: 'Error al eliminar', 
        description: err.message || 'No se pudo eliminar el registro', 
        variant: 'destructive' 
      })
    }
  }

  const measureLineColors: Record<string, string> = {
    Cintura: '#ef4444',
    Cadera: '#f97316',
    Pecho: '#3b82f6',
    Brazos: '#8b5cf6',
    Muslos: '#10b981',
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner de estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-white/60 bg-white/45 backdrop-blur-xl shadow-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Peso Inicial</p>
                <p className="text-2xl font-black text-[#2D1E1B]">{stats.startWeight} kg</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Scale className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/60 bg-white/45 backdrop-blur-xl shadow-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Peso Actual</p>
                <p className="text-2xl font-black text-[#2D1E1B]">{stats.currentWeight} kg</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Scale className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/60 bg-white/45 backdrop-blur-xl shadow-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Diferencia Total</p>
                <div className="flex items-baseline gap-1.5">
                  <p className={`text-2xl font-black ${stats.diff < 0 ? 'text-emerald-600' : stats.diff > 0 ? 'text-amber-600' : 'text-[#2D1E1B]'}`}>
                    {stats.diff > 0 ? `+${stats.diff.toFixed(1)}` : stats.diff.toFixed(1)} kg
                  </p>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stats.diff < 0 ? 'bg-emerald-100 text-emerald-600' : stats.diff > 0 ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                {stats.diff < 0 ? (
                  <ArrowDownRight className="w-5 h-5" />
                ) : stats.diff > 0 ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/60 bg-white/45 backdrop-blur-xl shadow-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                {stats.initialWaist && stats.latestWaist ? (
                  <>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cintura</p>
                    <p className="text-lg font-black text-[#2D1E1B]">
                      {stats.initialWaist} → {stats.latestWaist} cm
                    </p>
                    <p className={`text-xs font-bold ${stats.latestWaist < stats.initialWaist ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {stats.latestWaist < stats.initialWaist ? `−${(stats.initialWaist - stats.latestWaist).toFixed(1)} cm` : `+${(stats.latestWaist - stats.initialWaist).toFixed(1)} cm`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mín / Máx Peso</p>
                    <p className="text-lg font-black text-[#2D1E1B]">{stats.min} / {stats.max} kg</p>
                  </>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {stats.initialWaist ? <Ruler className="w-5 h-5" /> : <Award className="w-5 h-5" />}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Secciones del panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de evolución */}
        <Card className="lg:col-span-2 border border-white/40 bg-white/45 backdrop-blur-xl shadow-lg rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-[#2D1E1B]">Evolución</CardTitle>
                <CardDescription className="text-xs">Visualiza tu progreso a lo largo del tiempo</CardDescription>
              </div>
              {/* Tabs */}
              <div className="flex bg-black/5 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setChartTab('peso')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartTab === 'peso' ? 'bg-white shadow text-[#2D1E1B]' : 'text-[#2D1E1B]/50 hover:text-[#2D1E1B]/80'}`}
                >
                  Peso
                </button>
                <button
                  onClick={() => setChartTab('medidas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartTab === 'medidas' ? 'bg-white shadow text-[#2D1E1B]' : 'text-[#2D1E1B]/50 hover:text-[#2D1E1B]/80'}`}
                >
                  Medidas
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-grow flex items-center justify-center min-h-[300px]">
            {mounted && chartData.length > 0 ? (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                    <XAxis 
                      dataKey="fecha" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 10, fill: 'rgba(45,30,27,0.6)', fontWeight: 600 }} 
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 10, fill: 'rgba(45,30,27,0.6)', fontWeight: 600 }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid rgba(0,0,0,0.1)', 
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        fontSize: '12px' 
                      }} 
                    />
                    {chartTab === 'peso' ? (
                      <Line 
                        type="monotone" 
                        dataKey="Peso" 
                        stroke="#2C5E43" 
                        strokeWidth={3} 
                        dot={{ r: 4, stroke: '#2C5E43', strokeWidth: 2, fill: '#fff' }} 
                        activeDot={{ r: 6, fill: '#2C5E43' }}
                        connectNulls
                      />
                    ) : (
                      <>
                        {hasMeasurements ? (
                          <>
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                            {Object.entries(measureLineColors).map(([key, color]) => (
                              <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={color}
                                strokeWidth={2.5}
                                dot={{ r: 3, stroke: color, strokeWidth: 2, fill: '#fff' }}
                                activeDot={{ r: 5, fill: color }}
                                connectNulls
                              />
                            ))}
                          </>
                        ) : (
                          <Line type="monotone" dataKey="__none__" stroke="transparent" />
                        )}
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
                {chartTab === 'medidas' && !hasMeasurements && (
                  <div className="text-center text-muted-foreground -mt-32 pb-8">
                    <Ruler className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold">Añade medidas corporales para verlas aquí</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#2D1E1B]" />
                <p className="text-sm font-semibold">No hay suficientes datos todavía</p>
                <p className="text-xs">Registra tu peso para empezar a trazar la gráfica de evolución.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulario de registro diario */}
        <Card className="border border-white/40 bg-white/45 backdrop-blur-xl shadow-lg rounded-2xl flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#2D1E1B]">Registro Diario</CardTitle>
            <CardDescription className="text-xs">Peso y medidas de hoy (máx. una vez al día)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
            {todayRecord ? (
              <div className="bg-emerald-500/10 border border-emerald-200/30 rounded-2xl p-5 text-center space-y-3 flex-grow flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">¡Registro de hoy completado!</h4>
                  <p className="text-xs text-emerald-900/60 font-semibold mt-1">
                    {todayRecord.weight ? <><strong className="text-emerald-700">{todayRecord.weight} kg</strong> registrado</> : 'Registro guardado'}
                    {todayRecord.waist ? <> · Cintura: <strong className="text-emerald-700">{todayRecord.waist} cm</strong></> : null}
                  </p>
                </div>
                <p className="text-[11px] text-emerald-900/60 leading-relaxed max-w-[200px] mx-auto mt-2 font-medium">
                  Vuelve mañana para seguir registrando.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAddRecord} className="space-y-3 flex-grow flex flex-col">
                <div className="space-y-3 flex-grow">
                  {/* Peso */}
                  <div className="space-y-1.5">
                    <Label htmlFor="weight" className="text-xs font-bold text-[#2D1E1B]/70">Tu Peso (kg)</Label>
                    <div className="relative">
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="Ej. 74.5"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        className="pr-10 rounded-xl bg-white/70 focus:bg-white text-sm"
                        disabled={isSubmitting}
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-bold text-muted-foreground">kg</span>
                    </div>
                  </div>

                  {/* Toggle medidas */}
                  <button
                    type="button"
                    onClick={() => setShowMeasures(!showMeasures)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors text-xs font-bold text-[#2D1E1B]/70 border border-dashed border-primary/20"
                  >
                    <span className="flex items-center gap-2">
                      <Ruler className="w-3.5 h-3.5" />
                      Medidas corporales (opcional)
                    </span>
                    {showMeasures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Medidas expandibles */}
                  {showMeasures && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'waist', label: 'Cintura', value: waistInput, setter: setWaistInput },
                          { id: 'hips', label: 'Cadera', value: hipsInput, setter: setHipsInput },
                          { id: 'chest', label: 'Pecho', value: chestInput, setter: setChestInput },
                          { id: 'arms', label: 'Brazos', value: armsInput, setter: setArmsInput },
                          { id: 'thighs', label: 'Muslos', value: thighsInput, setter: setThighsInput },
                          { id: 'bodyFat', label: '% Grasa', value: bodyFatInput, setter: setBodyFatInput },
                        ].map(({ id, label, value, setter }) => (
                          <div key={id} className="space-y-1">
                            <Label htmlFor={id} className="text-[10px] font-bold text-[#2D1E1B]/60">{label}</Label>
                            <div className="relative">
                              <Input
                                id={id}
                                type="number"
                                step="0.1"
                                placeholder="—"
                                value={value}
                                onChange={(e) => setter(e.target.value)}
                                className="pr-7 rounded-lg bg-white/70 focus:bg-white text-xs h-8"
                                disabled={isSubmitting}
                              />
                              <span className="absolute right-2 top-1.5 text-[10px] font-bold text-muted-foreground">
                                {id === 'bodyFat' ? '%' : 'cm'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs font-bold text-[#2D1E1B]/70">Notas (Opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ej. Entreno en ayunas, retención de líquidos..."
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      className="rounded-xl bg-white/70 focus:bg-white resize-none text-xs min-h-[60px]"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting || (!weightInput && !waistInput && !hipsInput && !chestInput && !armsInput)} 
                  className="w-full rounded-xl gap-2 mt-2 font-bold shadow"
                >
                  <Plus className="w-4 h-4" />
                  {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de registros */}
      <Card className="border border-white/40 bg-white/45 backdrop-blur-xl shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-[#2D1E1B]">Historial de Registros</CardTitle>
          <CardDescription className="text-xs">Todos tus registros de progreso anteriores</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {progressRecords.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border-t border-white/20">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">Sin registros históricos todavía</p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-white/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-primary/5 text-muted-foreground font-bold border-b border-white/20">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Peso</th>
                    <th className="p-4">Cintura</th>
                    <th className="p-4">Cadera</th>
                    <th className="p-4">Pecho</th>
                    <th className="p-4 hidden xl:table-cell">Brazos</th>
                    <th className="p-4 hidden xl:table-cell">Muslos</th>
                    <th className="p-4">Notas</th>
                    <th className="p-4 text-right">Acc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {progressRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-white/10 transition-colors">
                      <td className="p-4 font-semibold text-[#2D1E1B]/80 whitespace-nowrap">{formatDate(record.recordedAt)}</td>
                      <td className="p-4 font-bold text-[#2D1E1B]">{record.weight ? `${record.weight} kg` : '—'}</td>
                      <td className="p-4 text-[#2D1E1B]/70">{record.waist ? `${record.waist} cm` : '—'}</td>
                      <td className="p-4 text-[#2D1E1B]/70">{record.hips ? `${record.hips} cm` : '—'}</td>
                      <td className="p-4 text-[#2D1E1B]/70">{record.chest ? `${record.chest} cm` : '—'}</td>
                      <td className="p-4 text-[#2D1E1B]/70 hidden xl:table-cell">{record.arms ? `${record.arms} cm` : '—'}</td>
                      <td className="p-4 text-[#2D1E1B]/70 hidden xl:table-cell">{record.thighs ? `${record.thighs} cm` : '—'}</td>
                      <td className="p-4 text-muted-foreground max-w-[150px] truncate font-medium">{record.notes || '—'}</td>
                      <td className="p-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteRecord(record.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
