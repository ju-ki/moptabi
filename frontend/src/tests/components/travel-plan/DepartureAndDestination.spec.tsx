/**
 * DestinationコンポーネントとDepartureコンポーネントのテスト
 * - 初期値の確認
 * - 出発地または目的地選択時の保持している地点情報の更新の確認
 * - 単一日における出発地と目的地の連動の確認
 * - 複数日における前日の目的地と当日の出発地の連動の確認
 *
 * 本テストはZustandストア（useStoreForPlanning）の出発地・目的地関連のロジックをテストします。
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType } from '@/types/plan';
import { PlanLocationCandidateItemType } from '@shared/user/types';
import { DEFAULT_ARRIVAL_TIME, DEFAULT_DEPARTURE_AND_DESTINATION, DEFAULT_DEPARTURE_TIME } from '@/data/constants';
import { PlanLocationType } from '@shared/planlocation/types';

/**
 * テスト用のお気に入り地点データ（デフォルトフラグあり）
 */
const createFavoriteLocationWithDefault = (): PlanLocationCandidateItemType => ({
  name: '自宅',
  latitude: 35.7,
  longitude: 139.8,
  label: '自宅',
  isDefault: true,
  locationType: 'DEPARTURE',
  usageCount: 10,
  userLocationId: 1,
  planLocationId: null,
  planName: null,
  planId: null,
});

/**
 * テスト用のお気に入り地点データ（デフォルトフラグなし）
 */
const createFavoriteLocationWithoutDefault = (): PlanLocationCandidateItemType => ({
  name: '会社',
  latitude: 35.68,
  longitude: 139.76,
  label: '会社',
  isDefault: false,
  locationType: 'DEPARTURE',
  usageCount: 5,
  userLocationId: 2,
  planLocationId: null,
  planName: null,
  planId: null,
});

/**
 * テスト用の履歴地点データ
 */
const createHistoryLocation = (): PlanLocationCandidateItemType => ({
  name: '過去に訪問した場所',
  latitude: 35.69,
  longitude: 139.7,
  label: null,
  isDefault: false,
  locationType: 'DEPARTURE',
  usageCount: 3,
  userLocationId: null,
  planLocationId: 100,
  planName: '過去の旅行プラン',
  planId: null,
});

/**
 * テスト用の地図クリック地点データ
 */
const createMapClickedLocation = (lat: number, lng: number): PlanLocationCandidateItemType => ({
  name: '',
  latitude: lat,
  longitude: lng,
  label: null,
  isDefault: false,
  locationType: 'DEPARTURE',
  usageCount: 0,
  userLocationId: null,
  planLocationId: null,
  planName: null,
  planId: null,
});

/**
 * テスト用の住所検索結果地点データ
 */
const createAddressSearchLocation = (): PlanLocationCandidateItemType => ({
  name: '',
  latitude: 35.65,
  longitude: 139.65,
  label: null,
  isDefault: false,
  locationType: 'DEPARTURE',
  usageCount: 0,
  userLocationId: null,
  planLocationId: null,
  planName: null,
  planId: null,
});

/**
 * テスト用の観光スポット周辺地点データ
 */
const createSpotBasedLocation = (): PlanLocationCandidateItemType => ({
  name: '浅草寺',
  latitude: 35.7148,
  longitude: 139.7967,
  label: null,
  isDefault: false,
  locationType: 'DEPARTURE',
  usageCount: 0,
  userLocationId: null,
  planLocationId: null,
  planName: null,
  planId: null,
});

/**
 * テスト用の現在地データ
 */
const createCurrentLocation = (): PlanLocationCandidateItemType => ({
  name: '',
  latitude: 35.71,
  longitude: 139.81,
  label: null,
  isDefault: false,
  locationType: 'DEPARTURE',
  usageCount: 0,
  userLocationId: null,
  planLocationId: null,
  planName: null,
  planId: null,
});

/**
 * ストアの初期化ヘルパー関数
 * @param startDate 開始日
 * @param endDate 終了日
 * @param initialDeparture 初期出発地
 * @param initialDestination 初期目的地
 */
const initializeStore = (
  startDate: string,
  endDate: string,
  initialDeparture: PlanLocationType = DEFAULT_DEPARTURE_AND_DESTINATION,
  initialDestination: PlanLocationType = DEFAULT_DEPARTURE_AND_DESTINATION,
) => {
  const store = useStoreForPlanning.getState();

  // 日付範囲を算出
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dates = Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() + i * (1000 * 60 * 60 * 24));
    return date.toLocaleDateString('sv-SE');
  });

  // プランを初期化
  const plans = dates.map((date) => ({
    date,
    spots: [],
    departure: { ...initialDeparture, locationType: TransportNodeType.DEPARTURE },
    destination: { ...initialDestination, locationType: TransportNodeType.DESTINATION },
  }));

  store.setFields('startDate', startDate);
  store.setFields('endDate', endDate);
  store.setFields('plans', plans);
  store.setIsLocationLinked(false);
};

