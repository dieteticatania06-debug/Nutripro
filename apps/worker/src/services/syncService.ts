import { eq, desc, and } from 'drizzle-orm'
import { schema } from '../db'
import { generateId } from './hashService'

export async function syncProfileToQuestionnaire(db: any, userId: string, profileData: any) {
  const latestQuest = await db
    .select()
    .from(schema.questionnaires)
    .where(eq(schema.questionnaires.userId, userId))
    .orderBy(desc(schema.questionnaires.submittedAt))
    .get()

  if (!latestQuest) return

  const updates: Record<string, any> = {}

  if (profileData.goal !== undefined) {
    updates.objectives = profileData.goal ?? ''
  }
  if (profileData.allergies !== undefined) {
    updates.restrictions = profileData.allergies ?? ''
  }

  // Handle observations parsing and updating
  let obsStr = latestQuest.observations || ''
  const parts = obsStr.includes(' | ') ? obsStr.split(' | ') : (obsStr ? [obsStr] : [])

  const map: Record<string, string> = {}
  parts.forEach((part: string) => {
    const colonIdx = part.indexOf(':')
    if (colonIdx !== -1) {
      const key = part.slice(0, colonIdx).trim()
      const val = part.slice(colonIdx + 1).trim()
      map[key] = val
    }
  })

  // Update map keys with profile data
  if (profileData.birthDate !== undefined) {
    map['Fecha Nacimiento'] = profileData.birthDate ?? ''
    if (profileData.birthDate) {
      const birthDate = new Date(profileData.birthDate)
      if (!isNaN(birthDate.getTime())) {
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        map['Edad'] = String(age)
      }
    } else {
      map['Edad'] = ''
    }
  }

  if (profileData.gender !== undefined) {
    map['Sexo'] = profileData.gender ?? ''
  }

  if (profileData.height !== undefined) {
    map['Altura'] = profileData.height !== null ? String(profileData.height) : ''
  }

  if (profileData.weight !== undefined) {
    map['Peso'] = profileData.weight !== null ? String(profileData.weight) : ''
  }

  if (profileData.observations !== undefined) {
    map['Médico'] = profileData.observations ?? ''
  }

  // Re-package observations
  const keysOrder = [
    'Médico', 'Hidratación', 'Sueño/Estrés', 'Frecuencia Comidas',
    'Suplementación', 'Barreras Anteriores', 'Edad', 'Altura', 'Peso',
    'Fecha Nacimiento', 'Sexo', 'Nivel Entrenamiento', 'Días Entrenamiento',
    'Duración Entrenamiento', 'Lugar Entrenamiento'
  ]

  // Add any extra keys present in map but not in keysOrder
  Object.keys(map).forEach(k => {
    if (!keysOrder.includes(k)) keysOrder.push(k)
  })

  const newParts: string[] = []
  keysOrder.forEach(k => {
    if (map[k] !== undefined && map[k] !== '') {
      newParts.push(`${k}: ${map[k]}`)
    }
  })

  updates.observations = newParts.join(' | ') || null
  updates.updatedAt = new Date().toISOString()

  await db
    .update(schema.questionnaires)
    .set(updates)
    .where(eq(schema.questionnaires.id, latestQuest.id))
}

export async function syncQuestionnaireToProfile(
  db: any,
  userId: string,
  questionnaireData: { objectives: string; restrictions: string; observations: string | null }
) {
  const obsStr = questionnaireData.observations || ''
  const parts = obsStr.includes(' | ') ? obsStr.split(' | ') : (obsStr ? [obsStr] : [])
  const map: Record<string, string> = {}
  parts.forEach((part: string) => {
    const colonIdx = part.indexOf(':')
    if (colonIdx !== -1) {
      const key = part.slice(0, colonIdx).trim()
      const val = part.slice(colonIdx + 1).trim()
      map[key] = val
    }
  })

  const birthDate = map['Fecha Nacimiento'] || null
  const gender = map['Sexo'] || null
  const height = map['Altura'] ? parseFloat(map['Altura']) : null
  const weight = map['Peso'] ? parseFloat(map['Peso']) : null
  const goal = questionnaireData.objectives || null
  const allergies = questionnaireData.restrictions || null
  const obsMedical = map['Médico'] || null

  const existingProfile = await db.select().from(schema.profiles)
    .where(eq(schema.profiles.userId, userId))
    .get()

  const now = new Date().toISOString()

  if (!existingProfile) {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get()
    await db.insert(schema.profiles).values({
      id: generateId(),
      userId,
      firstName: user?.email.split('@')[0] || 'Cliente',
      lastName: '',
      birthDate,
      gender: gender as any,
      height,
      weight,
      goal,
      allergies,
      observations: obsMedical,
      updatedAt: now,
      createdAt: now
    })
  } else {
    await db.update(schema.profiles)
      .set({
        birthDate: birthDate ?? existingProfile.birthDate,
        gender: (gender as any) ?? existingProfile.gender,
        height: height ?? existingProfile.height,
        weight: weight ?? existingProfile.weight,
        goal: goal ?? existingProfile.goal,
        allergies: allergies ?? existingProfile.allergies,
        observations: obsMedical ?? existingProfile.observations,
        updatedAt: now
      })
      .where(eq(schema.profiles.userId, userId))
  }

  if (weight !== null && !isNaN(weight)) {
    await syncWeightToProgress(db, userId, weight)
  }
}

