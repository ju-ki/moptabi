import { describe, expect, it } from 'vitest';

import { TripSchema } from '@/models/trip';

describe('旅行計画スキーマ検証', () => {
  it('planSpotNearestStationsのスキーマが一致すること', () => {
    const result = TripSchema.safeParse({
      title: 'No229',
      startDate: '2026-04-21',
      endDate: '2026-04-21',
      plans: [
        {
          date: '2026-04-21',
          memo: 'メモ',
          spots: [
            {
              id: 'place_id_1',
              location: { name: 'spot1', lat: 35.0, lng: 139.0 },
              stayStart: '10:00',
              stayEnd: '11:00',
              stayDuration: 60,
              transports: { transportMethod: 1, fromType: 'SPOT', toType: 'SPOT' },
              order: 1,
              nearestStation: {
                placeId: 'station_place_id_1',
                stationType: 'BUS',
                name: '駅1',
                latitude: 35.0,
                longitude: 139.0,
                transitTime: 15,
                scheduledDepartureTime: '11:00',
                transitMemo: '乗り換えなし',
              },
            },
          ],
          departure: {
            name: '出発',
            latitude: 35.0,
            longitude: 139.0,
            label: null,
            isDefault: false,
            locationType: 'DEPARTURE',
            usageCount: null,
            userLocationId: null,
            planLocationId: null,
            time: '09:00',
            nearestStation: {
              placeId: 'station_place_id_2',
              stationType: 'TRAIN',
              name: '駅2',
              latitude: 35.0,
              longitude: 139.0,
              transitTime: 15,
              scheduledDepartureTime: '12:00',
              transitMemo: '乗り換えなし',
            },
          },
          destination: {
            name: '到着',
            latitude: 35.1,
            longitude: 139.1,
            label: null,
            isDefault: false,
            locationType: 'DESTINATION',
            usageCount: null,
            userLocationId: null,
            planLocationId: null,
            time: '18:00',
            nearestStation: {
              placeId: 'station_place_id_3',
              stationType: 'OTHER',
              name: '駅3',
              latitude: 35.0,
              longitude: 139.0,
              transitTime: 15,
              scheduledDepartureTime: '15:00',
              transitMemo: '乗り換えなし',
            },
          },
        },
      ],
    } as any);

    expect(result.success).toBe(true);
  });

  it('旧payloadでspotRoutesが含まれていてもスキーマで受理されること', () => {
    const result = TripSchema.safeParse({
      title: 'No229',
      startDate: '2026-04-21',
      endDate: '2026-04-21',
      plans: [
        {
          date: '2026-04-21',
          memo: 'メモ',
          spots: [
            {
              id: 'place_id_1',
              location: { name: 'spot1', lat: 35.0, lng: 139.0 },
              stayStart: '10:00',
              stayEnd: '11:00',
              stayDuration: 60,
              transports: { transportMethod: 1, fromType: 'SPOT', toType: 'SPOT' },
              order: 1,
            },
            {
              id: 'place_id_2',
              location: { name: 'spot2', lat: 35.1, lng: 139.1 },
              stayStart: '11:30',
              stayEnd: '12:00',
              stayDuration: 30,
              transports: { transportMethod: 1, fromType: 'SPOT', toType: 'SPOT' },
              order: 2,
            },
          ],
          departure: {
            name: '出発',
            latitude: 35.0,
            longitude: 139.0,
            label: null,
            isDefault: false,
            locationType: 'DEPARTURE',
            usageCount: null,
            userLocationId: null,
            planLocationId: null,
            time: '09:00',
          },
          destination: {
            name: '到着',
            latitude: 35.1,
            longitude: 139.1,
            label: null,
            isDefault: false,
            locationType: 'DESTINATION',
            usageCount: null,
            userLocationId: null,
            planLocationId: null,
            time: '18:00',
          },
          spotRoutes: [
            {
              fromPlanSpotRef: 'temp-spot-1',
              toPlanSpotRef: 'temp-spot-2',
              transportType: 'TRAIN',
              transitTime: 20,
              waitingTime: 5,
            },
          ],
        },
      ],
    } as any);

    expect(result.success).toBe(true);
  });
});