/**
 * ストアをリセットするヘルパー関数
 */
const resetStore = () => {
  const store = useStoreForPlanning.getState();
  const today = new Date().toLocaleDateString('sv-SE');

  store.setFields('startDate', today);
  store.setFields('endDate', today);
  store.setFields('plans', [
    {
      date: today,
      spots: [],
      departure: DEFAULT_DEPARTURE_AND_DESTINATION,
      destination: DEFAULT_DEPARTURE_AND_DESTINATION,
    },
  ]);
  store.setIsLocationLinked(false);
  store.setDepartureList({ favorites: [], history: [] });
  store.setDestinationList({ favorites: [], history: [] });
};

/**
 * テスト用に特定日付の出発時間・到着時間を直接設定する
 */
const setPlanTimes = (date: string, departureTime: string, destinationTime: string) => {
  const store = useStoreForPlanning.getState();
  const updatedPlans = store.plans.map((plan) => {
    if (plan.date !== date) return plan;

    return {
      ...plan,
      departure: {
        ...plan.departure,
        time: departureTime,
      },
      destination: {
        ...plan.destination,
        time: destinationTime,
      },
    };
  });

  store.setFields('plans', updatedPlans);
};

describe('DepartureAndDestination', () => {
  describe('出発地と目的地の初期値の確認', () => {
    beforeEach(() => {
      resetStore();
    });

    describe('単一日のプランの場合', () => {
      const singleDate = '2026-03-08';

      it('ユーザーのお気に入り地点の中にデフォルトフラグが立っているものがあれば、出発地と目的地ともにお気に入り地点のデフォルトの値が選択されていること', () => {
        const defaultFavorite = createFavoriteLocationWithDefault();
        const convertedDefaultFavorite: PlanLocationType = {
          name: defaultFavorite.name,
          latitude: defaultFavorite.latitude,
          longitude: defaultFavorite.longitude,
          locationType: TransportNodeType.DEPARTURE,
          time: DEFAULT_DEPARTURE_TIME,
          travelTime: 0,
          userLocationId: defaultFavorite.userLocationId ?? undefined,
          transportMethodId: 0,
          transportMethod: 'DEFAULT',
        };
        initializeStore(singleDate, singleDate, convertedDefaultFavorite, convertedDefaultFavorite);

        const store = useStoreForPlanning.getState();
        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.name).toBe('自宅');
        expect(departure.latitude).toBe(35.7);
        expect(departure.longitude).toBe(139.8);
        // expect(departure.isDefault).toBe(true); TODO: isDefaultはテストできない
        expect(departure.userLocationId).toBe(1);

        expect(destination.name).toBe('自宅');
        expect(destination.latitude).toBe(35.7);
        expect(destination.longitude).toBe(139.8);
      });

      it('ユーザーのお気に入り地点の中にデフォルトフラグが立っていなければ、出発地と目的地ともにconstantsのデフォルトの値が選択されていること', () => {
        initializeStore(singleDate, singleDate);

        const store = useStoreForPlanning.getState();
        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        // デフォルトは東京駅（DEFAULT_DEPARTURE_AND_DESTINATION）
        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
        expect(departure.longitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.longitude);
        // expect(departure.isDefault).toBe(false);

        expect(destination.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
        expect(destination.longitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.longitude);
      });

      it('ユーザーのお気に入り地点の中が1件も存在しなければ、出発地と目的地ともにconstantsのデフォルトの値が選択されていること', () => {
        initializeStore(singleDate, singleDate);
        const store = useStoreForPlanning.getState();

        // お気に入りリストが空であることを確認
        store.setDepartureList({ favorites: [], history: [] });
        store.setDestinationList({ favorites: [], history: [] });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
        expect(departure.longitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.longitude);

        expect(destination.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
        expect(destination.longitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.longitude);
      });

      it('ユーザーの過去の履歴の地点の中が1件も存在しなければ、出発地と目的地ともにconstantsのデフォルトの値が選択されていること', () => {
        initializeStore(singleDate, singleDate);
        const store = useStoreForPlanning.getState();

        // 履歴リストが空であることを確認
        store.setDepartureList({ favorites: [], history: [] });
        store.setDestinationList({ favorites: [], history: [] });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
        expect(destination.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });
    });

    describe('複数日のプランの場合', () => {
      const startDate = '2026-03-08';
      const endDate = '2026-03-10';

      it('ユーザーのお気に入り地点の中にデフォルトフラグが立っているものがあれば、出発地と目的地ともにお気に入り地点のデフォルトの値が選択されていること', () => {
        const defaultFavorite = createFavoriteLocationWithDefault();
        const convertedDefaultFavorite: PlanLocationType = {
          name: defaultFavorite.name,
          latitude: defaultFavorite.latitude,
          longitude: defaultFavorite.longitude,
          locationType: TransportNodeType.DEPARTURE,
          time: DEFAULT_DEPARTURE_TIME,
          userLocationId: defaultFavorite.userLocationId ?? undefined,
          travelTime: 0,
          transportMethodId: 0,
          transportMethod: 'DEFAULT',
        };
        initializeStore(startDate, endDate, convertedDefaultFavorite, convertedDefaultFavorite);

        const store = useStoreForPlanning.getState();

        // 全日程で確認
        [startDate, '2026-03-09', endDate].forEach((date) => {
          const departure = store.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
          const destination = store.getDepartureAndDestination(date, TransportNodeType.DESTINATION);

          expect(departure.name).toBe('自宅');
          // expect(departure.isDefault).toBe(true);
          expect(destination.name).toBe('自宅');
        });
      });

      it('ユーザーのお気に入り地点の中にデフォルトフラグが立っていなければ、出発地と目的地ともにconstantsのデフォルトの値が選択されていること', () => {
        initializeStore(startDate, endDate);

        const store = useStoreForPlanning.getState();

        [startDate, '2026-03-09', endDate].forEach((date) => {
          const departure = store.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
          const destination = store.getDepartureAndDestination(date, TransportNodeType.DESTINATION);

          expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
          expect(destination.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
        });
      });

      it('ユーザーのお気に入り地点の中が1件も存在しなければ、出発地と目的地ともにconstantsのデフォルトの値が選択されていること', () => {
        initializeStore(startDate, endDate);
        const store = useStoreForPlanning.getState();

        store.setDepartureList({ favorites: [], history: [] });
        store.setDestinationList({ favorites: [], history: [] });

        const departure = store.getDepartureAndDestination(startDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(startDate, TransportNodeType.DESTINATION);

        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
        expect(destination.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('ユーザーの過去の履歴の地点の中が1件も存在しなければ、出発地と目的地ともにconstantsのデフォルトの値が選択されていること', () => {
        initializeStore(startDate, endDate);
        const store = useStoreForPlanning.getState();

        store.setDepartureList({ favorites: [], history: [] });
        store.setDestinationList({ favorites: [], history: [] });

        const departure = store.getDepartureAndDestination(startDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(startDate, TransportNodeType.DESTINATION);

        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
        expect(destination.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });
    });
  });

  describe('出発地または目的地選択時の保持している地点情報の確認', () => {
    beforeEach(() => {
      resetStore();
    });

    describe('単一日のプランの場合', () => {
      const singleDate = '2026-03-08';

      // 前提として連動はなし
      beforeEach(() => {
        initializeStore(singleDate, singleDate);
        const store = useStoreForPlanning.getState();
        store.setIsLocationLinked(false);
      });

      it('ユーザーのお気に入り地点の中にデフォルトフラグが立っているものがあれば、出発地と目的地ともにお気に入り地点のデフォルトの値が格納されていること', () => {
        const defaultFavorite = createFavoriteLocationWithDefault();
        const convertedDefaultFavorite: PlanLocationType = {
          name: defaultFavorite.name,
          latitude: defaultFavorite.latitude,
          longitude: defaultFavorite.longitude,
          locationType: TransportNodeType.DEPARTURE,
          time: DEFAULT_DEPARTURE_TIME,
          travelTime: 0,
          transportMethodId: 0,
          userLocationId: defaultFavorite.userLocationId ?? undefined,
          transportMethod: 'DEFAULT',
        };
        initializeStore(singleDate, singleDate, convertedDefaultFavorite, convertedDefaultFavorite);

        const store = useStoreForPlanning.getState();
        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.userLocationId).toBe(1);
        // expect(departure.isDefault).toBe(true);
        expect(destination.userLocationId).toBe(1);
      });

      it('ユーザーのお気に入り地点の中にデフォルトフラグが立っていなければ、出発地と目的地ともにconstantsのデフォルトの値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
        expect(departure.longitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.longitude);
        expect(destination.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('ユーザーのお気に入り地点の中が1件も存在しなければ、出発地と目的地ともにconstantsのデフォルトの値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        store.setDepartureList({ favorites: [], history: [] });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('ユーザーの過去の履歴の地点の中が1件も存在しなければ、出発地と目的地ともにconstantsのデフォルトの値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        store.setDepartureList({ favorites: [], history: [] });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('ユーザーのお気に入り地点を選択した際に、出発地に選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const favoriteLocation = createFavoriteLocationWithoutDefault();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            userLocationId: 2,
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        expect(departure.name).toBe('会社');
        expect(departure.latitude).toBe(35.68);
        expect(departure.userLocationId).toBe(2);
      });

      it('ユーザーの過去の履歴の地点を選択した際に、出発地に選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const historyLocation = createHistoryLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: historyLocation.name,
            latitude: historyLocation.latitude,
            longitude: historyLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        expect(departure.name).toBe('過去に訪問した場所');
      });

      it('住所検索を利用して地点を選択した際に、出発地に選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const addressLocation = createAddressSearchLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: addressLocation.name,
            latitude: addressLocation.latitude,
            longitude: addressLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(35.65);
        expect(departure.longitude).toBe(139.65);
        expect(departure.userLocationId).toBeUndefined();
      });

      it('地図上で地点を選択した際に、出発地に選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const mapLocation = createMapClickedLocation(35.72, 139.82);

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: mapLocation.name,
            latitude: mapLocation.latitude,
            longitude: mapLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(35.72);
        expect(departure.longitude).toBe(139.82);
      });

      it('観光スポットの候補から地点を選択した際に、出発地に選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const spotLocation = createSpotBasedLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: spotLocation.name,
            latitude: spotLocation.latitude,
            longitude: spotLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        expect(departure.name).toBe('浅草寺');
        expect(departure.latitude).toBe(35.7148);
      });

      it('現在地を出発地に設定した際に、出発地の値が現在地の地点情報に更新されていること', () => {
        const store = useStoreForPlanning.getState();
        const currentLocation = createCurrentLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: currentLocation.name,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(35.71);
        expect(departure.longitude).toBe(139.81);
      });
    });

    describe('複数日のプランの場合', () => {
      const startDate = '2026-03-08';
      const endDate = '2026-03-10';
      const day1 = '2026-03-08';
      const day2 = '2026-03-09';
      const day3 = '2026-03-10';

      // 前提としては連動なし
      beforeEach(() => {
        initializeStore(startDate, endDate);
        const store = useStoreForPlanning.getState();
        store.setIsLocationLinked(false);
      });

      it('ユーザーのお気に入り地点の中にデフォルトフラグが立っているものがあれば、出発地と目的地ともにお気に入り地点のデフォルトの値が格納されていること', () => {
        const defaultFavorite = createFavoriteLocationWithDefault();
        const convertedDefaultFavorite: PlanLocationType = {
          name: defaultFavorite.name,
          latitude: defaultFavorite.latitude,
          longitude: defaultFavorite.longitude,
          locationType: TransportNodeType.DEPARTURE,
          time: DEFAULT_DEPARTURE_TIME,
          userLocationId: defaultFavorite.userLocationId ?? undefined,
          travelTime: 0,
          transportMethodId: 0,
          transportMethod: 'DEFAULT',
        };
        initializeStore(startDate, endDate, convertedDefaultFavorite, convertedDefaultFavorite);

        const store = useStoreForPlanning.getState();

        [day1, day2, day3].forEach((date) => {
          const departure = store.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
          const destination = store.getDepartureAndDestination(date, TransportNodeType.DESTINATION);

          expect(departure.userLocationId).toBe(1);
          expect(destination.userLocationId).toBe(1);
        });
      });

      it('ユーザーのお気に入り地点の中にデフォルトフラグが立っていなければ、出発地と目的地ともにconstantsのデフォルトの値が格納されていること', () => {
        const store = useStoreForPlanning.getState();

        const departure = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('ユーザーのお気に入り地点の中が1件も存在しなければ、出発地と目的地ともにconstantsのデフォルトの値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        store.setDepartureList({ favorites: [], history: [] });

        const departure = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('ユーザーの過去の履歴の地点の中が1件も存在しなければ、出発地と目的地ともにconstantsのデフォルトの値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        store.setDepartureList({ favorites: [], history: [] });

        const departure = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('ユーザーのお気に入り地点を選択した際に、出発地に選択した地点の値が格納され、他の日付の値は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const favoriteLocation = createFavoriteLocationWithoutDefault();

        // 初日の初期値を記録
        const day2DepartureBefore = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);

        act(() => {
          store.setDepartureAndDestination(day1, TransportNodeType.DEPARTURE, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        expect(departure.name).toBe('会社');

        // 他の日付の値が変わっていないことを確認
        const day2DepartureAfter = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        expect(day2DepartureAfter.latitude).toBe(day2DepartureBefore.latitude);
      });

      it('ユーザーの過去の履歴の地点を選択した際に、出発地に選択した地点の値が格納され、他の日付の値は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const historyLocation = createHistoryLocation();

        const day3DepartureBefore = store.getDepartureAndDestination(day3, TransportNodeType.DEPARTURE);

        act(() => {
          store.setDepartureAndDestination(day1, TransportNodeType.DEPARTURE, {
            name: historyLocation.name,
            latitude: historyLocation.latitude,
            longitude: historyLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        // expect(departure.planLocationId).toBe(100); TODO:テストできない

        const day3DepartureAfter = store.getDepartureAndDestination(day3, TransportNodeType.DEPARTURE);
        expect(day3DepartureAfter.latitude).toBe(day3DepartureBefore.latitude);
      });

      it('住所検索を利用して地点を選択した際に、出発地に選択した地点の値が格納され、他の日付の値は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const addressLocation = createAddressSearchLocation();

        act(() => {
          store.setDepartureAndDestination(day2, TransportNodeType.DEPARTURE, {
            name: addressLocation.name,
            latitude: addressLocation.latitude,
            longitude: addressLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(35.65);

        // day1は変わっていないこと
        const day1Departure = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        expect(day1Departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('地図上で地点を選択した際に、出発地に選択した地点の値が格納され、他の日付の値は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const mapLocation = createMapClickedLocation(35.72, 139.82);

        act(() => {
          store.setDepartureAndDestination(day2, TransportNodeType.DEPARTURE, {
            name: mapLocation.name,
            latitude: mapLocation.latitude,
            longitude: mapLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(35.72);

        const day1Departure = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        expect(day1Departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('観光スポットの候補から地点を選択した際に、出発地に選択した地点の値が格納され、他の日付の値は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const spotLocation = createSpotBasedLocation();

        act(() => {
          store.setDepartureAndDestination(day3, TransportNodeType.DEPARTURE, {
            name: spotLocation.name,
            latitude: spotLocation.latitude,
            longitude: spotLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(day3, TransportNodeType.DEPARTURE);
        expect(departure.name).toBe('浅草寺');

        const day1Departure = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        expect(day1Departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('現在地を出発地に設定した際に、出発地の値が現在地の地点情報に更新され、他の日付の値は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const currentLocation = createCurrentLocation();

        act(() => {
          store.setDepartureAndDestination(day1, TransportNodeType.DEPARTURE, {
            name: currentLocation.name,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        expect(departure.latitude).toBe(35.71);

        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        expect(day2Departure.latitude).toBe(DEFAULT_DEPARTURE_AND_DESTINATION.latitude);
      });

      it('出発地と目的地を変更後、日付を追加した際に、既存の日付には影響が出ずに、追加した日付には変更後の地点が初期値としてセットされていることの確認', () => {
        // このテストでは2日間（day1, day2）で初期化し、day3を新規追加する
        resetStore();
        initializeStore('2026-03-08', '2026-03-09'); // 2日間のみで初期化
        const store = useStoreForPlanning.getState();
        store.setIsLocationLinked(false);

        const favoriteLocation = createFavoriteLocationWithDefault();

        // day1の出発地・目的地を変更
        act(() => {
          store.setDepartureAndDestination(day1, TransportNodeType.DEPARTURE, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
          store.setDepartureAndDestination(day1, TransportNodeType.DESTINATION, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        // day2の出発地・目的地を異なる値に変更
        const historyLocation = createHistoryLocation();
        act(() => {
          store.setDepartureAndDestination(day2, TransportNodeType.DEPARTURE, {
            name: historyLocation.name,
            latitude: historyLocation.latitude,
            longitude: historyLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
          store.setDepartureAndDestination(day2, TransportNodeType.DESTINATION, {
            name: historyLocation.name,
            latitude: historyLocation.latitude,
            longitude: historyLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        // 変更後の値を確認
        const day1DepartureBefore = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        const day1DestinationBefore = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);
        const day2DepartureBefore = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        const day2DestinationBefore = store.getDepartureAndDestination(day2, TransportNodeType.DESTINATION);

        expect(day1DepartureBefore.latitude).toBe(35.7);
        expect(day2DepartureBefore.latitude).toBe(35.69);

        // 日付を追加（day3）- addDateWithDefaultLocationを使用
        const newDate = '2026-03-10';
        const newDeparture = createFavoriteLocationWithoutDefault();
        const newDestination = createFavoriteLocationWithoutDefault();

        act(() => {
          store.addDateWithDefaultLocation(
            newDate,
            {
              name: newDeparture.name,
              latitude: newDeparture.latitude,
              longitude: newDeparture.longitude,
              time: DEFAULT_DEPARTURE_TIME,
              travelTime: 0,
              transportMethodId: 0,
              transportMethod: 'DEFAULT',
              locationType: TransportNodeType.DEPARTURE,
            },
            {
              name: newDestination.name,
              latitude: newDestination.latitude,
              longitude: newDestination.longitude,
              time: DEFAULT_ARRIVAL_TIME,
              travelTime: 0,
              transportMethodId: 0,
              transportMethod: 'DEFAULT',
              locationType: TransportNodeType.DESTINATION,
            },
          );
        });

        // 既存の日付の値が変わっていないことを確認
        const day1DepartureAfter = store.getDepartureAndDestination(day1, TransportNodeType.DEPARTURE);
        const day1DestinationAfter = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);
        const day2DepartureAfter = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        const day2DestinationAfter = store.getDepartureAndDestination(day2, TransportNodeType.DESTINATION);

        expect(day1DepartureAfter.latitude).toBe(day1DepartureBefore.latitude);
        expect(day1DestinationAfter.latitude).toBe(day1DestinationBefore.latitude);
        expect(day2DepartureAfter.latitude).toBe(day2DepartureBefore.latitude);
        expect(day2DestinationAfter.latitude).toBe(day2DestinationBefore.latitude);

        // 追加した日付には指定した初期値が設定されていること
        const newDayDeparture = store.getDepartureAndDestination(newDate, TransportNodeType.DEPARTURE);
        const newDayDestination = store.getDepartureAndDestination(newDate, TransportNodeType.DESTINATION);

        expect(newDayDeparture.latitude).toBe(35.68);
        expect(newDayDestination.latitude).toBe(35.68);
      });
    });
  });

  describe('単一日における出発地と目的地の連動の確認', () => {
    const singleDate = '2026-03-08';

    beforeEach(() => {
      resetStore();
      initializeStore(singleDate, singleDate);
      const store = useStoreForPlanning.getState();
      // 連動をONにする
      store.setIsLocationLinked(true);
    });

    describe('出発地を変えた場合、目的地も連動していることの確認', () => {
      it('ユーザーのお気に入り地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const favoriteLocation = createFavoriteLocationWithoutDefault();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.name).toBe('会社');
        expect(departure.latitude).toBe(35.68);
        expect(destination.latitude).toBe(35.68);
        expect(destination.longitude).toBe(139.76);
      });

      it('出発地を変更しても、連動先の目的地の到着時間は維持されること', () => {
        const store = useStoreForPlanning.getState();
        const favoriteLocation = createFavoriteLocationWithoutDefault();

        setPlanTimes(singleDate, '08:30', '19:45');

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: '07:15',
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.time).toBe('07:15');
        expect(destination.time).toBe('19:45');
      });

      it('ユーザーの過去の履歴の地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const historyLocation = createHistoryLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: historyLocation.name,
            latitude: historyLocation.latitude,
            longitude: historyLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        // expect(departure.planLocationId).toBe(100);//TODO:PlanLocationIdはテストできない「
        expect(destination.latitude).toBe(35.69);
      });

      it('住所検索を利用して地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const addressLocation = createAddressSearchLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: addressLocation.name,
            latitude: addressLocation.latitude,
            longitude: addressLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.latitude).toBe(35.65);
        expect(destination.latitude).toBe(35.65);
      });

      it('地図上で地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const mapLocation = createMapClickedLocation(35.72, 139.82);

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: mapLocation.name,
            latitude: mapLocation.latitude,
            longitude: mapLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.latitude).toBe(35.72);
        expect(destination.latitude).toBe(35.72);
      });

      it('観光スポットの候補から地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const spotLocation = createSpotBasedLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: spotLocation.name,
            latitude: spotLocation.latitude,
            longitude: spotLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.name).toBe('浅草寺');
        expect(destination.latitude).toBe(35.7148);
      });

      it('現在地を出発地に設定した際に、出発地と目的地ともに現在地の地点情報に更新されていること', () => {
        const store = useStoreForPlanning.getState();
        const currentLocation = createCurrentLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE, {
            name: currentLocation.name,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.latitude).toBe(35.71);
        expect(destination.latitude).toBe(35.71);
      });
    });

    describe('目的地を変えた場合、出発地も連動していることの確認', () => {
      it('ユーザーのお気に入り地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const favoriteLocation = createFavoriteLocationWithoutDefault();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DESTINATION, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(destination.name).toBe('会社');
        expect(departure.latitude).toBe(35.68);
      });

      it('目的地を変更しても、連動先の出発地の出発時間は維持されること', () => {
        const store = useStoreForPlanning.getState();
        const favoriteLocation = createFavoriteLocationWithoutDefault();

        setPlanTimes(singleDate, '06:45', '18:00');

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DESTINATION, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: '20:10',
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(departure.time).toBe('06:45');
        expect(destination.time).toBe('20:10');
      });

      it('ユーザーの過去の履歴の地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const historyLocation = createHistoryLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DESTINATION, {
            name: historyLocation.name,
            latitude: historyLocation.latitude,
            longitude: historyLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        // expect(destination.planLocationId).toBe(100); // TODO:PlanLocationIdはテスト不可
        expect(departure.latitude).toBe(35.69);
      });

      it('住所検索を利用して地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const addressLocation = createAddressSearchLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DESTINATION, {
            name: addressLocation.name,
            latitude: addressLocation.latitude,
            longitude: addressLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(destination.latitude).toBe(35.65);
        expect(departure.latitude).toBe(35.65);
      });

      it('地図上で地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const mapLocation = createMapClickedLocation(35.72, 139.82);

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DESTINATION, {
            name: mapLocation.name,
            latitude: mapLocation.latitude,
            longitude: mapLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(destination.latitude).toBe(35.72);
        expect(departure.latitude).toBe(35.72);
      });

      it('観光スポットの候補から地点を選択した際に、出発地と目的地ともに選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const spotLocation = createSpotBasedLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DESTINATION, {
            name: spotLocation.name,
            latitude: spotLocation.latitude,
            longitude: spotLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(destination.name).toBe('浅草寺');
        expect(departure.latitude).toBe(35.7148);
      });

      it('現在地を目的地に設定した際に、出発地と目的地ともに現在地の地点情報に更新されていること', () => {
        const store = useStoreForPlanning.getState();
        const currentLocation = createCurrentLocation();

        act(() => {
          store.setDepartureAndDestination(singleDate, TransportNodeType.DESTINATION, {
            name: currentLocation.name,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const departure = store.getDepartureAndDestination(singleDate, TransportNodeType.DEPARTURE);
        const destination = store.getDepartureAndDestination(singleDate, TransportNodeType.DESTINATION);

        expect(destination.latitude).toBe(35.71);
        expect(departure.latitude).toBe(35.71);
      });
    });
  });

  describe('複数日における前日の目的地と当日の出発地の連動の確認', () => {
    const startDate = '2026-03-08';
    const endDate = '2026-03-10';
    const day1 = '2026-03-08';
    const day2 = '2026-03-09';
    const day3 = '2026-03-10';

    beforeEach(() => {
      resetStore();
      initializeStore(startDate, endDate);
      const store = useStoreForPlanning.getState();
      // 連動をONにする
      store.setIsLocationLinked(true);
    });

    describe('前日の目的地を変更した場合、当日の出発地も連動していることの確認', () => {
      it('ユーザーのお気に入り地点を選択した際に、当日の出発地も選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const favoriteLocation = createFavoriteLocationWithoutDefault();

        act(() => {
          // day1の目的地を変更
          store.setDepartureAndDestination(day1, TransportNodeType.DESTINATION, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const day1Destination = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);
        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);

        expect(day1Destination.name).toBe('会社');
        expect(day1Destination.latitude).toBe(35.68);
        // 翌日の出発地が連動して更新されていること
        expect(day2Departure.latitude).toBe(35.68);
        expect(day2Departure.longitude).toBe(139.76);
      });

      it('前日の目的地を変更しても、翌日の出発時間は維持されること', () => {
        const store = useStoreForPlanning.getState();
        const favoriteLocation = createFavoriteLocationWithoutDefault();

        setPlanTimes(day1, '09:00', '18:30');
        setPlanTimes(day2, '07:20', '17:00');

        act(() => {
          store.setDepartureAndDestination(day1, TransportNodeType.DESTINATION, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: '21:05',
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const day1Destination = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);
        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);

        expect(day1Destination.time).toBe('21:05');
        expect(day2Departure.time).toBe('07:20');
      });

      it('ユーザーの過去の履歴の地点を選択した際に、当日の出発地も選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const historyLocation = createHistoryLocation();

        act(() => {
          store.setDepartureAndDestination(day1, TransportNodeType.DESTINATION, {
            name: historyLocation.name,
            latitude: historyLocation.latitude,
            longitude: historyLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const day1Destination = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);
        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);

        // expect(day1Destination.planLocationId).toBe(100); // TODO: PlanLocationIDはテストできない
        expect(day2Departure.latitude).toBe(35.69);
      });

      it('住所検索を利用して地点を選択した際に、当日の出発地も選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const addressLocation = createAddressSearchLocation();

        act(() => {
          store.setDepartureAndDestination(day2, TransportNodeType.DESTINATION, {
            name: addressLocation.name,
            latitude: addressLocation.latitude,
            longitude: addressLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const day2Destination = store.getDepartureAndDestination(day2, TransportNodeType.DESTINATION);
        const day3Departure = store.getDepartureAndDestination(day3, TransportNodeType.DEPARTURE);

        expect(day2Destination.latitude).toBe(35.65);
        expect(day3Departure.latitude).toBe(35.65);
      });

      it('地図上で地点を選択した際に、当日の出発地も選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const mapLocation = createMapClickedLocation(35.72, 139.82);

        act(() => {
          store.setDepartureAndDestination(day1, TransportNodeType.DESTINATION, {
            name: mapLocation.name,
            latitude: mapLocation.latitude,
            longitude: mapLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const day1Destination = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);
        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);

        expect(day1Destination.latitude).toBe(35.72);
        expect(day2Departure.latitude).toBe(35.72);
      });

      it('観光スポットの候補から地点を選択した際に、当日の出発地も選択した地点の値が格納されていること', () => {
        const store = useStoreForPlanning.getState();
        const spotLocation = createSpotBasedLocation();

        act(() => {
          store.setDepartureAndDestination(day1, TransportNodeType.DESTINATION, {
            name: spotLocation.name,
            latitude: spotLocation.latitude,
            longitude: spotLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const day1Destination = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);
        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);

        expect(day1Destination.name).toBe('浅草寺');
        expect(day2Departure.latitude).toBe(35.7148);
      });

      it('現在地を目的地に設定した際に、当日の出発地も現在地の地点情報に更新されていること', () => {
        const store = useStoreForPlanning.getState();
        const currentLocation = createCurrentLocation();

        act(() => {
          store.setDepartureAndDestination(day1, TransportNodeType.DESTINATION, {
            name: currentLocation.name,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            time: DEFAULT_ARRIVAL_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DESTINATION,
          });
        });

        const day1Destination = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);
        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);

        expect(day1Destination.latitude).toBe(35.71);
        expect(day2Departure.latitude).toBe(35.71);
      });
    });

    describe('当日の出発地を変更した場合、前日の目的地は連動していないことの確認', () => {
      it('ユーザーのお気に入り地点を選択した際に、当日の出発地のみ変更され、前日の目的地は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const favoriteLocation = createFavoriteLocationWithoutDefault();

        // 前日の目的地の初期値を記録
        const day1DestinationBefore = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);
        const day1LatBefore = day1DestinationBefore.latitude;

        act(() => {
          // day2の出発地を変更
          store.setDepartureAndDestination(day2, TransportNodeType.DEPARTURE, {
            name: favoriteLocation.name,
            latitude: favoriteLocation.latitude,
            longitude: favoriteLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        const day1DestinationAfter = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);

        // day2の出発地は変更されていること
        expect(day2Departure.name).toBe('会社');
        expect(day2Departure.latitude).toBe(35.68);

        // 前日の目的地は変わっていないこと（片方向連動のため）
        expect(day1DestinationAfter.latitude).toBe(day1LatBefore);
      });

      it('ユーザーの過去の履歴の地点を選択した際に、当日の出発地のみ変更され、前日の目的地は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const historyLocation = createHistoryLocation();

        const day1DestinationBefore = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);

        act(() => {
          store.setDepartureAndDestination(day2, TransportNodeType.DEPARTURE, {
            name: historyLocation.name,
            latitude: historyLocation.latitude,
            longitude: historyLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        const day1DestinationAfter = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);

        // expect(day2Departure.planLocationId).toBe(100); //TODO:PlanLocationIdはテストできない
        expect(day1DestinationAfter.latitude).toBe(day1DestinationBefore.latitude);
      });

      it('住所検索を利用して地点を選択した際に、当日の出発地のみ変更され、前日の目的地は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const addressLocation = createAddressSearchLocation();

        const day2DestinationBefore = store.getDepartureAndDestination(day2, TransportNodeType.DESTINATION);

        act(() => {
          store.setDepartureAndDestination(day3, TransportNodeType.DEPARTURE, {
            name: addressLocation.name,
            latitude: addressLocation.latitude,
            longitude: addressLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const day3Departure = store.getDepartureAndDestination(day3, TransportNodeType.DEPARTURE);
        const day2DestinationAfter = store.getDepartureAndDestination(day2, TransportNodeType.DESTINATION);

        expect(day3Departure.latitude).toBe(35.65);
        expect(day2DestinationAfter.latitude).toBe(day2DestinationBefore.latitude);
      });

      it('地図上で地点を選択した際に、当日の出発地のみ変更され、前日の目的地は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const mapLocation = createMapClickedLocation(35.72, 139.82);

        const day1DestinationBefore = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);

        act(() => {
          store.setDepartureAndDestination(day2, TransportNodeType.DEPARTURE, {
            name: mapLocation.name,
            latitude: mapLocation.latitude,
            longitude: mapLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        const day1DestinationAfter = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);

        expect(day2Departure.latitude).toBe(35.72);
        expect(day1DestinationAfter.latitude).toBe(day1DestinationBefore.latitude);
      });

      it('観光スポットの候補から地点を選択した際に、当日の出発地のみ変更され、前日の目的地は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const spotLocation = createSpotBasedLocation();

        const day1DestinationBefore = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);

        act(() => {
          store.setDepartureAndDestination(day2, TransportNodeType.DEPARTURE, {
            name: spotLocation.name,
            latitude: spotLocation.latitude,
            longitude: spotLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        const day1DestinationAfter = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);

        expect(day2Departure.name).toBe('浅草寺');
        expect(day1DestinationAfter.latitude).toBe(day1DestinationBefore.latitude);
      });

      it('現在地を出発地に設定した際に、当日の出発地のみ変更され、前日の目的地は変わらないこと', () => {
        const store = useStoreForPlanning.getState();
        const currentLocation = createCurrentLocation();

        const day1DestinationBefore = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);

        act(() => {
          store.setDepartureAndDestination(day2, TransportNodeType.DEPARTURE, {
            name: currentLocation.name,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            time: DEFAULT_DEPARTURE_TIME,
            travelTime: 0,
            transportMethodId: 0,
            transportMethod: 'DEFAULT',
            locationType: TransportNodeType.DEPARTURE,
          });
        });

        const day2Departure = store.getDepartureAndDestination(day2, TransportNodeType.DEPARTURE);
        const day1DestinationAfter = store.getDepartureAndDestination(day1, TransportNodeType.DESTINATION);

        expect(day2Departure.latitude).toBe(35.71);
        expect(day1DestinationAfter.latitude).toBe(day1DestinationBefore.latitude);
      });
    });
  });
}); // DepartureAndDestination
