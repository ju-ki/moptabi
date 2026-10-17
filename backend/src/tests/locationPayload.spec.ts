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

      const secret = await decryptUserLocationSecret(cipher, {
        encryptedData,
        latitude: null,
        longitude: null,
        label: null,
      });

      expect(secret).toEqual({ latitude: 35.1, longitude: 139.2, label: '自宅' });
    });

    it('暗号化カラムが無い場合は平文カラムの値を使う（一括変換前のデータ）', async () => {
      const secret = await decryptUserLocationSecret(cipher, {
        encryptedData: null,
        latitude: 34.7,
        longitude: 135.5,
        label: '実家',
      });

      expect(secret).toEqual({ latitude: 34.7, longitude: 135.5, label: '実家' });
    });

    it('想定と違う形のJSONは復号エラーにする', async () => {
      const encryptedData = await cipher.encryptJson({ foo: 'bar' });

      await expect(
        decryptUserLocationSecret(cipher, { encryptedData, latitude: null, longitude: null, label: null }),
      ).rejects.toThrow(LocationCipherError);
    });
  });

  describe('PlanLocation', () => {
    it('暗号化した値を復号でき、暗号化済みであることが分かる', async () => {
      const encryptedData = await encryptPlanLocationSecret(cipher, {
        latitude: 35.1,
        longitude: 139.2,
        travelTime: 20,
        lastSpotId: 'spot_1',
      });

      const secret = await decryptPlanLocationSecret(cipher, {
        encryptedData,
        latitude: null,
        longitude: null,
        travelTime: null,
      });

      expect(secret).toEqual({
        latitude: 35.1,
        longitude: 139.2,
        travelTime: 20,
        lastSpotId: 'spot_1',
        isEncrypted: true,
      });
    });

    it('暗号化カラムが無い場合は平文カラムの値を使う（一括変換前のデータ）', async () => {
      const secret = await decryptPlanLocationSecret(cipher, {
        encryptedData: null,
        latitude: 34.7,
        longitude: 135.5,
        travelTime: 15,
      });

      expect(secret).toEqual({ latitude: 34.7, longitude: 135.5, travelTime: 15, isEncrypted: false });
    });
  });

  describe('最寄駅', () => {
    it('暗号化したplaceIdを復号でき、無い場合は平文カラムを使う', async () => {
      const encryptedPlaceId = await encryptPlaceId(cipher, 'station_1');

      expect(await decryptPlaceId(cipher, { encryptedPlaceId, placeId: null })).toBe('station_1');
      expect(await decryptPlaceId(cipher, { encryptedPlaceId: null, placeId: 'legacy' })).toBe('legacy');
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
