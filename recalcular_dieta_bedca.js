const path = require('path')
const fs = require('fs')

// Path to the local D1 SQLite database
const dbPath = path.join(
  __dirname,
  'apps/worker/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f272169f61c5ab0eef210fc95e193d10f70878fbd97e423d5cbd3a2362c11d3c.sqlite'
)

// Read GROQ_API_KEY from apps/worker/.dev.vars
let groqApiKey = ''
const varsPath = path.join(__dirname, 'apps/worker/.dev.vars')
if (fs.existsSync(varsPath)) {
  const content = fs.readFileSync(varsPath, 'utf8')
  const match = content.match(/GROQ_API_KEY\s*=\s*(.+)/)
  if (match) {
    groqApiKey = match[1].trim()
  }
}

if (!groqApiKey) {
  console.error('❌ Error: GROQ_API_KEY no se encontró en apps/worker/.dev.vars')
  process.exit(1)
}

console.log('====================================================')
console.log('Recalculador de Macros de Dietas (BEDCA)')
console.log('====================================================')
console.log('DB path:', dbPath)
console.log('Using GROQ_API_KEY:', groqApiKey.substring(0, 10) + '...')
console.log('----------------------------------------------------')

if (!fs.existsSync(dbPath)) {
  console.error('❌ Error: El archivo de base de datos no existe. Asegúrate de ejecutar el servidor local primero.')
  process.exit(1)
}

