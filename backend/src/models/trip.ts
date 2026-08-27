import { z } from '@hono/zod-openapi';

import { LocationTypeEnum } from './planLocation';

const StationTypeSchema = z.enum(['BUS', 'TRAIN', 'OTHER']);
const TimeSchema = z.string();
const LocationNearestStationSchema = z.object({
  placeId: z.string().min(1, { message: 'placeIdは必須です' }),
  stationType: StationTypeSchema,
  transitTime: z.number().int().min(0).optional(),
  scheduledDepartureTime: TimeSchema.optional(),
  transitMemo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
  memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
});

const DepartureAndDestinationSchema = z.object({
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().nullable(),
  isDefault: z.boolean(),
  locationType: LocationTypeEnum,
  usageCount: z.number().nullable(),
  userLocationId: z.number().nullable(),
  planLocationId: z.number().nullable(),
  time: TimeSchema.optional(),
  nearestStation: LocationNearestStationSchema.nullable().optional(),
});

const PlanSpotNearestStationSchema = z.object({
  planSpotRef: z.string().min(1, { message: 'planSpotRefは必須です' }),
  placeId: z.string().min(1, { message: 'placeIdは必須です' }),
  stationType: StationTypeSchema,
  transitTime: z.number().int().min(0).optional(),
  scheduledDepartureTime: TimeSchema.optional(),
  transitMemo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
  memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
});

export type DepartureAndDestinationType = z.infer<typeof DepartureAndDestinationSchema>;

const TripDetailSpotSchema = z.object({
  id: z.string(),
  stayStart: z.string(),
  stayEnd: z.string(),
  stayDuration: z.number().int().min(0),
  memo: z.string().optional(),
  order: z.number(),
  nearestStation: z
    .object({
      placeId: z.string(),
      stationType: StationTypeSchema,
      transitTime: z.number().int().min(0).optional(),
      transitMemo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
      scheduledDepartureTime: TimeSchema.optional(),
      memo: z.string().optional(),
    })
    .nullable(),
});

export type TripDetailSpotType = z.infer<typeof TripDetailSpotSchema>;

const TripDetailPlanSchema = z.object({
  date: z.string(),
  memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
  spots: z.array(TripDetailSpotSchema),
  departure: DepartureAndDestinationSchema,
  destination: DepartureAndDestinationSchema,
});

export const TripDetailResponseSchema = z.object({
  title: z.string(),
  imageUrl: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  plans: z.array(TripDetailPlanSchema),
});

export type TripDetailResponseType = z.infer<typeof TripDetailResponseSchema>;

export type { TripType as TripContractType } from '@shared/trip/types';
