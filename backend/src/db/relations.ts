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
  spot,
  wishlist,
  spotMeta,
  nearestStation,
  userLocation,
  planLocation,
} from './schema';

export const transportRelations = relations(transport, ({ one }) => ({
  plan: one(plan, {
    fields: [transport.planId],
    references: [plan.id],
  }),
}));

export const planRelations = relations(plan, ({ one, many }) => ({
  transports: many(transport),
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
  spot: one(spot, {
    fields: [planSpot.spotId],
    references: [spot.id],
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

export const spotRelations = relations(spot, ({ many }) => ({
  planSpots: many(planSpot),
  wishlists: many(wishlist),
  meta: many(spotMeta),
  nearestStations: many(nearestStation),
}));

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(user, {
    fields: [wishlist.userId],
    references: [user.id],
  }),
  spot: one(spot, {
    fields: [wishlist.spotId],
    references: [spot.id],
  }),
}));

export const spotMetaRelations = relations(spotMeta, ({ one }) => ({
  spot: one(spot, {
    fields: [spotMeta.spotId],
    references: [spot.id],
  }),
}));

export const nearestStationRelations = relations(nearestStation, ({ one }) => ({
  spot: one(spot, {
    fields: [nearestStation.spotId],
    references: [spot.id],
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
export const planLocationRelations = relations(planLocation, ({ one }) => ({
  user: one(user, {
    fields: [planLocation.userId],
    references: [user.id],
  }),
  plan: one(plan, {
    fields: [planLocation.planId],
    references: [plan.id],
  }),
}));