async function recalculateMacrosWithGroq(meals) {
  const systemPrompt = `Eres un nutricionista experto y base de datos de composición de alimentos. Tu tarea es calcular de forma precisa y realista los macronutrientes (proteínas, carbohidratos, grasas en gramos y calorías en kcal) para la lista de comidas o alimentos proporcionada.

IMPORTANTE - USO DE VALORES OFICIALES DE BEDCA:
- Debes utilizar estrictamente los datos oficiales de la base de datos BEDCA (Base de Datos Española de Composición de Alimentos) para cada alimento y su correspondiente peso asignado.
- Identifica el peso en gramos de cada alimento especificado en el texto de la comida.
- Calcula los macros exactos multiplicando los valores nutricionales por cada 100g del alimento según BEDCA por (peso_del_alimento / 100).
- Suma los macronutrientes y calorías de todos los alimentos de la comida para obtener el total preciso de proteínas, carbohidratos, grasas y calorías de esa comida en el objeto "macros". Los valores calculados deben ser matemáticamente precisos, realistas y coherentes con los oficiales de BEDCA.

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
      'Authorization': `Bearer ${groqApiKey}`
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

  const data = await response.json()
  const contentText = data.choices?.[0]?.message?.content
  if (!contentText) {
    throw new Error('Respuesta de Groq vacía o inválida')
  }

  return JSON.parse(contentText)
}

function getDatabaseConnection() {
  try {
    const Database = require('better-sqlite3')
    return { db: new Database(dbPath), type: 'better-sqlite3' }
  } catch (err) {
    console.log('ℹ️ better-sqlite3 no está disponible, usando node:sqlite...')
    try {
      const { DatabaseSync } = require('node:sqlite')
      return { db: new DatabaseSync(dbPath), type: 'node:sqlite' }
    } catch (fallbackErr) {
      console.error('❌ Error al conectar a la base de datos:', fallbackErr.message)
      process.exit(1)
    }
  }
}

async function run() {
  const { db, type } = getDatabaseConnection()
  console.log(`✅ Conectado a la base de datos (${type})`)

  let rows = []
  if (type === 'better-sqlite3') {
    rows = db.prepare('SELECT id, title, content, total_calories FROM diets').all()
  } else {
    rows = db.prepare('SELECT id, title, content, total_calories FROM diets').all()
  }

  console.log(`Encontradas ${rows.length} dietas en la base de datos.`)

  for (const row of rows) {
    console.log(`\n----------------------------------------------------`)
    console.log(`Procesando dieta: "${row.title}" (ID: ${row.id})`)
    console.log(`----------------------------------------------------`)

    let dietObj
    try {
      dietObj = JSON.parse(row.content)
    } catch (e) {
      console.error(`❌ Error al parsear JSON de la dieta "${row.title}":`, e.message)
      continue
    }

    if (!dietObj.weeklyPlan) {
      console.log('ℹ️ Dieta no tiene un plan semanal (weeklyPlan), saltando.')
      continue
    }

    // Collect all meals
    const mealsToRecalculate = []
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const mealKeys = ['breakfast', 'mid_morning', 'lunch', 'snack', 'dinner']

    dayKeys.forEach(day => {
      const dayData = dietObj.weeklyPlan[day]
      if (dayData && dayData.meals) {
        mealKeys.forEach(mealKey => {
          const meal = dayData.meals[mealKey]
          if (meal && meal.text && meal.text.trim()) {
            mealsToRecalculate.push({
              day,
              meal: mealKey,
              text: meal.text
            })
          }
        })
      }
    })

    if (mealsToRecalculate.length === 0) {
      console.log('ℹ️ No se encontraron comidas con texto para recalcular.')
      continue
    }

    console.log(`Recalculando macros con BEDCA para ${mealsToRecalculate.length} comidas usando Groq...`)
    
    try {
      const result = await recalculateMacrosWithGroq(mealsToRecalculate)
      if (!result.meals || !Array.isArray(result.meals)) {
        throw new Error('Respuesta de Groq no contiene la lista de comidas esperada')
      }

      console.log('✅ Recálculo completado por la IA. Aplicando cambios...')

      // Apply updated macros back
      result.meals.forEach(updatedMeal => {
        const { day, meal, macros } = updatedMeal
        if (dietObj.weeklyPlan[day] && dietObj.weeklyPlan[day].meals && dietObj.weeklyPlan[day].meals[meal]) {
          const oldMacros = dietObj.weeklyPlan[day].meals[meal].macros || {}
          console.log(`  [${day}][${meal}]:`)
          console.log(`    Antes: ${JSON.stringify(oldMacros)}`)
          console.log(`    Ahora: ${JSON.stringify(macros)}`)
          dietObj.weeklyPlan[day].meals[meal].macros = macros
        }
      })

      // Recalculate dayTotals and diet average
      let totalKcal = 0
      let count = 0

      dayKeys.forEach(day => {
        const dayData = dietObj.weeklyPlan[day]
        if (dayData && dayData.meals) {
          const totals = { protein: 0, carbs: 0, fat: 0, calories: 0 }
          mealKeys.forEach(mealKey => {
            const meal = dayData.meals[mealKey]
            if (meal && meal.macros) {
              totals.protein += meal.macros.protein || 0
              totals.carbs += meal.macros.carbs || 0
              totals.fat += meal.macros.fat || 0
              totals.calories += meal.macros.calories || 0
            }
          })

          // Round values to integers
          totals.protein = Math.round(totals.protein)
          totals.carbs = Math.round(totals.carbs)
          totals.fat = Math.round(totals.fat)
          totals.calories = Math.round(totals.calories)

          dayData.dayTotals = totals
          console.log(`  📊 Total del día [${day}]: ${totals.calories} kcal (P:${totals.protein}g, HC:${totals.carbs}g, G:${totals.fat}g)`)

          if (totals.calories > 0) {
            totalKcal += totals.calories
            count++
          }
        }
      })

      const newAvgCalories = count > 0 ? Math.round(totalKcal / count) : 0
      console.log(`\n⭐ Nuevo promedio de calorías de la dieta: ${newAvgCalories} kcal (Antes: ${row.total_calories || 'N/A'} kcal)`)

      const updatedContent = JSON.stringify(dietObj)
      const now = new Date().toISOString()

      // Save back to DB
      if (type === 'better-sqlite3') {
        db.prepare('UPDATE diets SET content = ?, total_calories = ?, updated_at = ? WHERE id = ?')
          .run(updatedContent, newAvgCalories, now, row.id)
      } else {
        db.prepare('UPDATE diets SET content = ?, total_calories = ?, updated_at = ? WHERE id = ?')
          .run(updatedContent, newAvgCalories, now, row.id)
      }

      console.log('💾 ¡Dieta guardada con éxito en la base de datos!')
    } catch (apiErr) {
      console.error('❌ Error al recalcular los macros de esta dieta:', apiErr.message)
    }
  }

  if (type === 'better-sqlite3') {
    db.close()
  }

  console.log('\n====================================================')
  console.log('🎉 ¡Proceso finalizado! Los macros han sido actualizados.')
  console.log('====================================================')
}

run().catch(console.error)
