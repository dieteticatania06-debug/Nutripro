export interface ParsedObservations {
  observations: string
  hydration: string
  sleepStress: string
  mealFrequency: string
  supplements: string
  barriers: string
  age: string
  height: string
  weight: string
  birthDate: string
  gender: string
  trainingDays: string
  trainingDuration: string
  trainingLocation: string
  trainingLevel: string
}

export const parseObservations = (obsStr: string | null | undefined): ParsedObservations => {
  const result: ParsedObservations = {
    observations: '',
    hydration: '',
    sleepStress: '',
    mealFrequency: '',
    supplements: '',
    barriers: '',
    age: '',
    height: '',
    weight: '',
    birthDate: '',
    gender: '',
    trainingDays: '',
    trainingDuration: '',
    trainingLocation: '',
    trainingLevel: '',
  }
  if (!obsStr) return result

  if (obsStr.includes(' | ')) {
    const parts = obsStr.split(' | ')
    parts.forEach(part => {
      const colonIndex = part.indexOf(':')
      if (colonIndex !== -1) {
        const key = part.slice(0, colonIndex).trim()
        const val = part.slice(colonIndex + 1).trim()
        if (key === 'Médico') result.observations = val
        else if (key === 'Hidratación') result.hydration = val
        else if (key === 'Sueño/Estrés') result.sleepStress = val
        else if (key === 'Frecuencia Comidas') result.mealFrequency = val
        else if (key === 'Suplementación') result.supplements = val
        else if (key === 'Barreras Anteriores') result.barriers = val
        else if (key === 'Edad') result.age = val
        else if (key === 'Altura') result.height = val
        else if (key === 'Peso') result.weight = val
        else if (key === 'Fecha Nacimiento') result.birthDate = val
        else if (key === 'Sexo') result.gender = val
        else if (key === 'Días Entrenamiento') result.trainingDays = val
        else if (key === 'Duración Entrenamiento') result.trainingDuration = val
        else if (key === 'Lugar Entrenamiento') result.trainingLocation = val
        else if (key === 'Nivel Entrenamiento') result.trainingLevel = val
      }
    })
  } else {
    result.observations = obsStr
  }
  return result
}
