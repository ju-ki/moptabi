import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType, ExtendSpotType, ExtendPlanLocationType } from '@/types/plan';
import { AlternativeRouteInfo, PlanningResult, RouteInfo } from '@/lib/planning';
import { DEFAULT_DEPARTURE_TIME, DEFAULT_ARRIVAL_TIME, DEFAULT_DEPARTURE_AND_DESTINATION } from '@/data/constants';

/**
 * テスト用ユーティリティ: デフォルト出発地を生成
 */
function createDefaultDeparture(date: string): ExtendPlanLocationType {
  return {
    name: `出発地_${date}`,
    latitude: 35.6762,
    longitude: 139.6503,
    time: DEFAULT_DEPARTURE_TIME,
    locationType: TransportNodeType.DEPARTURE,
    transportMethod: 'WALKING',
    transportMethodId: 1,
    travelTime: 15,
    alternateRoutes: [],
    nearestStation: {
      placeId: 'ChIJ-test-departure',
      stationType: 'TRAIN',
      name: '新宿駅',
      latitude: 35.6895,
      longitude: 139.7006,
      walkingTime: 5,
      transitTime: 10,
    },
  };
}

/**
 * テスト用ユーティリティ: デフォルト目的地を生成
 */
function createDefaultDestination(date: string): ExtendPlanLocationType {
  return {
    name: `目的地_${date}`,
    latitude: 35.6895,
    longitude: 139.7006,
    time: DEFAULT_ARRIVAL_TIME,
    locationType: TransportNodeType.DESTINATION,
    transportMethod: 'DEFAULT',
    transportMethodId: 0,
    travelTime: 0,
    alternateRoutes: [],
    nearestStation: {
      placeId: 'ChIJ-test-destination',
      stationType: 'TRAIN',
      name: '渋谷駅',
      latitude: 35.6595,
      longitude: 139.7004,
      walkingTime: 3,
      transitTime: 0,
    },
  };
}

/**
 * テスト用ユーティリティ: テストスポットを生成
 */
function createTestSpot(id: string, order: number, date: string): ExtendSpotType {
  return {
    id,
    spotId: id,
    name: `テストスポット_${order}`,
    latitude: 35.6699 + order * 0.01,
    longitude: 139.7707 + order * 0.01,
    stayStart: '10:00',
    stayEnd: '11:00',
    stayDuration: 60,
    image: '/test-image.jpg',
    rating: 4.5,
    description: 'テスト用スポット',
    address: 'テストアドレス',
    order,
    ratingCount: 100,
    regularOpeningHours: [],
    prefecture: '東京都',
    categories: ['test'],
    transportMethod: 'WALKING',
    transportMethodId: 1,
    travelTime: 15,
    alternateRoutes: [],
    nearestStation: {
      placeId: `ChIJ-test-spot-${order}`,
      stationType: 'TRAIN',
      name: `テスト駅_${order}`,
      latitude: 35.6699 + order * 0.01,
      longitude: 139.7707 + order * 0.01,
      walkingTime: 10,
      transitTime: 0,
    },
  };
}

/**
 * テスト用ユーティリティ: 代替ルート情報を生成
 */
function createAlternativeRoute(transportMethodId: number, duration: number): AlternativeRouteInfo {
  return {
    transportMethodId,
    transportMethod: `test-method-${transportMethodId}` as any,
    duration,
    distance: 2000,
    isStationRoute: false,
  };
}

/**
 * テスト用ユーティリティ: ルート情報を生成（出発地→スポット）
 */
function createDepartureToSpotRoute(
  routeId: string,
  spotId: string,
  transportMethodId: number = 1,
  duration: number = 30,
): RouteInfo {
  return {
    id: routeId,
    fromSpotId: '',
    fromType: 'DEPARTURE',
    toType: 'SPOT',
    toSpotId: spotId,
    routeType: 'DEPARTURE_TO_SPOT',
    transportMethodId,
    transportMethod: `test-method-${transportMethodId}` as any,
    duration,
    distance: 2000,
    alternativeRoutes: [createAlternativeRoute(2, 45)],
  };
}

/**
 * テスト用ユーティリティ: ルート情報を生成（スポット→スポット）
 */
function createSpotToSpotRoute(
  routeId: string,
  fromSpotId: string,
  toSpotId: string,
  transportMethodId: number = 1,
  duration: number = 20,
): RouteInfo {
  return {
    id: routeId,
    fromSpotId,
    fromType: 'SPOT',
    toType: 'SPOT',
    toSpotId,
    routeType: 'SPOT_TO_SPOT',
    transportMethodId,
    transportMethod: `test-method-${transportMethodId}` as any,
    duration,
    distance: 1500,
    alternativeRoutes: [createAlternativeRoute(3, 35)],
  };
}

