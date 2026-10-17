import { beforeAll, beforeEach, afterAll, describe, expect, it, setSystemTime } from 'bun:test';
import { testClient } from 'hono/testing';
import { TripSchema } from '@shared/trip/schema';

import { createDevDb } from '@/db';
import { getLocationCipher } from '@/lib/locationCipher';
import { decryptPlaceId, decryptPlanLocationSecret } from '@/lib/locationPayload';

import app from '..';
import {
  eq,
  plan,
  planLocation,
  planLocationNearestStation,
  planSpot,
  planSpotNearestStation,
  trip,
  clearAllTestData as clearTestData,
  createTestUser,
  clearAllTestData,
} from './db-helper';
import { createAuthHeaders, createSpotData, TEST_USER_ID } from './test-client';
import { mockPlanData, mockPlanDataWithNearestStation, mockTripData, spotId } from './libs/data';

let currentUserId: string | null = TEST_USER_ID;
const db = createDevDb(process.env.DATABASE_URL!);

beforeAll(async () => {
  await clearAllTestData();
  await createTestUser('trip_service', 'ADMIN');
});

afterAll(async () => {
  await clearAllTestData();
});

beforeEach(async () => {
  // 現在日を一ヶ月前にする
  const prevDate = new Date('2023-12-01T12:00:00Z');
  setSystemTime(prevDate);
  currentUserId = 'trip_service';
  await createTestUser('trip_service', 'ADMIN');
});

