import { Context } from 'hono';
import { eq, and, desc, InferSelectModel } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { buildLimitErrorMessage } from '@shared/user/types';

import { userLocation, AnyDbType, userLocationNearestStation } from '@/db';
import { getUserId } from '@/middleware/auth';
import { CreateUserLocationSchema, UpdateUserLocationSchema } from '@/models/userLocation';
import { getUserLimits } from '@/services/userLimit';
import { getLocationCipher, LocationCipher } from '@/lib/locationCipher';
import {
  decryptPlaceId,
  decryptUserLocationSecret,
  encryptPlaceId,
  encryptUserLocationSecret,
} from '@/lib/locationPayload';

type UserLocationRow = InferSelectModel<typeof userLocation> & {
  nearestStation?: InferSelectModel<typeof userLocationNearestStation> | null;
};

/**
 * DBの行を復号し、従来と同じ形（座標・ラベル・最寄駅のplaceIdを含む）に変換する
 * 暗号化カラムはレスポンスに含めない
 */
const toUserLocationResponse = async (cipher: LocationCipher, row: UserLocationRow) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { encryptedData, nearestStation, ...rest } = row;
  const secret = await decryptUserLocationSecret(cipher, row);

  let decryptedNearestStation = null;
  if (nearestStation) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedPlaceId, ...station } = nearestStation;
    decryptedNearestStation = { ...station, placeId: await decryptPlaceId(cipher, nearestStation) };
  }

  return { ...rest, ...secret, nearestStation: decryptedNearestStation };
};

const findUserLocationWithStation = (db: AnyDbType, userLocationId: number) =>
  db.query.userLocation.findFirst({
    where: (userLocation, { eq }) => eq(userLocation.id, userLocationId),
    with: {
      nearestStation: true,
    },
  });

export const getUserLocationList = async (db: AnyDbType, c: Context) => {
  const userId = getUserId(c);

  const userLocationList = await db.query.userLocation.findMany({
    where: eq(userLocation.userId, userId),
    with: {
      nearestStation: true,
    },
    orderBy: desc(userLocation.usageCount),
  });

  const cipher = getLocationCipher();
  return Promise.all(userLocationList.map((row) => toUserLocationResponse(cipher, row)));
};

export const createUserLocation = async (db: AnyDbType, c: Context) => {
  const userId = getUserId(c);

  const body = await c.req.json();

  if (!body) {
    throw new HTTPException(400, { message: 'Request body is required' });
  }

  const userLocationResult = CreateUserLocationSchema.safeParse(body);

  if (!userLocationResult.success) {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }

  const [existingUserLocation, limits] = await Promise.all([
    getUserLocationList(db, c),
    getUserLimits(db, getUserId(c)),
  ]);

  if (existingUserLocation.length >= limits.maxUserLocations) {
    throw new HTTPException(400, { message: buildLimitErrorMessage('userLocations', limits.maxUserLocations) });
  }

  const userLocationData = userLocationResult.data;

  // すでにデフォルト地点が設定されている場合は、そちらを解除した上で新しく登録された地点のデフォルトフラグを立てる
  const hasDefaultLocation = existingUserLocation.some((loc) => loc.isDefault);
  if (hasDefaultLocation && userLocationData.isDefault) {
    await db
      .update(userLocation)
      .set({ isDefault: false })
      .where(and(eq(userLocation.userId, userId), eq(userLocation.isDefault, true)));
  }

  const cipher = getLocationCipher();
  const [newUserLocation] = await db
    .insert(userLocation)
    .values({
      userId: userId,
      name: userLocationData.name,
      encryptedData: await encryptUserLocationSecret(cipher, {
        latitude: userLocationData.latitude,
        longitude: userLocationData.longitude,
        label: userLocationData.label ?? null,
      }),
      isDefault: userLocationData.isDefault,
    })
    .returning();

  if (userLocationData.nearestStation) {
    await db.insert(userLocationNearestStation).values({
      userLocationId: newUserLocation.id,
      encryptedPlaceId: await encryptPlaceId(cipher, userLocationData.nearestStation.placeId),
      stationType: userLocationData.nearestStation.stationType,
    });
  }

  const createdUserLocation = await findUserLocationWithStation(db, newUserLocation.id);

  return createdUserLocation ? toUserLocationResponse(cipher, createdUserLocation) : undefined;
};