/**
 * テスト用ユーティリティ: ルート情報を生成（スポット→目的地）
 */
function createSpotToDestinationRoute(
  routeId: string,
  fromSpotId: string,
  transportMethodId: number = 1,
  duration: number = 25,
): RouteInfo {
  return {
    id: routeId,
    fromSpotId,
    fromType: 'SPOT',
    toType: 'DESTINATION',
    toSpotId: '',
    routeType: 'SPOT_TO_DESTINATION',
    transportMethodId,
    transportMethod: `test-method-${transportMethodId}` as any,
    duration,
    distance: 1800,
    alternativeRoutes: [createAlternativeRoute(4, 40)],
  };
}

/**
 * テスト用ユーティリティ: プランニング結果を生成
 */
function createPlanningResult(date: string, routes: RouteInfo[]): PlanningResult {
  const totalDuration = routes.reduce((sum, r) => sum + r.duration, 0);
  const totalDistance = routes.reduce((sum, r) => sum + r.distance, 0);
  return {
    totalDuration,
    totalDistance,
    routes,
    departureTime: DEFAULT_DEPARTURE_TIME,
    arrivalTime: DEFAULT_ARRIVAL_TIME,
    isOverTime: false,
    updatedDeparture: DEFAULT_DEPARTURE_AND_DESTINATION,
    updatedDestination: DEFAULT_DEPARTURE_AND_DESTINATION,
    updatedSpots: [],
    messages: [],
  };
}

