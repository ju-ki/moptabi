import { describe, expect, it } from 'vitest';
import { PlanLocationType } from '@shared/planlocation/types';

import { createLocationCipher, LocationCipherError } from '@/lib/locationCipher';
import {
  decryptPlaceId,
  decryptPlanLocationSecret,
  decryptUserLocationSecret,
  encryptPlaceId,
  encryptPlanLocationSecret,
  encryptUserLocationSecret,
} from '@/lib/locationPayload';
import { moveLastSpotTravelTimeToDestination } from '@/services/trip';

const cipher = createLocationCipher(Buffer.alloc(32, 3).toString('base64'));

const destination: PlanLocationType = {
  name: '目的地',
  latitude: 35.0,
  longitude: 139.0,
  time: '18:00',
  locationType: 'DESTINATION',
  transportMethodId: 0,
  transportMethod: 'DEFAULT',
  travelTime: 0,
};

describe('locationPayload', () => {
  describe('UserLocation', () => {
    it('暗号化した値を復号できる', async () => {
      const encryptedData = await encryptUserLocationSecret(cipher, {
        latitude: 35.1,
        longitude: 139.2,
        label: '自宅',
      });

      const secret = await decryptUserLocationSecret(cipher, { encryptedData });

      expect(secret).toEqual({ latitude: 35.1, longitude: 139.2, label: '自宅' });
    });

    it('想定と違う形のJSONは復号エラーにする', async () => {
      const encryptedData = await cipher.encryptJson({ foo: 'bar' });

      await expect(decryptUserLocationSecret(cipher, { encryptedData })).rejects.toThrow(LocationCipherError);
    });
  });

  describe('PlanLocation', () => {
    it('暗号化した値を復号できる', async () => {
      const encryptedData = await encryptPlanLocationSecret(cipher, {
        latitude: 35.1,
        longitude: 139.2,
        travelTime: 20,
        lastSpotId: 'spot_1',
      });

      const secret = await decryptPlanLocationSecret(cipher, { encryptedData });

      expect(secret).toEqual({
        latitude: 35.1,
        longitude: 139.2,
        travelTime: 20,
        lastSpotId: 'spot_1',
      });
    });
  });

  describe('最寄駅', () => {
    it('暗号化したplaceIdを復号できる', async () => {
      const encryptedPlaceId = await encryptPlaceId(cipher, 'station_1');

      expect(await decryptPlaceId(cipher, { encryptedPlaceId })).toBe('station_1');
    });
  });
});

describe('moveLastSpotTravelTimeToDestination', () => {
  it('orderが最大のスポットの移動時間を目的地に移し、スポット側は0にする', () => {
    const spots = [
      { id: 'b', order: 2, travelTime: 20 },
      { id: 'a', order: 1, travelTime: 10 },
    ];

    const result = moveLastSpotTravelTimeToDestination(spots, destination);

    expect(result.spots).toEqual([
      { id: 'b', order: 2, travelTime: 0 },
      { id: 'a', order: 1, travelTime: 10 },
    ]);
    expect(result.destination.travelTime).toBe(20);
    expect(result.lastSpotId).toBe('b');
    // 元の配列は変更しない
    expect(spots[0].travelTime).toBe(20);
  });

  it('orderが同じ場合は配列の後ろのスポットを最後とみなす', () => {
    const result = moveLastSpotTravelTimeToDestination(
      [
        { id: 'a', order: 1, travelTime: 10 },
        { id: 'b', order: 1, travelTime: 20 },
      ],
      destination,
    );

    expect(result.lastSpotId).toBe('b');
    expect(result.destination.travelTime).toBe(20);
  });

  it('スポットが無い場合は目的地の移動時間をそのまま使う', () => {
    const result = moveLastSpotTravelTimeToDestination([], { ...destination, travelTime: 5 });

    expect(result.destination.travelTime).toBe(5);
    expect(result.lastSpotId).toBeUndefined();
  });
});
