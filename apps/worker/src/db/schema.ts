import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Helper: timestamps ───────────────────────────────────────
const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}

// ─── Users ────────────────────────────────────────────────────
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['admin', 'client'] })
      .notNull()
      .default('client'),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
    roleIdx: index('users_role_idx').on(t.role),
  })
)

// ─── Profiles ─────────────────────────────────────────────────
export const profiles = sqliteTable(
  'profiles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    birthDate: text('birth_date'),
    gender: text('gender', { enum: ['male', 'female', 'other'] }),
    height: real('height'), // cm
    weight: real('weight'), // kg
    goal: text('goal'),
    allergies: text('allergies'),
    observations: text('observations'),
    avatarUrl: text('avatar_url'),
    plan: text('plan', { enum: ['basico', 'pro', 'elite'] }),
    theme: text('theme', { enum: ['light', 'dark'] }).default('light').notNull(),
    ...timestamps,
  },
  (t) => ({
    userIdIdx: index('profiles_user_id_idx').on(t.userId),
  })
)

// ─── Email Verifications ──────────────────────────────────────
export const emailVerifications = sqliteTable(
  'email_verifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    tokenIdx: uniqueIndex('email_verifications_token_idx').on(t.token),
    userIdIdx: index('email_verifications_user_idx').on(t.userId),
  })
)

// ─── Password Resets ──────────────────────────────────────────
export const passwordResets = sqliteTable(
  'password_resets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    tokenIdx: uniqueIndex('password_resets_token_idx').on(t.token),
  })
)

// ─── Refresh Tokens ───────────────────────────────────────────
export const refreshTokens = sqliteTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(t.token),
    userIdIdx: index('refresh_tokens_user_idx').on(t.userId),
  })
)

// ─── Questionnaires ───────────────────────────────────────────
export const questionnaires = sqliteTable(
  'questionnaires',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    objectives: text('objectives').notNull(),
    eatingHabits: text('eating_habits').notNull(),
    restrictions: text('restrictions').notNull(),
    schedule: text('schedule').notNull(),
    sportsExperience: text('sports_experience').notNull(),
    observations: text('observations'),
    submittedAt: text('submitted_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    ...timestamps,
  },
  (t) => ({
    userIdIdx: index('questionnaires_user_id_idx').on(t.userId),
  })
)

// ─── Diets ────────────────────────────────────────────────────
export const diets = sqliteTable(
  'diets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    content: text('content').notNull(), // Rich text / markdown
    totalCalories: integer('total_calories'),
    status: text('status', { enum: ['active', 'archived'] })
      .notNull()
      .default('active'),
    assignedAt: text('assigned_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    ...timestamps,
  },
  (t) => ({
    userIdIdx: index('diets_user_id_idx').on(t.userId),
    statusIdx: index('diets_status_idx').on(t.status),
    userStatusIdx: index('diets_user_status_idx').on(t.userId, t.status),
  })
)


// ─── Workouts ─────────────────────────────────────────────────
export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    daysPerWeek: integer('days_per_week'),
    duration: integer('duration'), // minutes
    level: text('level', { enum: ['beginner', 'intermediate', 'advanced'] }),
    status: text('status', { enum: ['active', 'archived'] })
      .notNull()
      .default('active'),
    assignedAt: text('assigned_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    ...timestamps,
  },
  (t) => ({
    userIdIdx: index('workouts_user_id_idx').on(t.userId),
    statusIdx: index('workouts_status_idx').on(t.status),
  })
)

// ─── Workout Exercises ────────────────────────────────────────
export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sets: integer('sets'),
    reps: text('reps'),
    rest: text('rest'),
    notes: text('notes'),
    order: integer('order').notNull().default(0),
    day: text('day'),
  },
  (t) => ({
    workoutIdx: index('exercises_workout_idx').on(t.workoutId),
  })
)