describe('useStoreForPlanning - switchAlternativeRoute', () => {
  beforeEach(() => {
    // 各テストの前にストアをリセット
    const store = useStoreForPlanning.getState();
    store.resetPlanningStore();
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    const store = useStoreForPlanning.getState();
    store.resetPlanningStore();
  });

  describe('出発地→スポット間のルート切り替え (DEPARTURE→SPOT)', () => {
    it('新しい交通手段で departure.alternateRoutes が更新される', () => {
      // Arrange
      const date = '2026-09-15';
      const spotId = 'spot-1';
      const store = useStoreForPlanning.getState();

      // 初期状態を設定
      store.setFields('startDate', date);
      store.setFields('endDate', date);
      store.setFields('title', 'テストプラン');

      const departure = createDefaultDeparture(date);
      const destination = createDefaultDestination(date);

      // 先にプランを作成（addDateWithDefaultLocation で初期化）
      store.addDateWithDefaultLocation(date, departure, destination);

      // スポットを追加
      const spot = createTestSpot(spotId, 1, date);
      store.setSpots(date, spot, false);

      // プランニング結果を設定
      const route = createDepartureToSpotRoute('route-1', spotId, 1, 30);
      const planningResult = createPlanningResult(date, [route]);
      store.setPlanningResult(date, planningResult);

      // Act
      store.switchAlternativeRoute(date, 'route-1', 2);

      // Assert
      const updatedPlan = store.getPlanInfo(date);
      expect(updatedPlan?.departure.alternateRoutes).toBeDefined();
      expect(updatedPlan?.departure.alternateRoutes).toHaveLength(1);
      expect(updatedPlan?.departure.alternateRoutes?.[0].transportMethodId).toBe(2);
      expect(updatedPlan?.departure.transportMethodId).toBe(2);
      expect(updatedPlan?.departure.nearestStation).toEqual(departure.nearestStation);
    });
  });

  describe('スポット→スポット間のルート切り替え (SPOT→SPOT)', () => {
    it('新しい交通手段で中間スポットの alternateRoutes が更新される', () => {
      // Arrange
      const date = '2026-09-15';
      const spotId1 = 'spot-1';
      const spotId2 = 'spot-2';
      const store = useStoreForPlanning.getState();

      store.setFields('startDate', date);
      store.setFields('endDate', date);
      store.setFields('title', 'テストプラン');

      const departure = createDefaultDeparture(date);
      const destination = createDefaultDestination(date);

      // 先にプランを作成
      store.addDateWithDefaultLocation(date, departure, destination);

      // スポットを追加
      const spot1 = createTestSpot(spotId1, 1, date);
      const spot2 = createTestSpot(spotId2, 2, date);
      store.setSpots(date, spot1, false);
      store.setSpots(date, spot2, false);

      // プランニング結果を設定
      const route = createSpotToSpotRoute('route-1', spotId1, spotId2, 1, 20);
      const planningResult = createPlanningResult(date, [route]);
      store.setPlanningResult(date, planningResult);

      // Act
      store.switchAlternativeRoute(date, 'route-1', 3);

      // Assert
      const updatedPlan = store.getPlanInfo(date);
      const updatedSpot1 = updatedPlan?.spots.find((s) => s.id === spotId1);
      expect(updatedSpot1?.alternateRoutes).toBeDefined();
      expect(updatedSpot1?.alternateRoutes).toHaveLength(1);
      expect(updatedSpot1?.alternateRoutes?.[0].transportMethodId).toBe(3);
      expect(updatedSpot1?.transportMethodId).toBe(3);
    });
  });

  describe('スポット→目的地間のルート切り替え (SPOT→DESTINATION)', () => {
    it('新しい交通手段で最後のスポットの alternateRoutes が更新される', () => {
      // Arrange
      const date = '2026-09-15';
      const spotId = 'spot-1';
      const store = useStoreForPlanning.getState();

      store.setFields('startDate', date);
      store.setFields('endDate', date);
      store.setFields('title', 'テストプラン');

      const departure = createDefaultDeparture(date);
      const destination = createDefaultDestination(date);

      // 先にプランを作成
      store.addDateWithDefaultLocation(date, departure, destination);

      // スポットを追加
      const spot = createTestSpot(spotId, 1, date);
      store.setSpots(date, spot, false);

      // プランニング結果を設定
      const route = createSpotToDestinationRoute('route-1', spotId, 1, 25);
      const planningResult = createPlanningResult(date, [route]);
      store.setPlanningResult(date, planningResult);

      // Act
      store.switchAlternativeRoute(date, 'route-1', 4);

      // Assert
      const updatedPlan = store.getPlanInfo(date);
      const updatedSpot = updatedPlan?.spots[updatedPlan.spots.length - 1];
      expect(updatedSpot?.alternateRoutes).toBeDefined();
      expect(updatedSpot?.alternateRoutes).toHaveLength(1);
      expect(updatedSpot?.alternateRoutes?.[0].transportMethodId).toBe(4);
      // destination には格納しない（仕様確認済み）
      expect(updatedPlan?.destination.alternateRoutes).toEqual([]);
    });
  });

  describe('nearestStation の保持', () => {
    it('departure.nearestStation は上書きされない', () => {
      // Arrange
      const date = '2026-09-15';
      const spotId = 'spot-1';
      const store = useStoreForPlanning.getState();

      store.setFields('startDate', date);
      store.setFields('endDate', date);
      store.setFields('title', 'テストプラン');

      const departure = createDefaultDeparture(date);
      const destination = createDefaultDestination(date);

      // 先にプランを作成
      store.addDateWithDefaultLocation(date, departure, destination);

      // スポットを追加
      const spot = createTestSpot(spotId, 1, date);
      store.setSpots(date, spot, false);

      const originalNearestStation = departure.nearestStation;

      // プランニング結果を設定
      const route = createDepartureToSpotRoute('route-1', spotId, 1, 30);
      const planningResult = createPlanningResult(date, [route]);
      store.setPlanningResult(date, planningResult);

      // Act
      store.switchAlternativeRoute(date, 'route-1', 2);

      // Assert
      const updatedPlan = store.getPlanInfo(date);
      expect(updatedPlan?.departure.nearestStation).toEqual(originalNearestStation);
    });

    it('スポットの nearestStation は上書きされない', () => {
      // Arrange
      const date = '2026-09-15';
      const spotId = 'spot-1';
      const store = useStoreForPlanning.getState();

      store.setFields('startDate', date);
      store.setFields('endDate', date);
      store.setFields('title', 'テストプラン');

      const departure = createDefaultDeparture(date);
      const destination = createDefaultDestination(date);

      // 先にプランを作成
      store.addDateWithDefaultLocation(date, departure, destination);

      // スポットを追加
      const spot = createTestSpot(spotId, 1, date);
      store.setSpots(date, spot, false);
      const originalNearestStation = spot.nearestStation;

      // プランニング結果を設定
      const route = createDepartureToSpotRoute('route-1', spotId, 1, 30);
      const planningResult = createPlanningResult(date, [route]);
      store.setPlanningResult(date, planningResult);

      // Act
      store.switchAlternativeRoute(date, 'route-1', 2);

      // Assert
      const updatedPlan = store.getPlanInfo(date);
      const updatedSpot = updatedPlan?.spots.find((s) => s.id === spotId);
      expect(updatedSpot?.nearestStation).toEqual(originalNearestStation);
    });
  });

  describe('dirtyフラグと planningSnapshot', () => {
    it('snapshot が存在し、異なる移動手段を選択したら dirtyフラグが立つ', () => {
      // Arrange
      const date = '2026-09-15';
      const spotId = 'spot-1';
      const store = useStoreForPlanning.getState();

      store.setFields('startDate', date);
      store.setFields('endDate', date);
      store.setFields('title', 'テストプラン');

      const departure = createDefaultDeparture(date);
      const destination = createDefaultDestination(date);

      // 先にプランを作成
      store.addDateWithDefaultLocation(date, departure, destination);

      // スポットを追加
      const spot = createTestSpot(spotId, 1, date);
      store.setSpots(date, spot, false);

      // snapshot を設定
      const route = createDepartureToSpotRoute('route-1', spotId, 1, 30);
      const planningResult = createPlanningResult(date, [route]);
      store.setPlanningResult(date, planningResult);

      expect(store.isPlanningDirty(date)).toBe(false);

      // Act
      store.switchAlternativeRoute(date, 'route-1', 2);

      // Assert
      expect(store.isPlanningDirty(date)).toBe(true);
    });

    it('A→B→A パターン: 異なる手段を選択後、元の手段に戻すと dirtyフラグは立たない', () => {
      // Arrange
      const date = '2026-09-15';
      const spotId = 'spot-1';
      const store = useStoreForPlanning.getState();

      store.setFields('startDate', date);
      store.setFields('endDate', date);
      store.setFields('title', 'テストプラン');

      const departure = createDefaultDeparture(date);
      const destination = createDefaultDestination(date);

      // 先にプランを作成
      store.addDateWithDefaultLocation(date, departure, destination);

      // スポットを追加
      const spot = createTestSpot(spotId, 1, date);
      store.setSpots(date, spot, false);

      // snapshot を設定（元の transportMethodId = 1）
      const route = createDepartureToSpotRoute('route-1', spotId, 1, 30);
      const planningResult = createPlanningResult(date, [route]);
      store.setPlanningResult(date, planningResult);

      // Act1: 異なる手段に切り替え（1 → 2）
      store.switchAlternativeRoute(date, 'route-1', 2);
      expect(store.isPlanningDirty(date)).toBe(true);

      // Act2: 元の手段に戻す（2 → 1）
      store.clearPlanningDirty(date);
      store.switchAlternativeRoute(date, 'route-1', 1);

      // Assert: 元の手段に戻したので dirtyフラグは立たない（isSameTransportMethodSelected = true の場合）
      expect(store.isPlanningDirty(date)).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('存在しないルートID の場合、状態は変わらない', () => {
      // Arrange
      const date = '2026-09-15';
      const spotId = 'spot-1';
      const store = useStoreForPlanning.getState();

      store.setFields('startDate', date);
      store.setFields('endDate', date);
      store.setFields('title', 'テストプラン');

      const departure = createDefaultDeparture(date);
      const destination = createDefaultDestination(date);

      // 先にプランを作成
      store.addDateWithDefaultLocation(date, departure, destination);

      // スポットを追加
      const spot = createTestSpot(spotId, 1, date);
      store.setSpots(date, spot, false);

      const route = createDepartureToSpotRoute('route-1', spotId, 1, 30);
      const planningResult = createPlanningResult(date, [route]);
      store.setPlanningResult(date, planningResult);

      const initialDeparture = store.getPlanInfo(date)?.departure ? { ...store.getPlanInfo(date)!.departure } : {};

      // Act
      store.switchAlternativeRoute(date, 'non-existent-id', 2);

      // Assert
      const updatedDeparture = store.getPlanInfo(date)?.departure;
      expect(updatedDeparture).toEqual(initialDeparture);
    });

    it('planningResult が存在しない場合、状態は変わらない', () => {
      // Arrange
      const date = '2026-09-15';
      const spotId = 'spot-1';
      const store = useStoreForPlanning.getState();

      store.setFields('startDate', date);
      store.setFields('endDate', date);
      store.setFields('title', 'テストプラン');

      const departure = createDefaultDeparture(date);
      const destination = createDefaultDestination(date);

      // 先にプランを作成
      store.addDateWithDefaultLocation(date, departure, destination);

      // スポットを追加
      const spot = createTestSpot(spotId, 1, date);
      store.setSpots(date, spot, false);

      const initialDeparture = store.getPlanInfo(date)?.departure ? { ...store.getPlanInfo(date)!.departure } : {};

      // Act
      store.switchAlternativeRoute('no-result-date', 'route-1', 2);

      // Assert
      const updatedDeparture = store.getPlanInfo(date)?.departure;
      expect(updatedDeparture).toEqual(initialDeparture);
    });
  });
});
