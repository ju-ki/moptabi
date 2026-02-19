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
} from './schema';

export const transportRelations = relations(transport, ({ one }) => ({
  plan: one(plan, {
    fields: [transport.planId],
    references: [plan.id],
  }),
  planSpot_fromSpotId: one(planSpot, {
    fields: [transport.fromSpotId],
    references: [planSpot.id],
    relationName: 'transport_fromSpotId_planSpot_id',
  }),
  planSpot_toSpotId: one(planSpot, {
    fields: [transport.toSpotId],
    references: [planSpot.id],
    relationName: 'transport_toSpotId_planSpot_id',
  }),
}));

export const planRelations = relations(plan, ({ one, many }) => ({
  transports: many(transport),
  trip: one(trip, {
    fields: [plan.tripId],
    references: [trip.id],
  }),
  planSpots: many(planSpot),
}));

export const planSpotRelations = relations(planSpot, ({ one, many }) => ({
  transports_fromSpotId: many(transport, {
    relationName: 'transport_fromSpotId_planSpot_id',
  }),
  transports_toSpotId: many(transport, {
    relationName: 'transport_toSpotId_planSpot_id',
  }),
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
