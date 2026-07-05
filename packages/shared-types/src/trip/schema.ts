import { z } from 'zod';

export const LocationTypeSchema = z.enum(['DEPARTURE', 'DESTINATION', 'SPOT']);
export const StationTypeSchema = z.enum(['BUS', 'TRAIN', 'OTHER']);

export const OpeningHoursSchema = z.array(
  z.object({
    day: z.string(),
    hours: z.string(),
  }),
);

export const TransportSchema = z.object({
  transportMethod: z.number().min(1, { message: '移動手段を選択してください' }),
  travelTime: z.string().optional(),
  name: z.string().optional(),
  cost: z.number().optional(),
  planId: z.number().optional(),
  toSpotId: z.number().optional(),
  fromSpotId: z.number().optional(),
  fromType: LocationTypeSchema,
  toType: LocationTypeSchema,
});

export const DepartureAndDestinationSchema = z.object({
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().nullable(),
  isDefault: z.boolean(),
  locationType: LocationTypeSchema,
  usageCount: z.number().nullable(),
  userLocationId: z.number().nullable(),
  planLocationId: z.number().nullable(),
  time: z.string().optional(),
  transports: TransportSchema.optional(),
  nearestStation: z
    .object({
      placeId: z.string().min(1),
      stationType: StationTypeSchema,
      transitTime: z.number().int().min(0).optional(),
      scheduledDepartureTime: z.string().optional(),
      memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
      transitMemo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
    })
    .nullable()
    .optional(),
});

const PlanSpotNearestStationSchema = z.object({
  planSpotRef: z.string().min(1, { message: 'planSpotRefは必須です' }),
  placeId: z.string().min(1, { message: 'placeIdは必須です' }),
  stationType: StationTypeSchema,
  transitTime: z.number().int().min(0).optional(),
  scheduledDepartureTime: z.string().optional(),
  memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
  transitMemo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
});

export const TripSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'タイトルは必須です' })
    .max(50, { message: 'タイトルの上限を超えています。50文字以下で入力してください' }),
  imageUrl: z.string().optional(),
  startDate: z.string({ message: '予定日の開始日を入力してください' }),
  endDate: z.string({ message: '予定日の終了日を入力してください' }),
  tripInfo: z.array(
    z.object({
      date: z.string(),
      genreId: z.number().default(1),
      transportationMethod: z.number().min(1, { message: '移動手段を選択してください' }).optional(),
      memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
    }),
  ),
  plans: z.array(
    z.object({
      date: z.string(),
      spots: z.array(
        z.object({
          id: z.string(),
          clientRef: z.string().optional(),
          location: z.object({
            id: z.string().optional(),
            name: z.string().min(1, { message: '観光地名は必須です' }),
            lat: z.number().min(-90).max(90, { message: '緯度は -90 から 90 の範囲で指定してください' }),
            lng: z.number().min(-180).max(180, { message: '経度は -180 から 180 の範囲で指定してください' }),
          }),
          stayStart: z.string(),
          stayEnd: z.string(),
          stayDuration: z.number().int().min(0).optional(),
          memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
          image: z.string().optional(),
          url: z.string().optional(),
          prefecture: z.string().optional(),
          address: z.string().optional(),
          rating: z.number().optional(),
          category: z.array(z.string()).optional(),
          catchphrase: z.string().optional(),
          description: z.string().optional(),
          regularOpeningHours: OpeningHoursSchema.optional(),
          transports: TransportSchema,
          order: z.number().default(0),
          nearestStation: z
            .object({
              placeId: z.string().optional(),
              stationType: StationTypeSchema.optional(),
              name: z.string(),
              walkingTime: z.number(),
              latitude: z.number().min(-90).max(90, { message: '緯度は -90 から 90 の範囲で指定してください' }),
              longitude: z.number().min(-180).max(180, { message: '経度は -180 から 180 の範囲で指定してください' }),
              transitTime: z.number().int().min(0).optional(),
              scheduledDepartureTime: z.string().optional(),
              memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
              transitMemo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
            })
            .optional(),
        }),
      ),
      departure: DepartureAndDestinationSchema,
      destination: DepartureAndDestinationSchema,
      planSpotNearestStations: z.array(PlanSpotNearestStationSchema).optional(),
    }),
  ),
});

const TripDetailSpotSchema = z.object({
  id: z.string(),
  stayStart: z.string(),
  stayEnd: z.string(),
  stayDuration: z.number().int().min(0),
  memo: z.string().optional(),
  order: z.number(),
  transports: TransportSchema,
  nearestStation: z
    .object({
      placeId: z.string(),
      stationType: StationTypeSchema,
      transitTime: z.number().int().min(0).optional(),
      scheduledDepartureTime: z.string().optional(),
      memo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
      transitMemo: z.string().max(1000, { message: 'メモは1000文字以内で記載をお願いします' }).optional(),
    })
    .optional(),
});

const TripDetailPlanSchema = z.object({
  date: z.string(),
  spots: z.array(TripDetailSpotSchema),
  departure: DepartureAndDestinationSchema,
  destination: DepartureAndDestinationSchema,
});

export const TripDetailResponseSchema = z.object({
  title: z.string(),
  imageUrl: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  tripInfo: z.array(
    z.object({
      date: z.string(),
      genreId: z.number(),
      transportationMethod: z.number(),
      memo: z.string().optional(),
    }),
  ),
  plans: z.array(TripDetailPlanSchema),
});