export const updateUserLocation = async (db: AnyDbType, c: Context) => {
  const userId = getUserId(c);

  // パスパラメータからIDを取得
  if (isNaN(Number(c.req.param('id')))) {
    throw new HTTPException(400, { message: 'Invalid user location ID' });
  }
  const userLocationId = Number(c.req.param('id'));

  const body = await c.req.json();

  if (!body) {
    throw new HTTPException(400, { message: 'Request body is required' });
  }

  const userLocationResult = UpdateUserLocationSchema.safeParse(body);

  if (!userLocationResult.success) {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }

  const userLocationData = userLocationResult.data;

  const existingUserLocation = await db.query.userLocation.findFirst({
    where: (userLocation, { and, eq }) => and(eq(userLocation.id, userLocationId), eq(userLocation.userId, userId)),
  });

  if (!existingUserLocation) {
    throw new HTTPException(404, { message: 'User location not found' });
  }

  // isDefaultがtrueの場合、既存のデフォルトを解除
  if (userLocationData.isDefault === true) {
    await db
      .update(userLocation)
      .set({ isDefault: false })
      .where(and(eq(userLocation.userId, userId), eq(userLocation.isDefault, true)));
  }

  // 送られてこなかった項目は既存の値（復号したもの）を使う
  const cipher = getLocationCipher();
  const existingSecret = await decryptUserLocationSecret(cipher, existingUserLocation);

  const [updated] = await db
    .update(userLocation)
    .set({
      name: userLocationData.name ?? existingUserLocation.name,
      encryptedData: await encryptUserLocationSecret(cipher, {
        latitude: userLocationData.latitude ?? existingSecret.latitude,
        longitude: userLocationData.longitude ?? existingSecret.longitude,
        label: userLocationData.label ?? existingSecret.label,
      }),
      // 平文カラムは使わない（一括変換前のデータもここで暗号化に置き換える）
      latitude: null,
      longitude: null,
      label: null,
      isDefault: userLocationData.isDefault ?? existingUserLocation.isDefault,
    })
    .where(and(eq(userLocation.id, userLocationId)))
    .returning();

  if (userLocationData.nearestStation) {
    const encryptedPlaceId = await encryptPlaceId(cipher, userLocationData.nearestStation.placeId);
    await db
      .insert(userLocationNearestStation)
      .values({
        userLocationId: updated.id,
        encryptedPlaceId,
        stationType: userLocationData.nearestStation.stationType,
      })
      .onConflictDoUpdate({
        target: [userLocationNearestStation.userLocationId],
        set: {
          placeId: null,
          encryptedPlaceId,
          stationType: userLocationData.nearestStation.stationType,
        },
      });
  }

  if (userLocationData.nearestStation === null) {
    await db.delete(userLocationNearestStation).where(eq(userLocationNearestStation.userLocationId, updated.id));
  }

  const updatedUserLocation = await findUserLocationWithStation(db, userLocationId);

  return updatedUserLocation ? toUserLocationResponse(cipher, updatedUserLocation) : undefined;
};

export const deleteUserLocation = async (db: AnyDbType, c: Context) => {
  const userId = getUserId(c);

  if (isNaN(Number(c.req.param('id')))) {
    throw new HTTPException(400, { message: 'Invalid user location ID' });
  }

  const userLocationId = Number(c.req.param('id'));

  const existingUserLocation = await db.query.userLocation.findFirst({
    where: (userLocation, { and, eq }) => and(eq(userLocation.id, userLocationId), eq(userLocation.userId, userId)),
  });

  if (!existingUserLocation) {
    throw new HTTPException(404, { message: 'User location not found' });
  }

  const [deleted] = await db
    .delete(userLocation)
    .where(and(eq(userLocation.id, userLocationId)))
    .returning();
  return toUserLocationResponse(getLocationCipher(), deleted);
};
