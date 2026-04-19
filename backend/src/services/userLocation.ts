import { Context } from 'hono';
import { eq, and, desc, lt, inArray } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';

import { db, userLocation } from '@/db';
import { getUserId } from '@/middleware/auth';
import { CreateUserLocationSchema, MAX_USER_LOCATIONS, UpdateUserLocationSchema } from '@/models/userLocation';

export const getUserLocationList = async (c: Context) => {
  const userId = getUserId(c);

  const userLocationList = await db.query.userLocation.findMany({
    where: eq(userLocation.userId, userId),
    orderBy: desc(userLocation.usageCount),
  });

  return userLocationList;
};

export const createUserLocation = async (c: Context) => {
  const userId = getUserId(c);

  const body = await c.req.json();

  if (!body) {
    throw new HTTPException(400, { message: 'Request body is required' });
  }

  const userLocationResult = CreateUserLocationSchema.safeParse(body);

  if (!userLocationResult.success) {
    throw new HTTPException(400, { message: 'Invalid request body' });
  }

  const existingUserLocation = await getUserLocationList(c);

  if (existingUserLocation.length >= MAX_USER_LOCATIONS) {
    throw new HTTPException(400, { message: 'ユーザーのお気に入り地点は最大5件まで登録可能です' });
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

  const [newUserLocation] = await db
    .insert(userLocation)
    .values({
      userId: userId,
      name: userLocationData.name,
      latitude: userLocationData.latitude,
      longitude: userLocationData.longitude,
      address: userLocationData.address,
      label: userLocationData.label,
      isDefault: userLocationData.isDefault,
    })
    .returning();

  return newUserLocation;
};

export const updateUserLocation = async (c: Context) => {
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

  const [updated] = await db
    .update(userLocation)
    .set({
      name: userLocationData.name ?? existingUserLocation.name,
      latitude: userLocationData.latitude ?? existingUserLocation.latitude,
      longitude: userLocationData.longitude ?? existingUserLocation.longitude,
      address: userLocationData.address ?? existingUserLocation.address,
      label: userLocationData.label ?? existingUserLocation.label,
      isDefault: userLocationData.isDefault ?? existingUserLocation.isDefault,
    })
    .where(and(eq(userLocation.id, userLocationId)))
    .returning();

  return updated;
};

export const deleteUserLocation = async (c: Context) => {
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
  return deleted;
};
