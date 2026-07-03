import { parseObservations } from '@nutripro/shared'


export class AiService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  // ── Helper: build clinical context block injected into user prompts ──
  private buildClinicalContext(context?: {
    progressHistory?: any[]
    weeklyCheckins?: any[]
    currentDietNumber?: number
    currentPhase?: string
    weeksSinceStart?: number
    allDietTitles?: string[]
    allWorkoutTitles?: string[]
  }): string {
    if (!context) return ''
    let block = ''

    // Phase info
    if (context.currentPhase || context.weeksSinceStart !== undefined) {
      const phaseLabels: Record<string, string> = {
        adaptacion: 'ADAPTACIÓN (semanas 1-4): Primera fase. Mantén un déficit/superávit moderado y crea hábitos sostenibles.',
        progresion: 'PROGRESIÓN (semanas 5-8): Ajusta calorías según resultados de la fase anterior.',
        mantenimiento: 'MANTENIMIENTO (semanas 9-12): Consolida resultados y prepara al cliente para el siguiente ciclo.',
      }
      const phaseKey = context.currentPhase ?? 'adaptacion'
      block += `\n📅 FASE DEL PLAN ACTUAL:
- Semana ${context.weeksSinceStart ?? 1} del tratamiento
- Número de pauta en el ciclo: ${context.currentDietNumber ?? 1}ª
- Fase: ${phaseKey.toUpperCase()} — ${phaseLabels[phaseKey] ?? ''}
${context.allDietTitles?.length ? `- Pautas nutricionales previas: ${context.allDietTitles.join(' | ')} (NO repitas el mismo título ni enfoque)` : ''}
${context.allWorkoutTitles?.length ? `- Rutinas previas: ${context.allWorkoutTitles.join(' | ')} (varía los estímulos)` : ''}`
    }

    // Progress history
    if (context.progressHistory && context.progressHistory.length > 0) {
      const recent = context.progressHistory.slice(0, 8)
      const weightRecords = recent.filter((r: any) => r.weight)
      const latestWeight = weightRecords[0]?.weight
      const oldestWeight = weightRecords[weightRecords.length - 1]?.weight
      const weightChange = latestWeight && oldestWeight ? (latestWeight - oldestWeight).toFixed(1) : null

      block += `\n\n📊 HISTORIAL DE PROGRESO (últimas ${recent.length} mediciones):
${recent.map((r: any) => {
  const parts: string[] = [`${r.recordedAt}: ${r.weight ? r.weight + ' kg' : 'sin peso'}`]
  if (r.waist) parts.push(`cintura ${r.waist} cm`)
  if (r.hips) parts.push(`cadera ${r.hips} cm`)
  if (r.chest) parts.push(`pecho ${r.chest} cm`)
  if (r.arms) parts.push(`brazos ${r.arms} cm`)
  if (r.thighs) parts.push(`muslos ${r.thighs} cm`)
  if (r.bodyFat) parts.push(`% grasa ${r.bodyFat}%`)
  return '- ' + parts.join(' | ')
}).join('\n')}
${weightChange ? `- Cambio de peso en el período: ${Number(weightChange) > 0 ? '+' : ''}${weightChange} kg` : ''}`
    }

    // Weekly check-ins
    if (context.weeklyCheckins && context.weeklyCheckins.length > 0) {
      const stars = (n: number | null) => n ? '⭐'.repeat(n) : '—'
      block += `\n\n📋 CHECK-INS SEMANALES RECIENTES (feedback directo del cliente):
${context.weeklyCheckins.slice(0, 4).map((c: any) => {
  const parts: string[] = [
    `Semana ${c.weekLabel}`,
    `Adherencia a la dieta: ${stars(c.dietAdherence)} (${c.dietAdherence}/5)`,
    `Energía: ${stars(c.energyLevel)} (${c.energyLevel}/5)`,
  ]
  if (c.hungerLevel) parts.push(`Hambre: ${stars(c.hungerLevel)} (${c.hungerLevel}/5)`)
  if (c.mood) parts.push(`Ánimo: ${stars(c.mood)} (${c.mood}/5)`)
  if (c.notes) parts.push(`Nota: "${c.notes}"`)
  return '- ' + parts.join(' | ')
}).join('\n')}`

      // Derive actionable insights
      const recent4 = context.weeklyCheckins.slice(0, 4)
      const avgAdherence = recent4.reduce((sum: number, c: any) => sum + c.dietAdherence, 0) / recent4.length
      const avgEnergy = recent4.reduce((sum: number, c: any) => sum + c.energyLevel, 0) / recent4.length
      const hungerCheckins = recent4.filter((c: any) => c.hungerLevel)
      const avgHunger = hungerCheckins.length > 0
        ? hungerCheckins.reduce((sum: number, c: any) => sum + c.hungerLevel, 0) / hungerCheckins.length
        : 0

      block += `\n\n🔍 ANÁLISIS CLÍNICO — APLICA ESTAS RECOMENDACIONES EN LA PAUTA:
- Adherencia media: ${avgAdherence.toFixed(1)}/5 ${avgAdherence < 3 ? '→ Dieta anterior difícil de seguir. Simplifica recetas y aumenta saciedad con fibra y proteína.' : avgAdherence >= 4.5 ? '→ Excelente adherencia. Puedes incrementar la exigencia calórica.' : '→ Adherencia correcta. Mantén dificultad similar.'}
- Energía media: ${avgEnergy.toFixed(1)}/5 ${avgEnergy < 3 ? '→ Energía baja. Revisa hidratos pre-entreno y asegura calorías suficientes.' : '→ Energía aceptable.'}
${avgHunger > 3.5 ? `- Hambre elevada (${avgHunger.toFixed(1)}/5) → Aumenta volumen de alimentos saciantes (verduras, legumbres, proteína magra). Distribuye mejor las comidas.` : ''}
${avgHunger > 0 && avgHunger < 2 ? `- Hambre baja (${avgHunger.toFixed(1)}/5) → El cliente no tiene hambre. Puedes mantener o incluso reducir ligeramente el volumen calórico.` : ''}`
    }

    return block
  }

  async generateDiet(
    profile: any,
    questionnaire: any,
    context?: {
      progressHistory?: any[]
      weeklyCheckins?: any[]
      currentDietNumber?: number
      currentPhase?: string
      weeksSinceStart?: number
      allDietTitles?: string[]
    }
  ): Promise<{
    title: string
    description?: string
    totalCalories?: number
    weeklyPlan: any
    notes?: string
  }> {
    const systemPrompt = `Eres un nutricionista profesional y experto en dietética clínica. Tu tarea es generar una pauta nutricional semanal y plan de dieta personalizado en base al perfil del cliente y sus respuestas en un cuestionario.

IMPORTANTE - VARIEDAD Y EVITAR REPETICIONES:
- Debes maximizar la variedad de los alimentos y platos a lo largo de la semana. Está estrictamente prohibido repetir de forma excesiva el mismo almuerzo (lunch), cena (dinner), desayuno (breakfast) o merienda (snack) de manera monótona.
- Para los almuerzos/comidas (lunch) y cenas (dinner), planifica al menos 3 o 4 opciones o recetas diferentes a lo largo de los 7 días de la semana y ve alternándolas. Evita proponer solo dos opciones repetitivas día sí y día no, y nunca pongas la misma comida dos días seguidos.
- Para los desayunos y meriendas (mid_morning / snack), planifica al menos 2 o 3 opciones distintas y altérnalas durante la semana.
- Incluso en dietas restrictivas, haz un esfuerzo por aportar variedad utilizando diferentes fuentes de proteína y distintas guarniciones.

Debes responder ÚNICAMENTE con un objeto JSON válido. El JSON debe cumplir exactamente con esta estructura:
{
  "title": "Título descriptivo y profesional de la dieta (ej: Dieta Hipocalórica Fase 1, Pauta de Aumento de Masa Muscular)",
  "description": "Una breve explicación de los objetivos principales de la dieta",
  "totalCalories": 2000,
  "weeklyPlan": {
    "monday": {
      "meals": {
        "breakfast": { "text": "Alimentos y cantidades...", "macros": { "protein": 30, "carbs": 40, "fat": 8, "calories": 350 } },
        "mid_morning": { "text": "...", "macros": { "protein": 15, "carbs": 10, "fat": 5, "calories": 145 } },
        "lunch": { "text": "...", "macros": { "protein": 40, "carbs": 60, "fat": 15, "calories": 535 } },
        "snack": { "text": "...", "macros": { "protein": 20, "carbs": 30, "fat": 6, "calories": 254 } },
        "dinner": { "text": "...", "macros": { "protein": 35, "carbs": 15, "fat": 12, "calories": 308 } }
      },
      "dayTotals": { "protein": 140, "carbs": 155, "fat": 46, "calories": 1592 }
    },
    "tuesday": { "meals": { "breakfast": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "mid_morning": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "lunch": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "snack": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "dinner": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } } }, "dayTotals": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } },
    "wednesday": { "meals": { "breakfast": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "mid_morning": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "lunch": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "snack": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "dinner": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } } }, "dayTotals": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } },
    "thursday": { "meals": { "breakfast": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "mid_morning": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "lunch": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "snack": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "dinner": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } } }, "dayTotals": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } },
    "friday": { "meals": { "breakfast": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "mid_morning": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "lunch": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "snack": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "dinner": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } } }, "dayTotals": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } },
    "saturday": { "meals": { "breakfast": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "mid_morning": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "lunch": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "snack": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "dinner": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } } }, "dayTotals": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } },
    "sunday": { "meals": { "breakfast": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "mid_morning": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "lunch": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "snack": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }, "dinner": { "text": "...", "macros": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } } }, "dayTotals": { "protein": 0, "carbs": 0, "fat": 0, "calories": 0 } }
  },
  "notes": "Instrucciones generales de la pauta (hidratación, suplementación, alimentos a evitar, consejos)"
}
Asegúrate de calcular los macros de forma coherente y que la suma de dayTotals sea exactamente la suma de los macros de las comidas del día.
Si el objetivo es ganar masa muscular, usa superávit calórico y proteína 1.6-2.2g/kg. Si es perder peso, usa déficit hipocalórico. Si es mantenimiento, usa isocalórico.
Asegúrate de que el JSON sea válido sin comentarios ni markdown.`

    const parsedObs = parseObservations(questionnaire?.observations)
    const age = profile.birthDate || (parsedObs.age ? `${parsedObs.age} años` : 'No especificada')
    const height = profile.height ? `${profile.height} cm` : (parsedObs.height ? `${parsedObs.height} cm` : 'No especificada')
    const weight = profile.weight ? `${profile.weight} kg` : (parsedObs.weight ? `${parsedObs.weight} kg` : 'No especificado')

    const contextBlock = this.buildClinicalContext(context)

    const userPrompt = `Datos del cliente:
- Nombre: ${profile.firstName ?? ''} ${profile.lastName ?? ''}
- Género: ${profile.gender || 'No especificado'}
- Altura: ${height}
- Peso: ${weight}
- Edad/Fecha de Nacimiento: ${age}
- Alergias o Intolerancias: ${profile.allergies || 'Ninguna'}
- Notas adicionales de perfil: ${profile.observations || 'Ninguna'}

Respuestas del cuestionario nutricional:
- Objetivos detallados: ${questionnaire?.objectives || 'No especificados (el cliente aún no ha completado el cuestionario)'}
- Hábitos alimenticios actuales: ${questionnaire?.eatingHabits || 'No especificados'}
- Restricciones dietéticas o preferencias: ${questionnaire?.restrictions || 'Ninguna'}
- Horarios de alimentación diarios: ${questionnaire?.schedule || 'No especificados'}
- Nivel de actividad física / Deportes: ${questionnaire?.sportsExperience || 'No especificado'}
- Nivel de entrenamiento de fuerza: ${parsedObs.trainingLevel || 'No especificado'}
- Hidratación recomendada/actual: ${parsedObs.hydration || 'No especificada'}
- Descanso y estrés: ${parsedObs.sleepStress || 'No especificado'}
- Frecuencia de comidas: ${parsedObs.mealFrequency || 'No especificada'}
- Suplementación / Medicamentos: ${parsedObs.supplements || 'Ninguno'}
- Dificultades / Barreras anteriores: ${parsedObs.barriers || 'Ninguna'}
- Observaciones médicas: ${parsedObs.observations || 'Ninguna'}
${contextBlock}

Por favor, crea una dieta semanal balanceada, realista y adaptada a su peso, altura, objetivos y a la fase actual del tratamiento. Aplica todas las recomendaciones clínicas derivadas del análisis de progreso y check-ins indicadas arriba.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Error de Groq API: ${response.status} - ${errText}`)
    }

    const data: any = await response.json()
    const contentText = data.choices?.[0]?.message?.content
    if (!contentText) {
      throw new Error('Respuesta de Groq vacía o inválida')
    }

    try {
      return JSON.parse(contentText)
    } catch (e) {
      throw new Error(`No se pudo parsear el JSON generado por la IA: ${contentText}`)
    }
  }

  async generateWorkout(
    profile: any,
    questionnaire: any,
    context?: {
      progressHistory?: any[]
      weeklyCheckins?: any[]
      currentDietNumber?: number
      currentPhase?: string
      weeksSinceStart?: number
      allWorkoutTitles?: string[]
    }
  ): Promise<{
    title: string
    description?: string
    daysPerWeek?: number
    duration?: number
    level?: 'beginner' | 'intermediate' | 'advanced'
    exercises: {
      name: string
      sets?: number
      reps?: string
      rest?: string
      notes?: string
      day?: string
    }[]
  }> {
    const systemPrompt = `Eres un entrenador personal certificado y experto en preparación física y acondicionamiento. Tu tarea es generar una rutina semanal de entrenamiento personalizada en base al perfil del cliente y sus respuestas en un cuestionario.

IMPORTANTE - VARIEDAD Y EVITAR REPETICIONES DE EJERCICIOS:
- Evita la monotonía en la rutina de ejercicios distribuyendo variantes y movimientos alternativos a lo largo de la semana.
- Si un grupo muscular se entrena más de una vez por semana, no prescribas exactamente los mismos ejercicios en ambos días. Utiliza ejercicios alternativos para el mismo grupo muscular en la segunda sesión.

Debes responder ÚNICAMENTE con un objeto JSON válido. El JSON debe cumplir exactamente con esta estructura:
{
  "title": "Título descriptivo y profesional de la rutina (ej: Rutina de Hipertrofia de 3 Días, Programa de Fuerza para Principiantes)",
  "description": "Una breve explicación de los objetivos principales de la rutina",
  "daysPerWeek": 3,
  "duration": 60,
  "level": "intermediate",
  "exercises": [
    {
      "name": "Nombre del ejercicio",
      "sets": 4,
      "reps": "8-12",
      "rest": "90s",
      "notes": "Consejos breves sobre la técnica o ejecución",
      "day": "Lunes"
    }
  ]
}
Adapta estrictamente la selección de ejercicios y el equipamiento según el lugar de entrenamiento del cliente para que sea realista y realizable:
- Si el lugar es "En el gimnasio": Puedes prescribir cualquier ejercicio con máquinas, poleas, barras libres y mancuernas.
- Si el lugar es "En casa": PROHIBIDO prescribir ejercicios con poleas, máquinas guiadas complejas o barras con soportes. Solo peso corporal, bandas o mancuernas ligeras.
- Si el lugar es "Al aire libre": Solo calistenia, peso corporal, dominadas en parque, fondos, correr o bandas elásticas.
Adapta el volumen según nivel: Principiante: 3-4 ejercicios/sesión. Intermedio: 4-5. Avanzado: 5-6.
Asegúrate de que el JSON sea válido sin comentarios ni markdown.`

    const parsedObs = parseObservations(questionnaire?.observations)
    const age = profile.birthDate || (parsedObs.age ? `${parsedObs.age} años` : 'No especificada')
    const height = profile.height ? `${profile.height} cm` : (parsedObs.height ? `${parsedObs.height} cm` : 'No especificada')
    const weight = profile.weight ? `${profile.weight} kg` : (parsedObs.weight ? `${parsedObs.weight} kg` : 'No especificado')

    const contextBlock = this.buildClinicalContext({ ...context, allDietTitles: undefined, allWorkoutTitles: context?.allWorkoutTitles })

    const userPrompt = `Datos del cliente:
- Nombre: ${profile.firstName ?? ''} ${profile.lastName ?? ''}
- Género: ${profile.gender || 'No especificado'}
- Altura: ${height}
- Peso: ${weight}
- Edad/Fecha de Nacimiento: ${age}
- Notas de salud adicionales: ${profile.observations || 'Ninguna'}

Respuestas del cuestionario:
- Objetivos detallados: ${questionnaire?.objectives || 'No especificados'}
- Nivel de actividad física / Deportes: ${questionnaire?.sportsExperience || 'No especificado'}
- Nivel de experiencia en fuerza: ${parsedObs.trainingLevel || 'No especificado'}
- Dificultades / Lesiones previas: ${parsedObs.barriers || 'Ninguna'}
- Observaciones médicas: ${parsedObs.observations || 'Ninguna'}

Disponibilidad y lugar de entrenamiento:
- Días a la semana disponibles para entrenar: ${parsedObs.trainingDays || 'No especificado (diseña una rutina estándar de 3 días)'}
- Tiempo disponible por sesión: ${parsedObs.trainingDuration || 'No especificado (diseña sesiones de 60 minutos)'}
- Lugar de entrenamiento: ${parsedObs.trainingLocation || 'No especificado (diseña una rutina que sirva tanto para casa como para gimnasio)'}
${contextBlock}

Por favor, crea una rutina de entrenamiento balanceada, detallada y totalmente adaptada a su disponibilidad, objetivos y a la fase actual del tratamiento. Ten en cuenta el historial de progreso y los check-ins para ajustar la intensidad.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Error de Groq API: ${response.status} - ${errText}`)
    }

    const data: any = await response.json()
    const contentText = data.choices?.[0]?.message?.content
    if (!contentText) {
      throw new Error('Respuesta de Groq vacía o inválida')
    }

    try {
      return JSON.parse(contentText)
    } catch (e) {
      throw new Error(`No se pudo parsear el JSON generado por la IA: ${contentText}`)
    }
  }

  async calculateMacros(meals: { day: string; meal: string; text: string }[]): Promise<{
    meals: {
      day: string
      meal: string
      text: string
      macros: {
        protein: number
        carbs: number
        fat: number
        calories: number
      }
    }[]
  }> {
    const systemPrompt = `Eres un nutricionista experto y base de datos de composición de alimentos. Tu tarea es calcular de forma precisa y realista los macronutrientes (proteínas, carbohidratos, grasas en gramos y calorías en kcal) para la lista de comidas o alimentos proporcionada.
Responde ÚNICAMENTE con un objeto JSON válido que contenga la lista de comidas con sus respectivos macronutrientes.
Ejemplo de estructura de respuesta:
{
  "meals": [
    {
      "day": "monday",
      "meal": "breakfast",
      "text": "100g avena con un plátano",
      "macros": {
        "protein": 14,
        "carbs": 76,
        "fat": 8,
        "calories": 420
      }
    }
  ]
}`

    const userPrompt = `Calcula los macros para las siguientes comidas:
${JSON.stringify(meals, null, 2)}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Error de Groq API: ${response.status} - ${errText}`)
    }

    const data: any = await response.json()
    const contentText = data.choices?.[0]?.message?.content
    if (!contentText) {
      throw new Error('Respuesta de Groq vacía o inválida')
    }

    try {
      return JSON.parse(contentText)
    } catch (e) {
      throw new Error(`No se pudo parsear el JSON generado por la IA: ${contentText}`)
    }
  }
}