// ─── Appointments ─────────────────────────────────────────────
export const appointments = sqliteTable(
  'appointments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Consulta nutricional'),
    date: text('date').notNull(), // YYYY-MM-DD
    startTime: text('start_time').notNull(), // HH:MM
    endTime: text('end_time').notNull(), // HH:MM
    status: text('status', { enum: ['pending', 'confirmed', 'cancelled', 'completed'] })
      .notNull()
      .default('pending'),
    notes: text('notes'),
    adminNotes: text('admin_notes'),
    ...timestamps,
  },
  (t) => ({
    userIdIdx: index('appointments_user_id_idx').on(t.userId),
    dateIdx: index('appointments_date_idx').on(t.date),
    statusIdx: index('appointments_status_idx').on(t.status),
    dateTimeIdx: uniqueIndex('appointments_date_time_idx').on(t.date, t.startTime).where(sql`status != 'cancelled'`),
  })
)

// ─── Progress Records ─────────────────────────────────────────
export const progressRecords = sqliteTable(
  'progress_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recordedAt: text('recorded_at').notNull(), // YYYY-MM-DD
    weight: real('weight'),
    bodyFat: real('body_fat'),
    chest: real('chest'),
    waist: real('waist'),
    hips: real('hips'),
    arms: real('arms'),
    thighs: real('thighs'),
    notes: text('notes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdIdx: index('progress_user_id_idx').on(t.userId),
    recordedAtIdx: index('progress_recorded_at_idx').on(t.recordedAt),
  })
)

// ─── Chats ────────────────────────────────────────────────────
export const chats = sqliteTable(
  'chats',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastMessageAt: text('last_message_at'),
    unreadByAdmin: integer('unread_by_admin').notNull().default(0),
    unreadByClient: integer('unread_by_client').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdIdx: uniqueIndex('chats_user_id_idx').on(t.userId),
  })
)

// ─── Messages ─────────────────────────────────────────────────
export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    senderRole: text('sender_role', { enum: ['client', 'admin'] }).notNull(),
    content: text('content').notNull(),
    readAt: text('read_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    chatIdIdx: index('messages_chat_id_idx').on(t.chatId),
    createdAtIdx: index('messages_created_at_idx').on(t.createdAt),
  })
)

// ─── Notifications ────────────────────────────────────────────
export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    relatedId: text('related_id'),
    readAt: text('read_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdIdx: index('notifications_user_id_idx').on(t.userId),
    readAtIdx: index('notifications_read_at_idx').on(t.readAt),
  })
)

// ─── Reviews ──────────────────────────────────────────────────
export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    content: text('content').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdIdx: index('reviews_user_id_idx').on(t.userId),
  })
)

// ─── Weekly Checkins ──────────────────────────────────────────
export const weeklyCheckins = sqliteTable(
  'weekly_checkins',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    weekLabel: text('week_label').notNull(), // "2026-W26" (ISO year-week)
    dietAdherence: integer('diet_adherence').notNull(), // 1-5
    energyLevel: integer('energy_level').notNull(),     // 1-5
    hungerLevel: integer('hunger_level'),               // 1-5 optional
    mood: integer('mood'),                              // 1-5 optional
    notes: text('notes'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdIdx: index('checkins_user_id_idx').on(t.userId),
    weekIdx: index('checkins_week_idx').on(t.weekLabel),
    userWeekIdx: uniqueIndex('checkins_user_week_idx').on(t.userId, t.weekLabel),
  })
)

// ─── Type Exports ─────────────────────────────────────────────
export type UserRow = typeof users.$inferSelect
export type ProfileRow = typeof profiles.$inferSelect
export type QuestionnaireRow = typeof questionnaires.$inferSelect
export type DietRow = typeof diets.$inferSelect
// export type WeeklyMealPlanRow = typeof weeklyMealPlans.$inferSelect
// export type DailyMealRow = typeof dailyMeals.$inferSelect
// export type MealItemRow = typeof mealItems.$inferSelect
export type WorkoutRow = typeof workouts.$inferSelect
export type WorkoutExerciseRow = typeof workoutExercises.$inferSelect
export type AppointmentRow = typeof appointments.$inferSelect
export type ProgressRecordRow = typeof progressRecords.$inferSelect
export type ChatRow = typeof chats.$inferSelect
export type MessageRow = typeof messages.$inferSelect
export type NotificationRow = typeof notifications.$inferSelect
export type ReviewRow = typeof reviews.$inferSelect
export type WeeklyCheckinRow = typeof weeklyCheckins.$inferSelect



