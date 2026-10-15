import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'bun:test';
import { testClient } from 'hono/testing';
import { DEFAULT_USER_LIMITS } from '@shared/user/types';

import app from '..';
import {
  connectDb as connectPrisma,
  disconnectDb as disconnectPrisma,
  clearUserTestData as clearTestDataForUser,
  createTestUser,
  upsertUserLimit,
} from './db-helper';

const TEST_USER_ID = 'test_user_limit_api';
let currentUserId: string | null = TEST_USER_ID;

function getAuthHeaders(): Record<string, string> {
  if (!currentUserId) return {};
  return { 'X-User-Id': currentUserId };
}

beforeAll(async () => {
  await connectPrisma();
  await clearTestDataForUser(TEST_USER_ID);
  await createTestUser(TEST_USER_ID);
});

afterAll(async () => {
  await clearTestDataForUser(TEST_USER_ID);
  await disconnectPrisma();
});

beforeEach(async () => {
  currentUserId = TEST_USER_ID;
  await clearTestDataForUser(TEST_USER_ID);
  await createTestUser(TEST_USER_ID);
});

describe('GET /api/user/limits', () => {
  const client = testClient(app) as any;

  it('認証済み・UserLimit登録済みの場合、200と登録値を返す (B-6)', async () => {
    const customLimits = {
      maxWishlistSpots: 15,
      maxPlans: 3,
      maxSpotsPerDay: 4,
      maxPlanDays: 2,
      maxUserLocations: 1,
    };
    await upsertUserLimit(TEST_USER_ID, customLimits);

    const response = await client.api.user.limits.$get({}, { headers: getAuthHeaders() });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(customLimits);
  });

  it('認証済み・UserLimit未登録の場合、200と既定値を返す (B-7)', async () => {
    const response = await client.api.user.limits.$get({}, { headers: getAuthHeaders() });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(DEFAULT_USER_LIMITS);
  });

  it('未認証の場合、401を返す (B-8)', async () => {
    currentUserId = null;
    const response = await client.api.user.limits.$get({}, { headers: getAuthHeaders() });

    expect(response.status).toBe(401);
  });
});
