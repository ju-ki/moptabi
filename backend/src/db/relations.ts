import { relations } from 'drizzle-orm/relations';

import {
  plan,
  transport,
  planSpot,
  trip,
  tripInfo,
  user,
  userNotification,
  notification,
  wishlist,
  userLocation,
  planLocation,
  planSpotNearestStation,
  planLocationNearestStation,
  spotRoute,
} from './schema';

export const transportRelations = relations(transport, ({ one }) => ({
  plan: one(plan, {
    fields: [transport.planId],
    references: [plan.id],
  }),
}));

export const planRelations = relations(plan, ({ one, many }) => ({
  transports: many(transport),
  spotRoutes: many(spotRoute),
  trip: one(trip, {
    fields: [plan.tripId],
    references: [trip.id],
  }),
  planSpots: many(planSpot),
  planLocations: many(planLocation),
}));

export const planSpotRelations = relations(planSpot, ({ one, many }) => ({
  plan: one(plan, {
    fields: [planSpot.planId],
    references: [plan.id],
  }),
  nearestStations: many(planSpotNearestStation),
  fromSpotRoutes: many(spotRoute, { relationName: 'fromSpotRoute' }),
  toSpotRoutes: many(spotRoute, { relationName: 'toSpotRoute' }),
}));

export const planSpotNearestStationRelations = relations(planSpotNearestStation, ({ one, many }) => ({
  planSpot: one(planSpot, {
    fields: [planSpotNearestStation.planSpotId],
    references: [planSpot.id],
  }),
  fromSpotRoutes: many(spotRoute, { relationName: 'fromNearestStationRoute' }),
  toSpotRoutes: many(spotRoute, { relationName: 'toNearestStationRoute' }),
}));

export const spotRouteRelations = relations(spotRoute, ({ one }) => ({
  plan: one(plan, {
    fields: [spotRoute.planId],
    references: [plan.id],
  }),
  fromPlanSpot: one(planSpot, {
    fields: [spotRoute.fromPlanSpotId],
    references: [planSpot.id],
    relationName: 'fromSpotRoute',
  }),
  toPlanSpot: one(planSpot, {
    fields: [spotRoute.toPlanSpotId],
    references: [planSpot.id],
    relationName: 'toSpotRoute',
  }),
  fromNearestStation: one(planSpotNearestStation, {
    fields: [spotRoute.fromNearestStationId],
    references: [planSpotNearestStation.id],
    relationName: 'fromNearestStationRoute',
  }),
  toNearestStation: one(planSpotNearestStation, {
    fields: [spotRoute.toNearestStationId],
    references: [planSpotNearestStation.id],
    relationName: 'toNearestStationRoute',
  }),
}));

export const tripInfoRelations = relations(tripInfo, ({ one }) => ({
  trip: one(trip, {
    fields: [tripInfo.tripId],
    references: [trip.id],
  }),
}));

export const tripRelations = relations(trip, ({ one, many }) => ({
  tripInfos: many(tripInfo),
  plans: many(plan),
  user: one(user, {
    fields: [trip.userId],
    references: [user.id],
  }),
}));

export const userNotificationRelations = relations(userNotification, ({ one }) => ({
  user: one(user, {
    fields: [userNotification.userId],
    references: [user.id],
  }),
  notification: one(notification, {
    fields: [userNotification.notificationId],
    references: [notification.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  userNotifications: many(userNotification),
  trips: many(trip),
  wishlists: many(wishlist),
  userLocations: many(userLocation),
  planLocations: many(planLocation),
}));

export const notificationRelations = relations(notification, ({ many }) => ({
  userNotifications: many(userNotification),
}));

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(user, {
    fields: [wishlist.userId],
    references: [user.id],
  }),
}));

// UserLocation: マイページでのお気に入り地点登録用
export const userLocationRelations = relations(userLocation, ({ one }) => ({
  user: one(user, {
    fields: [userLocation.userId],
    references: [user.id],
  }),
}));

// PlanLocation: プラン作成時の出発地・目的地履歴用
export const planLocationRelations = relations(planLocation, ({ one, many }) => ({
  user: one(user, {
    fields: [planLocation.userId],
    references: [user.id],
  }),
  plan: one(plan, {
    fields: [planLocation.planId],
    references: [plan.id],
  }),
  nearestStation: many(planLocationNearestStation),
}));

// PlanLocationNearestStation: 出発地・目的地に紐づく最寄駅情報用
export const planLocationNearestStationRelations = relations(planLocationNearestStation, ({ one }) => ({
  planLocation: one(planLocation, {
    fields: [planLocationNearestStation.planLocationId],
    references: [planLocation.id],
  }),
}));
