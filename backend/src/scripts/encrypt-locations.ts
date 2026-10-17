/**
 * No.168: 既存の地点データ（座標・ラベル・移動時間・最寄駅）を一括で暗号化するスクリプト
 *
 * 実行: DATABASE_URL=... LOCATION_ENCRYPTION_KEY=... bun run db:encrypt-locations
 * - encryptedData / encryptedPlaceId が NULL の行だけを処理するので、途中で止まっても再実行で続きから処理できる
 * - 目的地の行は、そのプランの最後のスポットの移動時間を移し替え、同じトランザクションで PlanSpot.travelTime を 0 にする
 * - 出力は件数のみ。座標などの値はログに出さない
 */
import { and, asc, count, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import {
  AnyDbType,
  createDevDb,
  planLocation,
  planLocationNearestStation,
  planSpot,
  userLocation,
  userLocationNearestStation,
} from '@/db';
import { getLocationCipher, LocationCipher } from '@/lib/locationCipher';
import { encryptPlaceId, encryptPlanLocationSecret, encryptUserLocationSecret } from '@/lib/locationPayload';
import { LOCATION_TYPE } from '@/models/planLocation';

type EncryptResult = {
  userLocation: number;
  userLocationNearestStation: number;
  planLocation: number;
  planLocationNearestStation: number;
};

const DEFAULT_BATCH_SIZE = 100;

const encryptUserLocations = async (db: AnyDbType, cipher: LocationCipher, batchSize: number) => {
  let converted = 0;
  for (;;) {
    const rows = await db
      .select()
      .from(userLocation)
      .where(isNull(userLocation.encryptedData))
      .orderBy(asc(userLocation.id))
      .limit(batchSize);
    if (rows.length === 0) return converted;

    for (const row of rows) {
      await db
        .update(userLocation)
        .set({
          encryptedData: await encryptUserLocationSecret(cipher, {
            latitude: row.latitude ?? 0,
            longitude: row.longitude ?? 0,
            label: row.label,
          }),
          latitude: null,
          longitude: null,
          label: null,
        })
        .where(eq(userLocation.id, row.id));
      converted++;
    }
  }
};

const encryptUserLocationNearestStations = async (db: AnyDbType, cipher: LocationCipher, batchSize: number) => {
  let converted = 0;
  for (;;) {
    const rows = await db
      .select()
      .from(userLocationNearestStation)
      .where(and(isNull(userLocationNearestStation.encryptedPlaceId), isNotNull(userLocationNearestStation.placeId)))
      .orderBy(asc(userLocationNearestStation.id))
      .limit(batchSize);
    if (rows.length === 0) return converted;

    for (const row of rows) {
      await db
        .update(userLocationNearestStation)
        .set({ encryptedPlaceId: await encryptPlaceId(cipher, row.placeId ?? ''), placeId: null })
        .where(eq(userLocationNearestStation.id, row.id));
      converted++;
    }
  }
};

const encryptPlanLocations = async (db: AnyDbType, cipher: LocationCipher, batchSize: number) => {
  let converted = 0;
  for (;;) {
    const rows = await db
      .select()
      .from(planLocation)
      .where(isNull(planLocation.encryptedData))
      .orderBy(asc(planLocation.id))
      .limit(batchSize);
    if (rows.length === 0) return converted;

    for (const row of rows) {
      await db.transaction(async (tx) => {
        let travelTime = row.travelTime ?? 0;
        let lastSpotId: string | undefined;

        // 目的地: 最後のスポット（orderが最大、同じならidが大きい方）→ 目的地の移動時間を移し替える
        if (row.locationType === LOCATION_TYPE.DESTINATION) {
          const [lastSpot] = await tx
            .select()
            .from(planSpot)
            .where(eq(planSpot.planId, row.planId))
            .orderBy(desc(planSpot.order), desc(planSpot.id))
            .limit(1);
          if (lastSpot) {
            travelTime = lastSpot.travelTime;
            lastSpotId = lastSpot.spotId;
            await tx.update(planSpot).set({ travelTime: 0 }).where(eq(planSpot.id, lastSpot.id));
          }
        }

        await tx
          .update(planLocation)
          .set({
            encryptedData: await encryptPlanLocationSecret(cipher, {
              latitude: row.latitude ?? 0,
              longitude: row.longitude ?? 0,
              travelTime,
              lastSpotId,
            }),
            latitude: null,
            longitude: null,
            travelTime: null,
          })
          .where(eq(planLocation.id, row.id));
      });
      converted++;
    }
  }
};

const encryptPlanLocationNearestStations = async (db: AnyDbType, cipher: LocationCipher, batchSize: number) => {
  let converted = 0;
  for (;;) {
    const rows = await db
      .select()
      .from(planLocationNearestStation)
      .where(and(isNull(planLocationNearestStation.encryptedPlaceId), isNotNull(planLocationNearestStation.placeId)))
      .orderBy(asc(planLocationNearestStation.id))
      .limit(batchSize);
    if (rows.length === 0) return converted;

    for (const row of rows) {
      await db
        .update(planLocationNearestStation)
        .set({ encryptedPlaceId: await encryptPlaceId(cipher, row.placeId ?? ''), placeId: null })
        .where(eq(planLocationNearestStation.id, row.id));
      converted++;
    }
  }
};

/**
 * 暗号化されていない行を一括で暗号化する
 * @returns テーブルごとの変換件数
 */
export const encryptExistingLocations = async (
  db: AnyDbType,
  cipher: LocationCipher,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<EncryptResult> => ({
  userLocation: await encryptUserLocations(db, cipher, batchSize),
  userLocationNearestStation: await encryptUserLocationNearestStations(db, cipher, batchSize),
  planLocation: await encryptPlanLocations(db, cipher, batchSize),
  planLocationNearestStation: await encryptPlanLocationNearestStations(db, cipher, batchSize),
});

/**
 * 暗号化されていない行の残り件数
 */
export const countUnencryptedLocations = async (db: AnyDbType): Promise<EncryptResult> => {
  const [[ul], [uls], [pl], [pls]] = await Promise.all([
    db.select({ count: count() }).from(userLocation).where(isNull(userLocation.encryptedData)),
    db
      .select({ count: count() })
      .from(userLocationNearestStation)
      .where(and(isNull(userLocationNearestStation.encryptedPlaceId), isNotNull(userLocationNearestStation.placeId))),
    db.select({ count: count() }).from(planLocation).where(isNull(planLocation.encryptedData)),
    db
      .select({ count: count() })
      .from(planLocationNearestStation)
      .where(and(isNull(planLocationNearestStation.encryptedPlaceId), isNotNull(planLocationNearestStation.placeId))),
  ]);
  return {
    userLocation: ul.count,
    userLocationNearestStation: uls.count,
    planLocation: pl.count,
    planLocationNearestStation: pls.count,
  };
};

if (import.meta.main) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const db = createDevDb(databaseUrl);
  const converted = await encryptExistingLocations(db, getLocationCipher());
  const remaining = await countUnencryptedLocations(db);
  console.log('変換件数:', converted);
  console.log('残り件数:', remaining);
  process.exit(Object.values(remaining).every((value) => value === 0) ? 0 : 1);
}
