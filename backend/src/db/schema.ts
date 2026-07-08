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
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notificationType = pgEnum('NotificationType', ['SYSTEM', 'INFO']);
export const roleType = pgEnum('RoleType', ['ADMIN', 'USER', 'GUEST']);
export const transportNodeType = pgEnum('TransportNodeType', ['DEPARTURE', 'DESTINATION', 'SPOT']);
// 地点の種別（出発地、目的地、または両方）
export const locationType = pgEnum('LocationType', ['DEPARTURE', 'DESTINATION', 'SPOT']);
export const stationType = pgEnum('StationType', ['BUS', 'TRAIN', 'OTHER']);

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
      table.userId.asc().nullsLast().op('text_ops'),
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

export const userLocation = pgTable(
  'UserLocation',
  {
    id: serial().primaryKey().notNull(),
    userId: varchar({ length: 255 }).notNull(),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    name: varchar({ length: 255 }),
    label: varchar({ length: 255 }),
    usageCount: integer().default(0).notNull(),
    isDefault: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'string' })
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'UserLocation_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const plan = pgTable(
  'Plan',
  {
    id: serial().primaryKey().notNull(),
    tripId: integer().notNull(),
    date: varchar({ length: 10 }).notNull(),
    memo: text(),
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
    stayDuration: integer().notNull(),
  },
  (table) => [
    uniqueIndex('PlanSpot_idx1').on(table.planId, table.spotId),
    foreignKey({
      columns: [table.planId],
      foreignColumns: [plan.id],
      name: 'PlanSpot_planId_fkey',
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
  ],
);

export const nearestStation = pgTable('NearestStation', {
  id: serial().primaryKey().notNull(),
  spotId: text(),
  name: varchar({ length: 255 }).notNull(),
  walkingTime: integer().notNull(),
  latitude: doublePrecision().notNull(),
  longitude: doublePrecision().notNull(),
});

export const planSpotNearestStation = pgTable(
  'PlanSpotNearestStation',
  {
    id: serial().primaryKey().notNull(),
    planSpotId: integer().notNull(),
    placeId: text().notNull(),
    stationType: stationType().notNull(),
    transitTime: integer(),
    scheduledDepartureTime: varchar({ length: 5 }),
    memo: text(),
  },
  (table) => [
    uniqueIndex('PlanSpotNearestStation_planSpotId_key').on(table.planSpotId),
    foreignKey({
      columns: [table.planSpotId],
      foreignColumns: [planSpot.id],
      name: 'PlanSpotNearestStation_planSpotId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

/**
 * PlanLocationNearestStation: 出発地・目的地に紐づく最寄駅情報
 * - PlanLocationテーブルに紐づく最寄駅情報を管理
 * - 1つのPlanLocationに対して最大1つの最寄駅を設定可能
 * - 駅の詳細情報（名前、歩行時間、座標）はDBに保存しない（Google Maps Platform利用規約 No.230準拠）
 */
export const planLocationNearestStation = pgTable(
  'PlanLocationNearestStation',
  {
    id: serial().primaryKey().notNull(),
    planLocationId: integer().notNull(),
    placeId: text().notNull(),
    stationType: stationType().notNull(),
    transitTime: integer(),
    scheduledDepartureTime: varchar({ length: 5 }),
    memo: text(),
  },
  (table) => [
    uniqueIndex('PlanLocationNearestStation_planLocationId_key').on(table.planLocationId),
    foreignKey({
      columns: [table.planLocationId],
      foreignColumns: [planLocation.id],
      name: 'PlanLocationNearestStation_planLocationId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
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

/**
 * PlanLocation: プラン作成時の出発地・目的地履歴用テーブル
 * - 従来のSpotテーブルから分離して管理
 * - 履歴として扱うため、UserLocationを編集しても影響なし
 */
export const planLocation = pgTable(
  'PlanLocation',
  {
    id: serial().primaryKey().notNull(),
    userId: varchar({ length: 255 }).notNull(),
    // 地点の名前: 任意で設定、未入力の場合は「日付_出発地」など
    name: varchar({ length: 100 }).notNull(),
    // 位置情報
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    // 出発時間または到着時間（HH:MM）
    time: varchar('time', { length: 5 }).notNull(),
    // 地点の種別: DEPARTURE（出発地）またはDESTINATION（目的地）
    locationType: locationType().notNull(),
    // 関連するPlanのID
    planId: integer().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'string' })
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
  },
  (table) => [
    uniqueIndex('PlanLocation_idx1').on(table.planId, table.locationType),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'PlanLocation_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.planId],
      foreignColumns: [plan.id],
      name: 'PlanLocation_planId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);
