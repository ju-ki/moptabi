import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createDevDb } from '@/db';
import { getLocationCipher } from '@/lib/locationCipher';
import { decryptPlaceId, decryptPlanLocationSecret, decryptUserLocationSecret } from '@/lib/locationPayload';
import { countUnencryptedLocations, encryptExistingLocations } from '@/scripts/encrypt-locations';

import {
  clearUserTestData,
  createPlan,
  createPlanLocation,
  createTestUser,
  createTrip,
  createUserLocation,
  eq,
  findNearestStationByUserLocationId,
  findPlanLocationById,
  findUserLocationById,
  planLocationNearestStation,
  planSpot,
} from './db-helper';

const TEST_USER_ID = 'encrypt_locations_test_user';
const db = createDevDb(process.env.DATABASE_URL!);
const cipher = getLocationCipher();

beforeEach(async () => {
  await clearUserTestData(TEST_USER_ID);
  await createTestUser(TEST_USER_ID, 'USER');
});

afterAll(async () => {
  await clearUserTestData(TEST_USER_ID);
});

/** 平文で保存された（No.168 以前の形式の）プランを作る */
const createLegacyPlan = async () => {
  const createdTrip = await createTrip({ title: '一括変換', userId: TEST_USER_ID });
  const createdPlan = await createPlan({ tripId: createdTrip.id, date: '2024-01-01' });
  await db.insert(planSpot).values([
    {
      planId: createdPlan.id,
      spotId: 'enc_spot_first',
      order: 1,
      stayStart: '10:00',
      stayEnd: '11:00',
      stayDuration: 60,
      travelTime: 12,
    },
    {
      planId: createdPlan.id,
      spotId: 'enc_spot_last',
      order: 2,
      stayStart: '12:00',
      stayEnd: '13:00',
      stayDuration: 60,
      travelTime: 34,
    },
  ]);
  const departure = await createPlanLocation({
    userId: TEST_USER_ID,
    name: '自宅',
    latitude: 35.1,
    longitude: 139.1,
    locationType: 'DEPARTURE',
    planId: createdPlan.id,
    travelTime: 8,
  });
  const destination = await createPlanLocation({
    userId: TEST_USER_ID,
    name: '自宅',
    latitude: 35.2,
    longitude: 139.2,
    locationType: 'DESTINATION',
    planId: createdPlan.id,
  });
  await db.insert(planLocationNearestStation).values({
    planLocationId: departure.id,
    placeId: 'legacy_plan_station',
    stationType: 'TRAIN',
  });
  return { planId: createdPlan.id, departure, destination };
};

describe('encrypt-locations（既存データの一括暗号化）', () => {
  it('お気に入り地点の座標・ラベル・最寄駅を暗号化し、平文カラムを空にする', async () => {
    const legacy = await createUserLocation({
      userId: TEST_USER_ID,
      name: '自宅',
      latitude: 35.6895,
      longitude: 139.6917,
      label: '自宅',
      nearestStation: { placeId: 'legacy_station', stationType: 'TRAIN' },
    });

    await encryptExistingLocations(db, cipher, 2);

    const row = await findUserLocationById(legacy.id);
    const station = await findNearestStationByUserLocationId(legacy.id);
    if (!row || !station) throw new Error('データが見つかりません');
    expect(row.latitude).toBeNull();
    expect(row.longitude).toBeNull();
    expect(row.label).toBeNull();
    expect(await decryptUserLocationSecret(cipher, row)).toEqual({
      latitude: 35.6895,
      longitude: 139.6917,
      label: '自宅',
    });
    expect(station.placeId).toBeNull();
    expect(await decryptPlaceId(cipher, station)).toBe('legacy_station');
  });

  it('出発地は座標と移動時間を暗号化し、目的地には最後のスポットの移動時間を移し替える', async () => {
    const { planId, departure, destination } = await createLegacyPlan();

    await encryptExistingLocations(db, cipher, 2);

    const departureRow = await findPlanLocationById(departure.id);
    const destinationRow = await findPlanLocationById(destination.id);
    if (!departureRow || !destinationRow) throw new Error('データが見つかりません');
    expect(departureRow.latitude).toBeNull();
    expect(departureRow.travelTime).toBeNull();
    expect(await decryptPlanLocationSecret(cipher, departureRow)).toMatchObject({
      latitude: 35.1,
      longitude: 139.1,
      travelTime: 8,
    });
    expect(await decryptPlanLocationSecret(cipher, destinationRow)).toMatchObject({
      latitude: 35.2,
      longitude: 139.2,
      travelTime: 34,
      lastSpotId: 'enc_spot_last',
    });

    const spots = await db.select().from(planSpot).where(eq(planSpot.planId, planId));
    expect(spots.find((s) => s.spotId === 'enc_spot_last')?.travelTime).toBe(0);
    expect(spots.find((s) => s.spotId === 'enc_spot_first')?.travelTime).toBe(12);

    const [station] = await db
      .select()
      .from(planLocationNearestStation)
      .where(eq(planLocationNearestStation.planLocationId, departure.id));
    expect(station.placeId).toBeNull();
    expect(await decryptPlaceId(cipher, station)).toBe('legacy_plan_station');
  });

  it('2回実行しても値が壊れず、残り件数は0になる', async () => {
    const { planId, destination } = await createLegacyPlan();

    await encryptExistingLocations(db, cipher);
    const second = await encryptExistingLocations(db, cipher);

    expect(second).toEqual({
      userLocation: 0,
      userLocationNearestStation: 0,
      planLocation: 0,
      planLocationNearestStation: 0,
    });
    expect(await countUnencryptedLocations(db)).toEqual(second);

    const destinationRow = await findPlanLocationById(destination.id);
    if (!destinationRow) throw new Error('データが見つかりません');
    expect((await decryptPlanLocationSecret(cipher, destinationRow)).travelTime).toBe(34);
    const spots = await db.select().from(planSpot).where(eq(planSpot.planId, planId));
    expect(spots.find((s) => s.spotId === 'enc_spot_first')?.travelTime).toBe(12);
  });
});
