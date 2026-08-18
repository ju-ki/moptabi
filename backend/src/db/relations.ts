import { relations } from 'drizzle-orm/relations';

import {
  plan,
  planSpot,
  trip,
  user,
  userNotification,
  notification,
  wishlist,
  userLocation,
  planLocation,
  planSpotNearestStation,
  planLocationNearestStation,
} from './schema';

export const planRelations = relations(plan, ({ one, many }) => ({
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
}));

export const planSpotNearestStationRelations = relations(planSpotNearestStation, ({ one }) => ({
  planSpot: one(planSpot, {
    fields: [planSpotNearestStation.planSpotId],
    references: [planSpot.id],
  }),
}));

export const tripRelations = relations(trip, ({ one, many }) => ({
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