export async function syncWeightToProgress(db: any, userId: string, weight: number) {
  const todayStr = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

  // Check if progress record exists for today
  const existing = await db.select().from(schema.progressRecords)
    .where(
      and(
        eq(schema.progressRecords.userId, userId),
        eq(schema.progressRecords.recordedAt, todayStr)
      )
    )
    .get()

  if (existing) {
    await db.update(schema.progressRecords)
      .set({ weight })
      .where(eq(schema.progressRecords.id, existing.id))
  } else {
    await db.insert(schema.progressRecords).values({
      id: generateId(),
      userId,
      recordedAt: todayStr,
      weight,
      createdAt: new Date().toISOString()
    })
  }
}

export async function syncProgressToProfileAndQuestionnaire(db: any, userId: string, weight: number) {
  // Update profiles weight
  await db.update(schema.profiles)
    .set({ weight, updatedAt: new Date().toISOString() })
    .where(eq(schema.profiles.userId, userId))

  // Find latest questionnaire and update weight in observations
  const latestQuest = await db
    .select()
    .from(schema.questionnaires)
    .where(eq(schema.questionnaires.userId, userId))
    .orderBy(desc(schema.questionnaires.submittedAt))
    .get()

  if (latestQuest) {
    let obsStr = latestQuest.observations || ''
    const parts = obsStr.includes(' | ') ? obsStr.split(' | ') : (obsStr ? [obsStr] : [])
    const map: Record<string, string> = {}
    parts.forEach((part: string) => {
      const colonIdx = part.indexOf(':')
      if (colonIdx !== -1) {
        const key = part.slice(0, colonIdx).trim()
        const val = part.slice(colonIdx + 1).trim()
        map[key] = val
      }
    })

    map['Peso'] = String(weight)

    const keysOrder = [
      'Médico', 'Hidratación', 'Sueño/Estrés', 'Frecuencia Comidas',
      'Suplementación', 'Barreras Anteriores', 'Edad', 'Altura', 'Peso',
      'Fecha Nacimiento', 'Sexo', 'Nivel Entrenamiento', 'Días Entrenamiento',
      'Duración Entrenamiento', 'Lugar Entrenamiento'
    ]

    Object.keys(map).forEach(k => {
      if (!keysOrder.includes(k)) keysOrder.push(k)
    })

    const newParts: string[] = []
    keysOrder.forEach(k => {
      if (map[k] !== undefined && map[k] !== '') {
        newParts.push(`${k}: ${map[k]}`)
      }
    })

    await db.update(schema.questionnaires)
      .set({ observations: newParts.join(' | ') || null, updatedAt: new Date().toISOString() })
      .where(eq(schema.questionnaires.id, latestQuest.id))
  }
}

export async function syncWeightFromLatestProgress(db: any, userId: string) {
  const latestProgress = await db.select().from(schema.progressRecords)
    .where(eq(schema.progressRecords.userId, userId))
    .orderBy(desc(schema.progressRecords.recordedAt), desc(schema.progressRecords.createdAt))
    .get()

  if (latestProgress) {
    await syncProgressToProfileAndQuestionnaire(db, userId, latestProgress.weight)
  } else {
    // If no progress records remain, check the latest questionnaire to see if it has a weight
    const latestQuest = await db
      .select()
      .from(schema.questionnaires)
      .where(eq(schema.questionnaires.userId, userId))
      .orderBy(desc(schema.questionnaires.submittedAt))
      .get()

    let questWeight: number | null = null
    if (latestQuest) {
      let obsStr = latestQuest.observations || ''
      const parts = obsStr.includes(' | ') ? obsStr.split(' | ') : (obsStr ? [obsStr] : [])
      const map: Record<string, string> = {}
      parts.forEach((part: string) => {
        const colonIdx = part.indexOf(':')
        if (colonIdx !== -1) {
          const key = part.slice(0, colonIdx).trim()
          const val = part.slice(colonIdx + 1).trim()
          map[key] = val
        }
      })
      if (map['Peso']) {
        questWeight = parseFloat(map['Peso'])
      }
    }

    // Update profile weight
    await db.update(schema.profiles)
      .set({ weight: questWeight, updatedAt: new Date().toISOString() })
      .where(eq(schema.profiles.userId, userId))
  }
}
