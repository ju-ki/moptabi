import {
  pgTable,
  varchar,
  timestamp,
  text,
  integer,
  foreignKey,
  serial,
  uniqueIndex,
  boolean,
  doublePrecision,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notificationType = pgEnum('NotificationType', ['SYSTEM', 'INFO']);
export const roleType = pgEnum('RoleType', ['ADMIN', 'USER', 'GUEST']);
export const transportNodeType = pgEnum('TransportNodeType', ['DEPARTURE', 'DESTINATION', 'SPOT']);

export const prismaMigrations = pgTable('_prisma_migrations', {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  checksum: varchar({ length: 64 }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'string' }),
  migrationName: varchar('migration_name', { length: 255 }).notNull(),
  logs: text(),
  rolledBackAt: timestamp('rolled_back_at', { withTimezone: true, mode: 'string' }),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  appliedStepsCount: integer('applied_steps_count').default(0).notNull(),
});

export const transport = pgTable(
  'Transport',
  {
    id: serial().primaryKey().notNull(),
    fromType: transportNodeType().notNull(),
    toType: transportNodeType().notNull(),
    travelTime: text(),
    cost: integer(),
    fromSpotId: integer(),
    planId: integer().notNull(),
    toSpotId: integer(),
    transportMethod: integer().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.planId],
      foreignColumns: [plan.id],
      name: 'Transport_planId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.fromSpotId],
      foreignColumns: [planSpot.id],
      name: 'Transport_fromSpotId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.toSpotId],
      foreignColumns: [planSpot.id],
      name: 'Transport_toSpotId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ],
);

export const tripInfo = pgTable(
  'TripInfo',
  {
    id: serial().primaryKey().notNull(),
    tripId: integer().notNull(),
    genreId: integer().notNull(),
    memo: text(),
    date: varchar({ length: 10 }).notNull(),
    transportationMethods: integer().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.tripId],
      foreignColumns: [trip.id],
      name: 'TripInfo_tripId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const userNotification = pgTable(
  'UserNotification',
  {
    id: serial().primaryKey().notNull(),
    userId: varchar({ length: 255 }).notNull(),
    notificationId: integer().notNull(),
    isRead: boolean().default(false).notNull(),
    readAt: timestamp({ precision: 3, mode: 'string' }),
    createdAt: timestamp({ precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('UserNotification_userId_notificationId_key').using(
      'btree',
      table.userId.asc().nullsLast().op('int4_ops'),
      table.notificationId.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'UserNotification_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.notificationId],
      foreignColumns: [notification.id],
      name: 'UserNotification_notificationId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const spot = pgTable('Spot', {
  id: varchar({ length: 255 }).primaryKey().notNull(),
});

export const user = pgTable('User', {
  id: varchar({ length: 255 }).primaryKey().notNull(),
  role: roleType().default('USER').notNull(),
  createdAt: timestamp({ precision: 3, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  email: varchar({ length: 255 }),
  image: varchar({ length: 500 }),
  lastLoginAt: timestamp({ precision: 3, mode: 'string' }),
  name: varchar({ length: 255 }),
});

export const plan = pgTable(
  'Plan',
  {
    id: serial().primaryKey().notNull(),
    tripId: integer().notNull(),
    date: varchar({ length: 10 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.tripId],
      foreignColumns: [trip.id],
      name: 'Plan_tripId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const planSpot = pgTable(
  'PlanSpot',
  {
    id: serial().primaryKey().notNull(),
    planId: integer().notNull(),
    spotId: text().notNull(),
    memo: text(),
    order: integer().default(0).notNull(),
    stayStart: varchar({ length: 5 }).notNull(),
    stayEnd: varchar({ length: 5 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.planId],
      foreignColumns: [plan.id],
      name: 'PlanSpot_planId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.spotId],
      foreignColumns: [spot.id],
      name: 'PlanSpot_spotId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const trip = pgTable(
  'Trip',
  {
    id: serial().primaryKey().notNull(),
    title: varchar({ length: 50 }).notNull(),
    userId: varchar({ length: 255 }).notNull(),
    imageUrl: varchar({ length: 255 }),
    createdAt: timestamp({ precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'string' })
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    startDate: varchar({ length: 10 }).notNull(),
    endDate: varchar({ length: 10 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'Trip_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const wishlist = pgTable(
  'Wishlist',
  {
    id: serial().primaryKey().notNull(),
    spotId: varchar({ length: 255 }).notNull(),
    userId: varchar({ length: 255 }).notNull(),
    memo: text(),
    priority: integer().default(1).notNull(),
    visited: integer().default(0).notNull(),
    visitedAt: timestamp({ precision: 3, mode: 'string' }),
    createdAt: timestamp({ precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'string' })
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
  },
  (table) => [
    uniqueIndex('Wishlist_userId_spotId_key').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops'),
      table.spotId.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'Wishlist_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.spotId],
      foreignColumns: [spot.id],
      name: 'Wishlist_spotId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const spotMeta = pgTable(
  'SpotMeta',
  {
    id: varchar({ length: 255 }).primaryKey().notNull(),
    spotId: text().notNull(),
    name: varchar({ length: 255 }).notNull(),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    image: text(),
    rating: doublePrecision(),
    categories: text().array(),
    catchphrase: text(),
    description: text(),
    openingHours: jsonb(),
    address: varchar({ length: 255 }),
    prefecture: varchar({ length: 50 }),
    url: text(),
  },
  (table) => [
    uniqueIndex('SpotMeta_spotId_key').using('btree', table.spotId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.spotId],
      foreignColumns: [spot.id],
      name: 'SpotMeta_spotId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const nearestStation = pgTable(
  'NearestStation',
  {
    id: serial().primaryKey().notNull(),
    spotId: text(),
    name: varchar({ length: 255 }).notNull(),
    walkingTime: integer().notNull(),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.spotId],
      foreignColumns: [spot.id],
      name: 'NearestStation_spotId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ],
);

export const notification = pgTable('Notification', {
  id: serial().primaryKey().notNull(),
  title: varchar({ length: 100 }).notNull(),
  content: text().notNull(),
  type: notificationType().notNull(),
  publishedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});