describe('旅行計画サービス', () => {
  const client = testClient(app) as any;

  // -- POST: 旅行計画の作成 --
  describe('POST /trips', () => {
    it('新しい旅行計画を作成できること', async () => {
      const result = TripSchema.safeParse({
        ...mockTripData,
        plans: mockPlanData,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const res = await client.api.trips.create.$post(
          {
            json: {
              ...mockTripData,
              plans: mockPlanData,
            },
          },
          { headers: createAuthHeaders('trip_service') },
        );
        expect(res.status).toBe(201);
        const createdTrip = await res.json();
        // 作成した旅行計画のidが返却されることを確認
        expect(createdTrip).toHaveProperty('id');
        // 返却されたレスポンスに関係のない値が入っていないことの確認
        expect(createdTrip).not.toHaveProperty('title');
      }
    });

    it('nearestStationや元transportの情報が保存されること', async () => {
      const payloadWithLocationStations = {
        ...mockTripData,
        plans: mockPlanDataWithNearestStation,
      };

      const res = await client.api.trips.create.$post(
        { json: payloadWithLocationStations as any },
        { headers: createAuthHeaders('trip_service') },
      );
      expect(res.status).toBe(201);

      const created = await res.json();
      const createdPlans = await db.select().from(plan).where(eq(plan.tripId, created.id));
      expect(createdPlans.length).toBe(2);

      const createdPlanLocations = await db
        .select()
        .from(planLocation)
        .where(eq(planLocation.planId, createdPlans[0].id));
      const departure = createdPlanLocations.find((l) => l.locationType === 'DEPARTURE');
      const destination = createdPlanLocations.find((l) => l.locationType === 'DESTINATION');
      const createdPlanSpots = await db.select().from(planSpot).where(eq(planSpot.planId, createdPlans[0].id));
      if (!departure || !destination) {
        throw new Error('出発地・目的地が作成されていません');
      }
      const cipher = getLocationCipher();
      const departureSecret = await decryptPlanLocationSecret(cipher, departure);
      const destinationSecret = await decryptPlanLocationSecret(cipher, destination);
      const requestSpots = mockPlanDataWithNearestStation[0].spots;
      const lastRequestSpot = requestSpots.reduce((last, s) => (s.order > last.order ? s : last), requestSpots[0]);

      // 出発地の移動情報（移動時間は暗号化して保存される）
      expect(departure.transportMethodId).toBe(mockPlanDataWithNearestStation[0].departure.transportMethodId);
      expect(departure.travelTime).toBeNull();
      expect(departureSecret.travelTime).toBe(mockPlanDataWithNearestStation[0].departure.travelTime);

      // スポットの移動情報（最後のスポットの移動時間は目的地側に移して 0 で保存される）
      for (const requestSpot of requestSpots) {
        const createdSpot = createdPlanSpots.find((s) => s.spotId === requestSpot.id);
        expect(createdSpot?.transportMethodId).toBe(requestSpot.transportMethodId);
        expect(createdSpot?.travelTime).toBe(requestSpot === lastRequestSpot ? 0 : requestSpot.travelTime);
      }

      // 目的地の移動情報（最後のスポット → 目的地の移動時間を暗号化して持つ）
      expect(destination.transportMethodId).toBe(mockPlanDataWithNearestStation[0].destination.transportMethodId);
      expect(destination.travelTime).toBeNull();
      expect(destinationSecret.travelTime).toBe(lastRequestSpot.travelTime);

      const createdLocationStations = await db
        .select()
        .from(planLocationNearestStation)
        .where(
          departure && destination
            ? eq(planLocationNearestStation.planLocationId, departure.id)
            : eq(planLocationNearestStation.planLocationId, -1),
        );

      const createdDestinationStations = await db
        .select()
        .from(planLocationNearestStation)
        .where(
          destination
            ? eq(planLocationNearestStation.planLocationId, destination.id)
            : eq(planLocationNearestStation.planLocationId, -1),
        );
      const createdPlanSpotNearestStations = await db
        .select()
        .from(planSpotNearestStation)
        .where(eq(planSpotNearestStation.planSpotId, createdPlanSpots[0].id));
      if (
        !mockPlanDataWithNearestStation[0].departure.nearestStation ||
        !mockPlanDataWithNearestStation[0].spots[0].nearestStation ||
        !mockPlanDataWithNearestStation[0].destination.nearestStation
      ) {
        throw new Error('nearestStationが設定されていることを前提としているため、テストデータを確認してください。');
      }

      // 出発地の最寄駅情報（placeId は暗号化して保存される）
      expect(createdLocationStations[0]?.placeId).toBeNull();
      expect(await decryptPlaceId(cipher, createdLocationStations[0])).toBe(
        mockPlanDataWithNearestStation[0].departure.nearestStation.placeId,
      );
      expect(createdLocationStations[0]?.stationType).toBe(
        mockPlanDataWithNearestStation[0].departure.nearestStation.stationType,
      );
      expect(createdLocationStations[0]?.transitTime).toBe(
        mockPlanDataWithNearestStation[0].departure.nearestStation.transitTime,
      );
      expect(createdLocationStations[0]?.scheduledDepartureTime).toBe(
        mockPlanDataWithNearestStation[0].departure.nearestStation.scheduledDepartureTime ?? null,
      );
      expect(createdLocationStations[0]?.memo).toBe(
        mockPlanDataWithNearestStation[0].departure.nearestStation.memo ?? null,
      );

      // スポットの最寄駅情報
      expect(createdPlanSpotNearestStations.length).toBe(1);
      expect(createdPlanSpotNearestStations[0]?.placeId).toBe(
        mockPlanDataWithNearestStation[0].spots[0].nearestStation.placeId,
      );
      expect(createdPlanSpotNearestStations[0]?.stationType).toBe(
        mockPlanDataWithNearestStation[0].spots[0].nearestStation.stationType,
      );
      expect(createdPlanSpotNearestStations[0]?.transitTime).toBe(
        mockPlanDataWithNearestStation[0].spots[0].nearestStation.transitTime,
      );
      expect(createdPlanSpotNearestStations[0]?.scheduledDepartureTime).toBe(
        mockPlanDataWithNearestStation[0].spots[0].nearestStation.scheduledDepartureTime ?? null,
      );
      expect(createdPlanSpotNearestStations[0]?.memo).toBe(
        mockPlanDataWithNearestStation[0].spots[0].nearestStation.memo ?? null,
      );

      // 目的地の最寄駅情報
      expect(createdDestinationStations.length).toBe(1);
      expect(createdDestinationStations[0]?.placeId).toBeNull();
      expect(await decryptPlaceId(cipher, createdDestinationStations[0])).toBe(
        mockPlanDataWithNearestStation[0].destination.nearestStation.placeId,
      );
      expect(createdDestinationStations[0]?.stationType).toBe(
        mockPlanDataWithNearestStation[0].destination.nearestStation.stationType,
      );
      expect(createdDestinationStations[0]?.transitTime).toBe(
        mockPlanDataWithNearestStation[0].destination.nearestStation.transitTime,
      );
      expect(createdDestinationStations[0]?.scheduledDepartureTime).toBe(
        mockPlanDataWithNearestStation[0].destination.nearestStation.scheduledDepartureTime ?? null,
      );
      expect(createdDestinationStations[0]?.memo).toBe(
        mockPlanDataWithNearestStation[0].destination.nearestStation.memo ?? null,
      );
    });
  });

  // -- PATCH: 旅行計画の更新 --
  describe('PATCH /trips/:id', () => {
    it('既存の旅行計画を更新できること', async () => {
      await clearAllTestData();
      await createTestUser('trip_service', 'ADMIN');
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const result = await createdTrip.json();

      // 前提としてIDはあること
      expect(result).toHaveProperty('id');

      // 更新用のデータ
      const updatedData = {
        ...structuredClone(mockTripData),
        id: result.id,
        title: '更新後の旅行タイトル',
        plans: structuredClone(mockPlanData),
      };

      updatedData.plans[0].departure.name = 'updatedDeparture';
      updatedData.plans[0].destination.name = 'updatedDestination';
      updatedData.plans[0].spots[0].stayStart = '11:00';
      updatedData.plans[0].spots[0].stayEnd = '11:30';
      updatedData.plans[0].spots[0].stayDuration = 30;

      // spotsの2個目を削除する
      updatedData.plans[0].spots.pop();

      // 新しく3個目のスポットを新規追加する
      updatedData.plans[0].spots.push({
        ...mockPlanData[0].spots[0],
        id: spotId('new_spot_1'),
        stayStart: '13:00',
        stayEnd: '14:30',
        stayDuration: 90,
      });

      const res = await client.api.trips[result.id].$patch(
        {
          json: updatedData,
        },
        { headers: createAuthHeaders('trip_service') },
      );

      expect(res.status).toBe(200);
      const updatedTrip = await res.json();
      expect(updatedTrip).toMatchObject({ id: result.id });

      // 返却されたIDを元に詳細取得を行なって、更新内容が反映されていることを確認
      const detailRes = await client.api.trips[result.id].$get({}, { headers: createAuthHeaders('trip_service') });
      expect(detailRes.status).toBe(200);
      const tripDetail = await detailRes.json();
      expect(tripDetail.title).toEqual('更新後の旅行タイトル');
      // 更新していない項目は変わっていないこと
      expect(tripDetail.startDate).toEqual(mockTripData.startDate);
      expect(tripDetail.endDate).toEqual(mockTripData.endDate);

      // 出発地目的地の確認
      expect(tripDetail.plans[0].departure.name).toEqual('updatedDeparture');
      expect(tripDetail.plans[0].destination.name).toEqual('updatedDestination');
      expect(tripDetail.plans[0].departure.time).toEqual(mockPlanData[0].departure.time);
      expect(tripDetail.plans[0].destination.time).toEqual(mockPlanData[0].destination.time);
      // スポット情報の更新の確認
      expect(tripDetail.plans[0].spots[0].stayStart).toEqual('11:00');
      expect(tripDetail.plans[0].spots[0].stayEnd).toEqual('11:30');
      expect(tripDetail.plans[0].spots[0].stayDuration).toEqual(30);
      // 削除→追加とやったので結果としてスポット数が変わっていないこと
      expect(tripDetail.plans[0].spots).toHaveLength(2);
      expect(tripDetail.plans[0].spots[1].stayStart).toEqual('13:00');
      expect(tripDetail.plans[0].spots[1].stayEnd).toEqual('14:30');
      expect(tripDetail.plans[0].spots[1].stayDuration).toEqual(90);
    });

    it('日程を減らした場合に現状分のプランが削除されること', async () => {
      await clearAllTestData();
      await createTestUser('trip_service', 'ADMIN');
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            plans: mockPlanData,
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const result = await createdTrip.json();

      // 前提としてIDはあること
      expect(result).toHaveProperty('id');

      // 更新用のデータ
      const updatedData = {
        ...structuredClone(mockTripData),
        id: result.id,
        endDate: '2024-01-01',
        plans: [structuredClone(mockPlanData[0])],
      };

      const res = await client.api.trips[result.id].$patch(
        {
          json: updatedData,
        },
        { headers: createAuthHeaders('trip_service') },
      );

      expect(res.status).toBe(200);
      const updatedTrip = await res.json();
      expect(updatedTrip).toMatchObject({ id: result.id });

      // 返却されたIDを元に詳細取得を行なって、更新内容が反映されていることを確認
      const detailRes = await client.api.trips[result.id].$get({}, { headers: createAuthHeaders('trip_service') });
      expect(detailRes.status).toBe(200);
      const tripDetail = await detailRes.json();
      expect(tripDetail.title).toEqual(mockTripData.title);
      expect(tripDetail.startDate).toEqual(mockTripData.startDate);
      expect(tripDetail.endDate).toEqual('2024-01-01');
      expect(tripDetail.plans).toHaveLength(1); // 1日分のため
    });

    it('他人の旅行計画は更新できないこと', async () => {
      await clearAllTestData();
      await createTestUser('trip_service', 'USER');
      await createTestUser('trip_service2', 'USER');
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const result = await createdTrip.json();

      // 前提としてIDはあること
      expect(result).toHaveProperty('id');

      // 更新用のデータ
      const updatedData = {
        ...structuredClone(mockTripData),
        id: result.id,
        title: '更新後の旅行タイトル',
        plans: structuredClone(mockPlanData),
      };

      updatedData.plans[0].departure.name = 'updatedDeparture';
      updatedData.plans[0].destination.name = 'updatedDestination';
      updatedData.plans[0].spots[0].stayStart = '11:00';
      updatedData.plans[0].spots[0].stayEnd = '11:30';
      updatedData.plans[0].spots[0].stayDuration = 30;

      // spotsの2個目を削除する
      updatedData.plans[0].spots.pop();

      // 新しく3個目のスポットを新規追加する
      updatedData.plans[0].spots.push({
        ...mockPlanData[0].spots[0],
        id: spotId('new_spot_1'),
        stayStart: '13:00',
        stayEnd: '14:30',
        stayDuration: 90,
      });

      const res = await client.api.trips[result.id].$patch(
        {
          json: updatedData,
        },
        { headers: createAuthHeaders('trip_service2') },
      );

      expect(res.status).toBe(403);

      // 返却されたIDを元に詳細取得を行なって、更新内容が反映されていないことを確認
      const detailRes = await client.api.trips[result.id].$get({}, { headers: createAuthHeaders('trip_service') });
      expect(detailRes.status).toBe(200);
      const tripDetail = await detailRes.json();
      expect(tripDetail.title).toEqual(mockTripData.title);
      // 更新していない項目は変わっていないこと
      expect(tripDetail.startDate).toEqual(mockTripData.startDate);
      expect(tripDetail.endDate).toEqual(mockTripData.endDate);

      // 出発地目的地の確認
      expect(tripDetail.plans[0].departure.time).toEqual(mockPlanData[0].departure.time);
      expect(tripDetail.plans[0].destination.time).toEqual(mockPlanData[0].destination.time);
    });

    it('日程を減らした場合に現状分のプランが削除されること', async () => {
      await clearAllTestData();
      await createTestUser('trip_service', 'ADMIN');
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...mockTripData,
            plans: mockPlanData,
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const result = await createdTrip.json();

      // 前提としてIDはあること
      expect(result).toHaveProperty('id');

      // 更新用のデータ
      const updatedData = {
        ...structuredClone(mockTripData),
        id: result.id,
        endDate: '2024-01-01',
        plans: [structuredClone(mockPlanData[0])],
      };

      const res = await client.api.trips[result.id].$patch(
        {
          json: updatedData,
        },
        { headers: createAuthHeaders('trip_service') },
      );

      expect(res.status).toBe(200);
      const updatedTrip = await res.json();
      expect(updatedTrip).toMatchObject({ id: result.id });

      // 返却されたIDを元に詳細取得を行なって、更新内容が反映されていることを確認
      const detailRes = await client.api.trips[result.id].$get({}, { headers: createAuthHeaders('trip_service') });
      expect(detailRes.status).toBe(200);
      const tripDetail = await detailRes.json();
      expect(tripDetail.title).toEqual(mockTripData.title);
      expect(tripDetail.startDate).toEqual(mockTripData.startDate);
      expect(tripDetail.endDate).toEqual('2024-01-01');
      expect(tripDetail.plans).toHaveLength(1); // 1日分のため
    });

    it('日程を増やした場合に追加分のプランが増えること', async () => {
      await clearAllTestData();
      await createTestUser('trip_service', 'ADMIN');
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const result = await createdTrip.json();

      // 前提としてIDはあること
      expect(result).toHaveProperty('id');

      // 更新用のデータ
      const updatedData = {
        ...structuredClone(mockTripData),
        id: result.id,
        endDate: '2024-01-03',
        plans: structuredClone(mockPlanData),
      };

      updatedData.plans.push({ ...structuredClone(mockPlanData[0]), date: '2024-01-03' }); // 3日目を追加

      const res = await client.api.trips[result.id].$patch(
        {
          json: updatedData,
        },
        { headers: createAuthHeaders('trip_service') },
      );

      expect(res.status).toBe(200);
      const updatedTrip = await res.json();
      expect(updatedTrip).toMatchObject({ id: result.id });

      // 返却されたIDを元に詳細取得を行なって、更新内容が反映されていることを確認
      const detailRes = await client.api.trips[result.id].$get({}, { headers: createAuthHeaders('trip_service') });
      expect(detailRes.status).toBe(200);
      const tripDetail = await detailRes.json();
      expect(tripDetail.title).toEqual(mockTripData.title);
      expect(tripDetail.startDate).toEqual(mockTripData.startDate);
      expect(tripDetail.endDate).toEqual('2024-01-03');
      expect(tripDetail.plans).toHaveLength(3); // 3日分のため
    });

    it('日程を増やした場合に追加分のプランが増えること(追加分に最寄駅の設定あり)', async () => {
      await clearAllTestData();
      await createTestUser('trip_service', 'ADMIN');
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const result = await createdTrip.json();

      // 前提としてIDはあること
      expect(result).toHaveProperty('id');

      // 更新用のデータ
      const updatedData = {
        ...structuredClone(mockTripData),
        id: result.id,
        endDate: '2024-01-03',
        plans: structuredClone(mockPlanData),
      };

      updatedData.plans.push({
        ...structuredClone(mockPlanDataWithNearestStation[0]),
        date: '2024-01-03',
        spots: [createSpotData('20')],
      }); // 3日目を追加

      const res = await client.api.trips[result.id].$patch(
        {
          json: updatedData,
        },
        { headers: createAuthHeaders('trip_service') },
      );

      expect(res.status).toBe(200);
      const updatedTrip = await res.json();
      expect(updatedTrip).toMatchObject({ id: result.id });

      // 返却されたIDを元に詳細取得を行なって、更新内容が反映されていることを確認
      const detailRes = await client.api.trips[result.id].$get({}, { headers: createAuthHeaders('trip_service') });
      expect(detailRes.status).toBe(200);
      const tripDetail = await detailRes.json();
      expect(tripDetail.title).toEqual(mockTripData.title);
      expect(tripDetail.startDate).toEqual(mockTripData.startDate);
      expect(tripDetail.endDate).toEqual('2024-01-03');
      expect(tripDetail.plans).toHaveLength(3); // 3日分のため
    });

    it('日程をずらした場合に範囲外となったプランが削除され、追加された分の日付が登録されること', async () => {
      await clearAllTestData();
      await createTestUser('trip_service', 'ADMIN');
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const result = await createdTrip.json();

      // 前提としてIDはあること
      expect(result).toHaveProperty('id');

      // 更新用のデータ
      const updatedData = {
        ...structuredClone(mockTripData),
        id: result.id,
        startDate: '2024-01-03',
        endDate: '2024-01-04',
        plans: structuredClone(mockPlanData),
      };

      updatedData.plans.shift(); // 1日目を削除
      updatedData.plans.shift(); // 2日目を削除

      updatedData.plans.push({ ...structuredClone(mockPlanData[0]), date: '2024-01-03' }); // 3日目を追加
      updatedData.plans.push({ ...structuredClone(mockPlanData[0]), date: '2024-01-04' }); // 4日目を追加

      const res = await client.api.trips[result.id].$patch(
        {
          json: updatedData,
        },
        { headers: createAuthHeaders('trip_service') },
      );

      expect(res.status).toBe(200);
      const updatedTrip = await res.json();

      expect(updatedTrip).toHaveProperty('id', result.id);

      // 返却されたIDを元に詳細取得を行なって、更新内容が反映されていることを確認
      const detailRes = await client.api.trips[result.id].$get({}, { headers: createAuthHeaders('trip_service') });
      expect(detailRes.status).toBe(200);
      const tripDetail = await detailRes.json();
      // 更新していない項目は変わっていないこと
      expect(tripDetail).toHaveProperty('startDate', '2024-01-03');
      expect(tripDetail).toHaveProperty('endDate', '2024-01-04');
      expect(tripDetail.plans).toHaveLength(2);
    });
  });

  // --- GET: 一覧取得 ---
  describe('GET /trips', () => {
    it('認証ユーザーの旅行計画一覧を取得できること', async () => {
      // 事前に旅行計画を作成
      await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const res = await client.api.trips.$get({}, { headers: createAuthHeaders('trip_service') });

      expect(res.status).toBe(200);
      const trips = await res.json();
      expect(Array.isArray(trips)).toBe(true);
      expect(trips.length).toBeGreaterThan(0);
      expect(trips[0]).toHaveProperty('title', mockTripData.title);
    });

    it('認証されていない場合、401エラーを返すこと', async () => {
      currentUserId = null;
      const res = await client.api.trips.$get({}, { headers: createAuthHeaders('') });

      expect(res.status).toBe(401);
    });

    it('他のユーザーの旅行計画は取得できないこと', async () => {
      // 別ユーザーで旅行計画を作成
      const otherUserId = 'other_user_id';
      await createTestUser(otherUserId);
      currentUserId = otherUserId;
      await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders(currentUserId) },
      );
      // 元のユーザーに戻す
      currentUserId = TEST_USER_ID;

      const res = await client.api.trips.$get({}, { headers: createAuthHeaders(currentUserId) });

      expect(res.status).toBe(200);
      const trips = await res.json();
      // 他ユーザーの旅行計画が含まれていないことを確認
      trips.forEach((trip: any) => {
        expect(trip.userId).toBe('trip_service');
      });
    });

    it('旅行計画が存在しない場合、空配列を返すこと', async () => {
      // 事前にデータをクリア
      await clearTestData();
      await createTestUser(TEST_USER_ID, 'ADMIN');

      const res = await client.api.trips.$get({}, { headers: createAuthHeaders('trip_service') });

      expect(res.status).toBe(200);
      const trips = await res.json();
      expect(Array.isArray(trips)).toBe(true);
      expect(trips.length).toBe(0);
    });
  });

  // --- GET: 詳細取得 ---
  describe('GET /trips/:id', () => {
    it('特定の旅行計画の詳細を取得できること', async () => {
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const result = await createdTrip.json();

      const res = await client.api.trips[result.id].$get({}, { headers: createAuthHeaders('trip_service') });

      expect(res.status).toBe(200);
      const trip = await res.json();
      expect(trip).toHaveProperty('title', mockTripData.title);
      expect(Array.isArray(trip.plans)).toBe(true);

      // 詳細情報の中身も確認
      expect(trip.plans.length).toBe(mockPlanData.length);
    });

    it('存在しない旅行計画の詳細取得は404エラーを返すこと', async () => {
      const res = await client.api.trips[9999].$get({}, { headers: createAuthHeaders('trip_service') });

      expect(res.status).toBe(404);
    });

    it('スポットはplaceIdのみ返し、SpotMetaの情報（name/latitude/longitude等）を含まないこと', async () => {
      // 事前に旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders('trip_service') },
      );

      const result = await createdTrip.json();
      const res = await client.api.trips[result.id].$get({}, { headers: createAuthHeaders('trip_service') });

      expect(res.status).toBe(200);
      const trip = await res.json();

      const firstSpot = trip.plans[0].spots[0];

      // placeIdが返ること
      expect(firstSpot).toHaveProperty('id');
      // スケジュール情報が返ること
      expect(firstSpot).toHaveProperty('stayStart');
      expect(firstSpot).toHaveProperty('stayEnd');
      expect(firstSpot).toHaveProperty('order');
      expect(firstSpot).toHaveProperty('stayDuration');
      expect(firstSpot).toHaveProperty('transportMethodId');
      expect(firstSpot).toHaveProperty('transportMethod');
      expect(firstSpot).toHaveProperty('travelTime');

      // SpotMetaの情報が返らないこと
      expect(firstSpot.location).toBeUndefined();
      expect(firstSpot.image).toBeUndefined();
      expect(firstSpot.url).toBeUndefined();
      expect(firstSpot.rating).toBeUndefined();
      expect(firstSpot.address).toBeUndefined();
      expect(firstSpot.prefecture).toBeUndefined();
      expect(firstSpot.category).toBeUndefined();
      expect(firstSpot.description).toBeUndefined();
      expect(firstSpot.catchphrase).toBeUndefined();
      expect(firstSpot.regularOpeningHours).toBeUndefined();
    });

    it('最寄駅情報が placeId と stationType を含むこと', async () => {
      // 最寄駅情報付きのプランデータを作成
      const tripWithNearestStation = {
        ...mockTripData,
        plans: mockPlanDataWithNearestStation,
      };

      // 旅行計画を作成
      const createdTrip = await client.api.trips.create.$post(
        {
          json: tripWithNearestStation,
        },
        { headers: createAuthHeaders('trip_service') },
      );

      expect(createdTrip.status).toBe(201);
      const createdTripResult = await createdTrip.json();

      // 詳細を取得
      const getRes = await client.api.trips[createdTripResult.id].$get(
        {},
        { headers: createAuthHeaders('trip_service') },
      );

      expect(getRes.status).toBe(200);
      const trip = await getRes.json();

      const spotWithStation = trip.plans[0].spots[0];

      // 最寄駅情報が返されること
      expect(spotWithStation.nearestStation).not.toBeNull();
      expect(spotWithStation.nearestStation).not.toBeUndefined();
      expect(spotWithStation.nearestStation).toHaveProperty('placeId', 'spot_1');
      expect(spotWithStation.nearestStation).toHaveProperty('stationType', 'TRAIN');

      // 駅の詳細情報（name, walkingTimeなど）は返されないこと（Google Maps Platform利用規約準拠）
      expect(spotWithStation.nearestStation.name).toBeUndefined();
      expect(spotWithStation.nearestStation.walkingTime).toBeUndefined();
      expect(spotWithStation.nearestStation.latitude).toBeUndefined();
      expect(spotWithStation.nearestStation.longitude).toBeUndefined();
    });

    it('出発地・目的地の最寄駅情報が placeId と stationType を含むこと', async () => {
      const payloadWithLocationStations = {
        ...mockTripData,
        plans: mockPlanDataWithNearestStation,
      };

      const createdTrip = await client.api.trips.create.$post(
        {
          json: payloadWithLocationStations as any,
        },
        { headers: createAuthHeaders('trip_service') },
      );

      expect(createdTrip.status).toBe(201);
      const createdTripResult = await createdTrip.json();

      const getRes = await client.api.trips[createdTripResult.id].$get(
        {},
        { headers: createAuthHeaders('trip_service') },
      );

      expect(getRes.status).toBe(200);
      const trip = await getRes.json();

      expect(trip.plans[0]?.departure?.nearestStation).toEqual({
        placeId: 'departure_station_place_id',
        stationType: 'TRAIN',
        transitTime: 10,
        scheduledDepartureTime: '10:00',
        memo: '出発地駅からの移動メモ',
      });
      expect(trip.plans[0]?.destination?.nearestStation).toEqual({
        placeId: 'destination_station_place_id',
        stationType: 'TRAIN',
        transitTime: 10,
        scheduledDepartureTime: '10:00',
        memo: '目的地駅からの移動メモ',
      });
    });
  });

  // --- 最寄駅での待ち時間（waitingTime）テスト ---
  describe('最寄駅の待ち時間（waitingTime）', () => {
    // 旅行計画の作成数の上限に当たらないよう、テストごとにデータを消す
    beforeEach(async () => {
      await clearAllTestData();
      await createTestUser('trip_service', 'ADMIN');
    });

    /**
     * 出発地: 5分、スポット1: 0分、スポット2・目的地: 未設定 の待ち時間を持つプランデータを作る
     */
    const createPlansWithWaitingTime = () => {
      const plans = structuredClone(mockPlanDataWithNearestStation);
      const [firstPlan] = plans;
      if (!firstPlan.departure.nearestStation || !firstPlan.spots[0].nearestStation) {
        throw new Error('nearestStationが設定されていることを前提としているため、テストデータを確認してください。');
      }
      firstPlan.departure.nearestStation.waitingTime = 5;
      firstPlan.spots[0].nearestStation.waitingTime = 0;
      return plans;
    };

    const createTripWithWaitingTime = async () => {
      const res = await client.api.trips.create.$post(
        { json: { ...structuredClone(mockTripData), plans: createPlansWithWaitingTime() } },
        { headers: createAuthHeaders('trip_service') },
      );
      expect(res.status).toBe(201);
      return (await res.json()) as { id: number };
    };

    const findStoredWaitingTimes = async (tripId: number) => {
      const [firstPlan] = await db.select().from(plan).where(eq(plan.tripId, tripId)).orderBy(plan.date);
      const locations = await db.select().from(planLocation).where(eq(planLocation.planId, firstPlan.id));
      const departure = locations.find((l) => l.locationType === 'DEPARTURE');
      const destination = locations.find((l) => l.locationType === 'DESTINATION');
      const spots = await db.select().from(planSpot).where(eq(planSpot.planId, firstPlan.id)).orderBy(planSpot.order);
      const [departureStation] = await db
        .select()
        .from(planLocationNearestStation)
        .where(eq(planLocationNearestStation.planLocationId, departure!.id));
      const [destinationStation] = await db
        .select()
        .from(planLocationNearestStation)
        .where(eq(planLocationNearestStation.planLocationId, destination!.id));
      const [spot1Station] = await db
        .select()
        .from(planSpotNearestStation)
        .where(eq(planSpotNearestStation.planSpotId, spots[0].id));
      const [spot2Station] = await db
        .select()
        .from(planSpotNearestStation)
        .where(eq(planSpotNearestStation.planSpotId, spots[1].id));
      return {
        departure: departureStation?.waitingTime,
        spot1: spot1Station?.waitingTime,
        spot2: spot2Station?.waitingTime,
        destination: destinationStation?.waitingTime,
      };
    };

    it('作成時に待ち時間が保存され、0分も保存されること', async () => {
      const created = await createTripWithWaitingTime();

      expect(await findStoredWaitingTimes(created.id)).toEqual({
        departure: 5,
        spot1: 0,
        spot2: null,
        destination: null,
      });
    });

    it('詳細取得で待ち時間を返し、未設定のときは返さないこと', async () => {
      const created = await createTripWithWaitingTime();

      const res = await client.api.trips[created.id].$get({}, { headers: createAuthHeaders('trip_service') });
      expect(res.status).toBe(200);
      const tripDetail = await res.json();
      const [firstPlan] = tripDetail.plans;

      expect(firstPlan.departure.nearestStation.waitingTime).toBe(5);
      expect(firstPlan.spots[0].nearestStation.waitingTime).toBe(0);
      expect(firstPlan.spots[1].nearestStation).not.toHaveProperty('waitingTime');
      expect(firstPlan.destination.nearestStation).not.toHaveProperty('waitingTime');
    });

    it('更新時に待ち時間が上書きされ、未設定にすると null になること', async () => {
      const created = await createTripWithWaitingTime();
      const plans = createPlansWithWaitingTime();
      plans[0].departure.nearestStation!.waitingTime = 12;
      delete plans[0].spots[0].nearestStation!.waitingTime;
      plans[0].destination.nearestStation!.waitingTime = 3;

      const res = await client.api.trips[created.id].$patch(
        { json: { ...structuredClone(mockTripData), id: created.id, plans } },
        { headers: createAuthHeaders('trip_service') },
      );
      expect(res.status).toBe(200);

      expect(await findStoredWaitingTimes(created.id)).toEqual({
        departure: 12,
        spot1: null,
        spot2: null,
        destination: 3,
      });
    });
  });

  // --- PlanLocationNearestStation テスト（出発地・目的地の最寄駅） ---
  describe('PlanLocationNearestStation', () => {
    it('PlanLocationNearestStation テーブルへの insert/select が動作すること', async () => {
      // テスト用に PlanLocationNearestStation テーブルが存在することを確認
      // （test DB ではマイグレーション状態が異なる可能性があるため）
      try {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS "PlanLocationNearestStation" (
            "id" serial PRIMARY KEY NOT NULL,
            "planLocationId" integer NOT NULL UNIQUE,
            "placeId" text NOT NULL,
            "stationType" "StationType" NOT NULL,
            "transitTime" integer,
            "scheduledDepartureTime" varchar(5),
            "memo" text
          );
        `);
      } catch {
        // テーブルが既に存在する場合は何もしない
      }

      // 新規 Trip を作成
      const newTrip = await db
        .insert(trip)
        .values({
          title: 'テスト旅行_PlanLocationNearestStation',
          userId: TEST_USER_ID,
          startDate: '2024-01-01',
          endDate: '2024-01-02',
        })
        .returning();

      const newTripId = newTrip[0].id;

      // Plan を作成
      const newPlan = await db
        .insert(plan)
        .values({
          tripId: newTripId,
          date: '2024-01-01',
        })
        .returning();

      const newPlanId = newPlan[0].id;

      // PlanLocation (出発地) を作成
      const departurePlanLocation = await db
        .insert(planLocation)
        .values({
          userId: TEST_USER_ID,
          name: 'テスト出発地',
          latitude: 35.6762,
          longitude: 139.7674,
          time: '09:00',
          locationType: 'DEPARTURE',
          planId: newPlanId,
        })
        .returning();

      const departurePlanLocationId = departurePlanLocation[0].id;

      // PlanLocation に最寄駅を紐づける
      const createdNearestStation = await db
        .insert(planLocationNearestStation)
        .values({
          planLocationId: departurePlanLocationId,
          placeId: 'ChIJ0zcn2rqL0-sRVQk5YvqcRas', // 仮の Google Place ID
          stationType: 'TRAIN',
          transitTime: 7,
          scheduledDepartureTime: '09:05',
          memo: 'insert/selectテスト',
        })
        .returning();

      expect(createdNearestStation.length).toBe(1);
      expect(createdNearestStation[0].placeId).toBe('ChIJ0zcn2rqL0-sRVQk5YvqcRas');
      expect(createdNearestStation[0].stationType).toBe('TRAIN');
      expect(createdNearestStation[0].transitTime).toBe(7);
      expect(createdNearestStation[0].scheduledDepartureTime).toBe('09:05');
      expect(createdNearestStation[0].memo).toBe('insert/selectテスト');

      // 取得して検証
      const retrievedNearestStation = await db
        .select()
        .from(planLocationNearestStation)
        .where(eq(planLocationNearestStation.planLocationId, departurePlanLocationId));

      expect(retrievedNearestStation.length).toBe(1);
      expect(retrievedNearestStation[0]?.placeId).toBe('ChIJ0zcn2rqL0-sRVQk5YvqcRas');
      expect(retrievedNearestStation[0]?.stationType).toBe('TRAIN');
      expect(retrievedNearestStation[0]?.transitTime).toBe(7);
      expect(retrievedNearestStation[0]?.scheduledDepartureTime).toBe('09:05');
      expect(retrievedNearestStation[0]?.memo).toBe('insert/selectテスト');
    });
  });

  // --- ユーザーIDごとの旅行プラン数取得テスト ---
  describe('countTripByUserId', () => {
    it('複数のユーザーがそれぞれ異なる数の旅行プランを持つ場合、正しくカウントできること', async () => {
      // データをクリアして再構築
      await clearTestData();

      // テスト用ユーザーを3人作成
      const user1 = 'trip_count_test_user_1';
      const user2 = 'trip_count_test_user_2';
      const user3 = 'trip_count_test_user_3';
      await createTestUser(user1);
      await createTestUser(user2);
      await createTestUser(user3);

      // user1: 2件の旅行プランを作成
      currentUserId = user1;
      await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            title: 'User1の旅行1',
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders(currentUserId) },
      );
      await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            title: 'User1の旅行2',
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders(currentUserId) },
      );

      // user2: 1件の旅行プランを作成
      currentUserId = user2;
      await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            title: 'User2の旅行1',
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders(currentUserId) },
      );

      // user3: 旅行プランを作成しない（0件）

      // カウント実行
      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId(db, [user1, user2, user3]);

      // 検証
      expect(result[user1]).toBe(2);
      expect(result[user2]).toBe(1);
      expect(result[user3]).toBeUndefined(); // 旅行プランが0件の場合は含まれない
    });

    it('旅行プランを持たないユーザーは結果に含まれないこと', async () => {
      const userWithoutTrip = 'user_without_trip';
      await createTestUser(userWithoutTrip);

      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId(db, [userWithoutTrip]);

      // 旅行プランが0件の場合は結果オブジェクトに含まれない
      expect(result[userWithoutTrip]).toBeUndefined();
      expect(Object.keys(result).length).toBe(0);
    });

    it('空の配列を渡した場合、空のオブジェクトを返すこと', async () => {
      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId(db, []);

      expect(result).toEqual({});
      expect(Object.keys(result).length).toBe(0);
    });

    it('指定したユーザーIDのみがカウントされること', async () => {
      // テスト用ユーザーを作成
      const targetUser = 'target_user_for_trip_count';
      const otherUser = 'other_user_for_trip_count';
      await createTestUser(targetUser);
      await createTestUser(otherUser);

      // 各ユーザーに旅行プランを作成
      currentUserId = targetUser;
      await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            title: 'ターゲットユーザーの旅行',
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders(currentUserId) },
      );

      currentUserId = otherUser;
      await client.api.trips.create.$post(
        {
          json: {
            ...structuredClone(mockTripData),
            title: 'その他ユーザーの旅行',
            plans: structuredClone(mockPlanData),
          },
        },
        { headers: createAuthHeaders(currentUserId) },
      );

      // targetUserのみを指定してカウント
      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId(db, [targetUser]);

      // 検証: targetUserのみが含まれ、otherUserは含まれない
      expect(result[targetUser]).toBe(1);
      expect(result[otherUser]).toBeUndefined();
      expect(Object.keys(result).length).toBe(1);
    });

    it('同じユーザーが複数の旅行プランを持つ場合、正確にカウントされること', async () => {
      const userWithMany = 'user_with_many_trips';
      await createTestUser(userWithMany);

      currentUserId = userWithMany;

      // 5件の旅行プランを作成
      for (let i = 0; i < 5; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...structuredClone(mockTripData),
              title: `大量テスト用旅行${i}`,
              plans: structuredClone(mockPlanData),
            },
          },
          { headers: createAuthHeaders(currentUserId) },
        );
      }

      const { countPlanByUserId } = await import('@/services/trip');
      const result = await countPlanByUserId(db, [userWithMany]);

      expect(result[userWithMany]).toBe(5);
    });
  });

  // 前月のプラン数の増減の計算が正しいかのテスト
  describe('getPastTripStatistics', () => {
    it('旅行プランの総数、前月比増減数、平均旅程数の割合を正しく取得できること', async () => {
      // データをクリアして再構築
      await clearTestData();

      // テスト用ユーザーを3人作成
      const user1 = 'trip_count_test_user_1';
      const user2 = 'trip_count_test_user_2';
      const user3 = 'trip_count_test_user_3';
      await createTestUser(user1);
      await createTestUser(user2);
      await createTestUser(user3);

      currentUserId = user1;
      // 現在日を一ヶ月前にする
      const prevDate = new Date('2023-12-01T12:00:00Z');
      setSystemTime(prevDate);
      // 1件✖️2日の前月の旅行プランを作成
      for (let i = 0; i < 1; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...structuredClone(mockTripData),
              title: `大量テスト用旅行${i}`,
              plans: structuredClone(mockPlanData),
            },
          },
          { headers: createAuthHeaders('trip_service') },
        );
      }

      // 元に戻す
      const date = new Date('2024-01-01T12:00:00Z');
      setSystemTime(date);
      // 1件✖️2日の当月の旅行プランを作成
      for (let i = 0; i < 1; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...structuredClone(mockTripData),
              title: `大量テスト用旅行${i}`,
              plans: structuredClone(mockPlanData),
            },
          },
          { headers: createAuthHeaders('trip_service') },
        );
      }

      // 1件 + 3件 = 合計4件の旅程
      // 期待値としては、総プラン数4、前月比増減数2、平均旅程数の割合8/4=2となるはず
      const { getTripStatistics } = await import('@/services/trip');
      const stats = await getTripStatistics(db);

      expect(stats.totalPlans).toBe(2);
      expect(stats.planIncreaseFromLastMonth).toBe(2);
      expect(stats.averageDatePerUserPlan).toBeCloseTo(2);
    });
  });
  // 総プラン数の取得と平均旅程数の割合テスト
  describe('getTripStatistics', () => {
    it('前月からの増減を正しく計算できること', async () => {
      // データをクリアして再構築
      await clearTestData();

      // テスト用ユーザーを3人作成
      const user1 = 'trip_count_test_user_1';
      const user2 = 'trip_count_test_user_2';
      const user3 = 'trip_count_test_user_3';
      await createTestUser(user1);
      await createTestUser(user2);
      await createTestUser(user3);

      currentUserId = user1;

      // 1件✖️2日の旅行プランを作成
      for (let i = 0; i < 1; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...structuredClone(mockTripData),
              title: `大量テスト用旅行${i}`,
              plans: structuredClone(mockPlanData),
            },
          },
          { headers: createAuthHeaders('trip_service') },
        );
      }

      currentUserId = user2;
      // 3件✖️2日の旅行プランを作成
      for (let i = 0; i < 3; i++) {
        await client.api.trips.create.$post(
          {
            json: {
              ...structuredClone(mockTripData),
              title: `大量テスト用旅行${i}`,
              plans: structuredClone(mockPlanData),
            },
          },
          { headers: createAuthHeaders('trip_service') },
        );
      }
      // 1件 + 3件 = 合計4件の旅程
      // 期待値としては、総プラン数4、前月比増減数4、平均旅程数の割合8/4=2となるはず
      const { getTripStatistics } = await import('@/services/trip');
      const stats = await getTripStatistics(db);

      expect(stats.totalPlans).toBe(4);
      expect(stats.planIncreaseFromLastMonth).toBe(4);
      expect(stats.averageDatePerUserPlan).toBeCloseTo(2);
    });
  });

  describe('出発地・目的地の暗号化と最後のスポットの移動時間（No.168）', () => {
    beforeEach(async () => {
      // プラン作成数の上限に当たらないよう、テストごとにデータを消す
      await clearAllTestData();
      await createTestUser('trip_service', 'ADMIN');
    });

    const buildPlans = () => {
      const plans = structuredClone(mockPlanData);
      plans[0].spots = [
        { ...plans[0].spots[0], id: spotId('enc_first'), order: 1, travelTime: 11 },
        { ...plans[0].spots[0], id: spotId('enc_last'), order: 2, travelTime: 22 },
      ];
      plans[0].departure.travelTime = 7;
      plans[0].destination.travelTime = 0;
      return plans;
    };

    it('作成後に取得すると、座標・移動時間が送った値のまま返る', async () => {
      const created = await (
        await client.api.trips.create.$post(
          { json: { ...structuredClone(mockTripData), plans: buildPlans() } },
          { headers: createAuthHeaders('trip_service') },
        )
      ).json();

      const res = await client.api.trips[created.id].$get({}, { headers: createAuthHeaders('trip_service') });
      const detail = await res.json();
      const firstPlan = detail.plans.find((p: { date: string }) => p.date === '2024-01-01');

      expect(firstPlan.departure.latitude).toBe(mockPlanData[0].departure.latitude);
      expect(firstPlan.departure.longitude).toBe(mockPlanData[0].departure.longitude);
      expect(firstPlan.departure.travelTime).toBe(7);
      expect(firstPlan.destination.latitude).toBe(mockPlanData[0].destination.latitude);
      expect(firstPlan.destination.travelTime).toBe(0);
      const travelTimes = Object.fromEntries(
        firstPlan.spots.map((s: { id: string; travelTime: number }) => [s.id, s.travelTime]),
      );
      expect(travelTimes).toEqual({ [spotId('enc_first')]: 11, [spotId('enc_last')]: 22 });
    });

    it('DBには座標・移動時間を平文で保存しない', async () => {
      const created = await (
        await client.api.trips.create.$post(
          { json: { ...structuredClone(mockTripData), plans: buildPlans() } },
          { headers: createAuthHeaders('trip_service') },
        )
      ).json();
      const [createdPlan] = await db.select().from(plan).where(eq(plan.tripId, created.id));
      const locations = await db.select().from(planLocation).where(eq(planLocation.planId, createdPlan.id));

      for (const location of locations) {
        expect(location.latitude).toBeNull();
        expect(location.longitude).toBeNull();
        expect(location.travelTime).toBeNull();
        expect(location.encryptedData).toMatch(/^v1:/);
      }
      const spots = await db.select().from(planSpot).where(eq(planSpot.planId, createdPlan.id));
      expect(spots.find((s) => s.spotId === spotId('enc_last'))?.travelTime).toBe(0);
      expect(spots.find((s) => s.spotId === spotId('enc_first'))?.travelTime).toBe(11);
    });

    it('スポットの順番を入れ替えて更新すると、新しい最後のスポットの移動時間が目的地側に移る', async () => {
      const created = await (
        await client.api.trips.create.$post(
          { json: { ...structuredClone(mockTripData), plans: buildPlans() } },
          { headers: createAuthHeaders('trip_service') },
        )
      ).json();

      const updatedPlans = buildPlans();
      updatedPlans[0].spots = [
        { ...updatedPlans[0].spots[0], order: 2, travelTime: 33 },
        { ...updatedPlans[0].spots[1], order: 1, travelTime: 44 },
      ];
      const patchRes = await client.api.trips[created.id].$patch(
        { json: { ...structuredClone(mockTripData), plans: updatedPlans } },
        { headers: createAuthHeaders('trip_service') },
      );
      expect(patchRes.status).toBe(200);

      const [createdPlan] = await db.select().from(plan).where(eq(plan.tripId, created.id));
      const spots = await db.select().from(planSpot).where(eq(planSpot.planId, createdPlan.id));
      expect(spots.find((s) => s.spotId === spotId('enc_first'))?.travelTime).toBe(0);
      expect(spots.find((s) => s.spotId === spotId('enc_last'))?.travelTime).toBe(44);

      const detail = await (
        await client.api.trips[created.id].$get({}, { headers: createAuthHeaders('trip_service') })
      ).json();
      const firstPlan = detail.plans.find((p: { date: string }) => p.date === '2024-01-01');
      const travelTimes = Object.fromEntries(
        firstPlan.spots.map((s: { id: string; travelTime: number }) => [s.id, s.travelTime]),
      );
      expect(travelTimes).toEqual({ [spotId('enc_first')]: 33, [spotId('enc_last')]: 44 });
      expect(firstPlan.destination.travelTime).toBe(0);
    });
  });
});
