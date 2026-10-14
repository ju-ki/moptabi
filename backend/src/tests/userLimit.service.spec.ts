import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'bun:test';
import { createDevDb } from '@db';
import { DEFAULT_USER_LIMITS } from '@shared/user/types';

import { getUserLimits } from '@/services/userLimit';

import {
  connectDb as connectPrisma,
  disconnectDb as disconnectPrisma,
  clearUserTestData as clearTestDataForUser,
  createTestUser,
  upsertUserLimit,
} from './db-helper';

const TEST_USER_ID = 'test_user_limit_service';
const OTHER_USER_ID = 'test_other_user_limit_service';
const db = createDevDb(process.env.DATABASE_URL!);

beforeAll(async () => {
  await connectPrisma();
  await clearTestDataForUser(TEST_USER_ID);
  await clearTestDataForUser(OTHER_USER_ID);
  await createTestUser(TEST_USER_ID);
  await createTestUser(OTHER_USER_ID);
});

afterAll(async () => {
  await clearTestDataForUser(TEST_USER_ID);
  await clearTestDataForUser(OTHER_USER_ID);
  await disconnectPrisma();
});

beforeEach(async () => {
  await clearTestDataForUser(TEST_USER_ID);
  await createTestUser(TEST_USER_ID);
});

describe('getUserLimits', () => {
  it('UserLimit登録済みの場合、登録値が返る (B-1)', async () => {
    const customLimits = {
      maxWishlistSpots: 10,
      maxPlans: 3,
      maxSpotsPerDay: 4,
      maxPlanDays: 5,
      maxUserLocations: 1,
    };
    await upsertUserLimit(TEST_USER_ID, customLimits);

    const result = await getUserLimits(db, TEST_USER_ID);

    expect(result).toEqual(customLimits);
  });

  it('UserLimit未登録の場合、DEFAULT_USER_LIMITSが返る (B-2)', async () => {
    const result = await getUserLimits(db, TEST_USER_ID);

    expect(result).toEqual(DEFAULT_USER_LIMITS);
  });

  it('他ユーザーのUserLimitのみ存在する場合、DEFAULT_USER_LIMITSが返る (B-3)', async () => {
    await upsertUserLimit(OTHER_USER_ID, {
      maxWishlistSpots: 50,
      maxPlans: 10,
      maxSpotsPerDay: 8,
      maxPlanDays: 7,
      maxUserLocations: 5,
    });

    const result = await getUserLimits(db, TEST_USER_ID);

    expect(result).toEqual(DEFAULT_USER_LIMITS);
  });
});
