import { describe, expect, it } from 'vitest';
import { TripSchema } from '@shared/trip/schema';
import { TransportMethodEnum, StationTypeSchema } from '@shared/transports/schema';

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
              stayStart: '10:00',
              stayEnd: '11:00',
              stayDuration: 60,
              order: 1,
              travelTime: 15,
              transportMethod: TransportMethodEnum.enum.WALKING,
              transportMethodId: 1,
              nearestStation: {
                placeId: 'station_place_id_1',
                stationType: StationTypeSchema.enum.BUS,
                waitingTime: 5,
                transitTime: 15,
                scheduledDepartureTime: '11:00',
                memo: '乗り換えなし',
              },
            },
          ],
          departure: {
            name: '出発',
            latitude: 35.0,
            longitude: 139.0,
            locationType: 'DEPARTURE',
            time: '09:00',
            transportMethod: TransportMethodEnum.enum.WALKING,
            travelTime: 15,
            transportMethodId: 1,
            nearestStation: {
              placeId: 'station_place_id_2',
              stationType: StationTypeSchema.enum.TRAIN,
              waitingTime: 5,
              transitTime: 15,
              scheduledDepartureTime: '12:00',
              memo: '乗り換えなし',
            },
          },
          destination: {
            name: '到着',
            latitude: 35.1,
            longitude: 139.1,
            locationType: 'DESTINATION',
            time: '18:00',
            transportMethod: TransportMethodEnum.enum.DEFAULT,
            travelTime: 0,
            transportMethodId: 0,
            nearestStation: {
              placeId: 'station_place_id_3',
              stationType: StationTypeSchema.enum.OTHER,
              name: '駅3',
              waitingTime: 5,
              transitTime: 15,
              scheduledDepartureTime: '15:00',
              memo: '乗り換えなし',
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
