import { describe, expect, it } from 'vitest';

import { TripSchema } from '@/models/trip';

describe('旅行計画スキーマ検証', () => {
  it('planSpotNearestStationsのstationTypeが不正値の場合はスキーマ不一致になる', () => {
    const result = TripSchema.safeParse({
      title: 'No229',
      startDate: '2026-04-21',
      endDate: '2026-04-21',
      tripInfo: [{ date: '2026-04-21', genreId: 1, transportationMethod: 1 }],
      plans: [
        {
          date: '2026-04-21',
          spots: [
            {
              id: 'place_id_1',
              clientRef: 'temp-spot-1',
              location: { name: 'spot1', lat: 35.0, lng: 139.0 },
              stayStart: '10:00',
              stayEnd: '11:00',
              stayDuration: 60,
              transports: { transportMethod: 1, fromType: 'SPOT', toType: 'SPOT' },
              order: 1,
            },
          ],
          departure: {
            name: '出発',
            latitude: 35.0,
            longitude: 139.0,
            address: null,
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
            address: null,
            label: null,
            isDefault: false,
            locationType: 'DESTINATION',
            usageCount: null,
            userLocationId: null,
            planLocationId: null,
            time: '18:00',
          },
          planSpotNearestStations: [
            {
              planSpotRef: 'temp-spot-1',
              placeId: 'station_place_id_1',
              stationType: 'INVALID',
            },
          ],
        },
      ],
    } as any);

    expect(result.success).toBe(false);
  });

  it('旧payloadでspotRoutesが含まれていてもスキーマで受理されること', () => {
    const result = TripSchema.safeParse({
      title: 'No229',
      startDate: '2026-04-21',
      endDate: '2026-04-21',
      tripInfo: [{ date: '2026-04-21', genreId: 1, transportationMethod: 1 }],
      plans: [
        {
          date: '2026-04-21',
          spots: [
            {
              id: 'place_id_1',
              clientRef: 'temp-spot-1',
              location: { name: 'spot1', lat: 35.0, lng: 139.0 },
              stayStart: '10:00',
              stayEnd: '11:00',
              stayDuration: 60,
              transports: { transportMethod: 1, fromType: 'SPOT', toType: 'SPOT' },
              order: 1,
            },
            {
              id: 'place_id_2',
              clientRef: 'temp-spot-2',
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
            address: null,
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
            address: null,
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
