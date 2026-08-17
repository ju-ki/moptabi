import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  ExtendPlanLocationType,
  ExtendSpotType,
  PlanErrorType,
  SearchSpotByCategoryParams,
  Spot,
  TransportNodeType,
  TravelModeType,
  TravelPlanType,
} from '@/types/plan';
import {  PlanLocationCandidatesResponse } from '@/models/planLocation';
import { DEFAULT_ARRIVAL_TIME, DEFAULT_DEPARTURE_AND_DESTINATION, DEFAULT_DEPARTURE_TIME } from '@/data/constants';

import { getPrefectures } from './algorithm';
import { formatOpeningHours } from './google-maps';
import { getDatesBetween } from './utils';
import { hasDirtyDepartureAndDestinationChange, hasDirtySpotChange, PlanningInfo, PlanningResult } from './planning';
import { TripType } from '@shared/trip/types';
import { PlanLocationType } from '@shared/planlocation/types';

export type FormData = TripType;

/**
 * スポット配列をディープコピーし、スナップショット保存/復元時の参照共有を防ぐ。
 * @param spots コピー対象のスポット配列
 * @returns ディープコピー済みのスポット配列
 */
function cloneSpots(spots: ExtendSpotType[]): ExtendSpotType[] {
  return JSON.parse(JSON.stringify(spots)) as ExtendSpotType[];
}

/**
 * 出発地・目的地情報をディープコピーし、スナップショット保存/復元時の参照共有を防ぐ。
 * @param depAndDest コピー対象の出発地・目的地情報
 * @returns ディープコピー済みの出発地・目的地情報
 */
function cloneDepartureAndDestination(depAndDest: ExtendPlanLocationType): ExtendPlanLocationType {
  return JSON.parse(JSON.stringify(depAndDest)) as ExtendPlanLocationType;
}

type PlanningInitialState = Pick<
  FormState,
  | 'id'
  | 'title'
  | 'imageUrl'
  | 'startDate'
  | 'endDate'
  | 'plans'
  | 'departureList'
  | 'destinationList'
  | 'isLocationLinked'
  | 'errors'
  | 'planErrors'
  | 'spotErrors'
  | 'planningInfo'
  | 'planningResults'
  | 'planningSpotSnapshots'
  | 'planningDepartureSnapshots'
  | 'planningDestinationSnapshots'
  | 'dirtyPlanningDates'
  | 'simulationStatus'
>;

/**
 * プラン作成画面のストア初期値をまとめて生成する。
 * @returns プラン作成画面の初期状態
 */
function createPlanningInitialState(): PlanningInitialState {
  return {
    id: undefined,
    title: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    plans: [],
    departureList: { favorites: [], history: [] },
    destinationList: { favorites: [], history: [] },
    isLocationLinked: false,
    errors: {},
    planErrors: {},
    spotErrors: {},
    planningInfo: {},
    planningResults: {},
    planningSpotSnapshots: {},
    planningDepartureSnapshots: {},
    planningDestinationSnapshots: {},
    dirtyPlanningDates: {},
    simulationStatus: null,
  };
}

/**
 * 地点連動時に、元の地点情報を引き継ぎつつ時刻だけは現在値を保持した地点情報を作る。
 * @param source 連動元の地点情報
 * @param current 時刻を保持したい現在の地点情報
 * @param name 連動後に設定する地点名
 * @param locationType 上書きしたい地点種別
 * @returns 時刻を保持した連動後の地点情報
 */
function copyLinkedLocationPreservingTime(
  source: ExtendPlanLocationType,
  current: ExtendPlanLocationType,
  name: string,
  locationType?: TransportNodeType,
): ExtendPlanLocationType {
  return {
    ...source,
    name,
    time: current.time,
    locationType: locationType ?? source.locationType,
  };
}

type SpotCoordinationResult = {
  spotCoordination: ExtendSpotType[];
};

interface FormState {
  id?: number;
  title: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  plans: TravelPlanType[];
  departureList: PlanLocationCandidatesResponse;
  destinationList: PlanLocationCandidatesResponse;
  /** 出発地・目的地連動チェックボックスの状態 */
  isLocationLinked: boolean;
  errors: Partial<Record<keyof FormData, string>>;
  planErrors: Record<string, Record<PlanErrorType, string>>;
  spotErrors: Partial<Record<string, Partial<Record<keyof Spot, string>>>>;
  /** プランニング必要な情報 */
  planningInfo: Record<string, PlanningInfo>;
  /** プランニング情報を取得 */
  getPlanningInfo: (date: string) => PlanningInfo;
  /** プランニング情報を設定 */
  setPlanningInfo: (date: string, info: PlanningInfo) => void;
  /** 日付ごとのプランニング結果 */
  planningResults: Record<string, PlanningResult>;
  /** 前回プランニング時点のスポット情報スナップショット */
  planningSpotSnapshots: Record<string, ExtendSpotType[]>;
  /** 前回プランニング時点の出発地・目的地情報スナップショット */
  planningDepartureSnapshots: Record<string, ExtendPlanLocationType>;
  planningDestinationSnapshots: Record<string, ExtendPlanLocationType>;
  /** 再プランニングが必要な日付 */
  dirtyPlanningDates: Record<string, boolean>;
  /** プランニング結果を設定 */
  setPlanningResult: (date: string, result: PlanningResult) => void;
  /** プランニング結果を取得 */
  getPlanningResult: (date: string) => PlanningResult | undefined;
  /** プランニング結果をクリア */
  clearPlanningResult: (date: string) => void;
  /** 日付単位のdirty状態を取得 */
  isPlanningDirty: (date: string) => boolean;
  /** dirty状態の日付一覧を取得 */
  getDirtyPlanningDates: () => string[];
  /** 日付単位のdirty状態を解除 */
  clearPlanningDirty: (date: string) => void;
  /** 前回プランニング時点のスポットへ復元 */
  restorePlannedSpots: (date: string) => void;
  setDepartureList: (list: PlanLocationCandidatesResponse) => void;
  setDestinationList: (list: PlanLocationCandidatesResponse) => void;
  /** 出発地・目的地連動チェックボックスの状態を設定 */
  setIsLocationLinked: (isLinked: boolean) => void;
  getPlanInfo: (date: string) => TravelPlanType | undefined;
  setPlanInfo: (date: string, info: TravelPlanType) => void;
  deletePlanInfo: (date: string[]) => void;
  getSpotInfo: (date: string, type: TransportNodeType | null) => ExtendSpotType[];
  simulationStatus: { date: string; status: number }[] | null;
  setSimulationStatus: (status: { date: string; status: number }) => void;
  getDepartureAndDestination: (date: string, type: TransportNodeType) => ExtendPlanLocationType;
  setDepartureAndDestination: (date: string, type: TransportNodeType, value: ExtendPlanLocationType) => void;
  setSpots: (date: string, spot: ExtendSpotType, isDeleted: boolean) => void;
  editSpots: (date: string, spotId: string, updatedSpot: Partial<ExtendSpotType>) => void;
  getFields: <K extends keyof FormState>(field: K) => FormState[K];
  setFields: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  setErrors: (errors: Partial<Record<keyof FormData, string>>) => void;
  setSpotErrors: (date: string, errors: Partial<Record<keyof Spot, string>>) => void;
  getPlanErrors: (date: string) => Partial<Record<PlanErrorType, string>> | undefined;
  setPlanErrors: (date: string, errors: Partial<Record<PlanErrorType, string>>) => void;
  setRangeDate: (date: { from: string | undefined; to: string | undefined } | undefined) => void;
  getSpotCoordination: (date: string) => SpotCoordinationResult | undefined;
  /** 新規日付を追加。既存の日付は変更せず、新規日付にのみデフォルト値を設定 */
  addDateWithDefaultLocation: (
    date: string,
    defaultDeparture: ExtendPlanLocationType,
    defaultDestination: ExtendPlanLocationType,
  ) => void;
  resetErrors: () => void;
  resetForm: () => void;
  resetPlanningStore: () => void;
  /** 代替ルートに切り替え */
  switchAlternativeRoute: (date: string, routeId: string, selectedTransportMethodId: number) => void;
}

export const useStoreForPlanning = create<FormState>()(
  immer(
    devtools((set, get) => ({
      ...createPlanningInitialState(),
      setSimulationStatus: (status) => {
        set((state) => {
          if (state.simulationStatus) {
            const existingStatusIndex = state.simulationStatus.findIndex((info) => info.date === status.date);
            if (existingStatusIndex >= 0) {
              state.simulationStatus[existingStatusIndex] = {
                ...state.simulationStatus[existingStatusIndex],
                status: status.status,
              };
            } else {
              state.simulationStatus.push({
                date: status.date,
                status: status.status,
              });
            }
          } else {
            state.simulationStatus = [
              {
                date: status.date,
                status: status.status,
              },
            ];
          }
        });
      },
      getPlanningInfo: (date) => {
        return get().planningInfo[date];
      },
      setPlanningInfo: (date, info) => {
        set((state) => {
          state.planningInfo[date] = info;
        });
      },
      setPlanningResult: (date, result) => {
        set((state) => {
          state.planningResults[date] = result;
          const plansForDate = state.plans.find((plan) => plan.date === date);
          if (plansForDate) {
            state.planningSpotSnapshots[date] = cloneSpots(plansForDate.spots);
            state.planningDepartureSnapshots[date] = cloneDepartureAndDestination(plansForDate.departure);
            state.planningDestinationSnapshots[date] = cloneDepartureAndDestination(plansForDate.destination);
          }
          delete state.dirtyPlanningDates[date];
        });
      },
      getPlanningResult: (date) => {
        return get().planningResults[date];
      },
      clearPlanningResult: (date) => {
        set((state) => {
          delete state.planningResults[date];
        });
      },
      /**
       * 指定日付がdirty状態かを判定する。
       * @param date 判定対象の日付
       * @returns dirty状態の場合はtrue
       */
      isPlanningDirty: (date) => {
        return !!get().dirtyPlanningDates[date];
      },
      /**
       * dirty状態の全日付を列挙する。
       * @returns dirty状態の日付配列
       */
      getDirtyPlanningDates: () => {
        const dirtyPlanningDates = get().dirtyPlanningDates;
        return Object.keys(dirtyPlanningDates).filter((date) => dirtyPlanningDates[date]);
      },
      /**
       * 指定日付のdirty状態を解除する。
       * @param date dirty解除対象の日付
       * @returns なし
       */
      clearPlanningDirty: (date) => {
        set((state) => {
          delete state.dirtyPlanningDates[date];
        });
      },
      /**
       * 指定日付のスポット情報を前回プランニング時点のスナップショットへ復元する。
       * @param date 復元対象の日付
       * @returns なし
       */
      restorePlannedSpots: (date) => {
        set((state) => {
          const plannedSpotsSnapshot = state.planningSpotSnapshots[date];
          const plannedDepartureSnapshot = state.planningDepartureSnapshots[date];
          const plannedDestinationSnapshot = state.planningDestinationSnapshots[date];

          if (!plannedSpotsSnapshot || !plannedDepartureSnapshot || !plannedDestinationSnapshot) return;

          const plansForDateIndex = state.plans.findIndex((plan) => plan.date === date);
          if (plansForDateIndex < 0) return;

          state.plans[plansForDateIndex].spots = cloneSpots(plannedSpotsSnapshot);
          state.plans[plansForDateIndex].departure = cloneDepartureAndDestination(plannedDepartureSnapshot);
          state.plans[plansForDateIndex].destination = cloneDepartureAndDestination(plannedDestinationSnapshot);

          delete state.dirtyPlanningDates[date];
        });
      },
      setDepartureList: (list) => set((state) => ({ ...state, departureList: list })),
      setDestinationList: (list) => set((state) => ({ ...state, destinationList: list })),
      setIsLocationLinked: (isLinked) => set((state) => ({ ...state, isLocationLinked: isLinked })),
      getSpotInfo: (date, type: TransportNodeType | null = null) => {
        const plansForDate = get().plans.filter((plan) => plan.date === date);
        if (plansForDate.length > 0) { if (type === TransportNodeType.SPOT) {
            return plansForDate[0].spots
              .sort((a, b) => a.order - b.order);
          } else {
            return [...plansForDate[0].spots].sort((a, b) => a.order - b.order);
          }
        }
        return [];
      },
      getPlanInfo: (date) => {
        const plansForDate = get().plans.filter((plan) => plan.date === date);
        if (plansForDate.length == 0) {
          return undefined;
        }
        return plansForDate[0];
      },
      setPlanInfo: (date, info) => {
        set((state) => {
          const existingPlansIndex = state.plans.findIndex((plan) => plan.date === date);
          // 既存のプランがないことはないため、その場合はスキップ
          if (existingPlansIndex < 0) {
            return;
          }
          state.plans[existingPlansIndex] = info;
        });
      },
      deletePlanInfo: (date) => {
        set((state) => {
          state.plans = state.plans.filter((plan) => !date.includes(plan.date));
          // プラン削除に伴い、日付に紐づく関連データも削除
          date.forEach((d) => {
            delete state.planningInfo[d];
            delete state.planningResults[d];
            delete state.planningSpotSnapshots[d];
            delete state.planningDepartureSnapshots[d];
            delete state.planningDestinationSnapshots[d];
            delete state.dirtyPlanningDates[d];
            delete state.planErrors[d];
            delete state.spotErrors[d];
          });
          if (state.simulationStatus) {
            state.simulationStatus = state.simulationStatus.filter((s) => !date.includes(s.date));
            if (state.simulationStatus.length === 0) state.simulationStatus = null;
          }
        });
      },
      setDepartureAndDestination: (date, type, value) => {
        set((state) => {
          // 日数を計算
          const dates = getDatesBetween(new Date(state.startDate), new Date(state.endDate));
          const isSingleDay = dates.length === 1;
          const currentDayIndex = dates.indexOf(date);
          const previousDate = dates[currentDayIndex - 1];
          const previousDayPlan = state.plans.find((plan) => plan.date === previousDate);
          const existingPlansIndex = state.plans.findIndex((info) => info.date === date);
          if (existingPlansIndex < 0 && type == TransportNodeType.DEPARTURE) {
            state.plans.push({
              date: date,
              spots: [],
              departure: value,
              destination: {} as ExtendPlanLocationType,
            });
            return;
          } else if (existingPlansIndex < 0 && type == TransportNodeType.DESTINATION) {
            state.plans.push({
              date: date,
              spots: [],
              departure: {} as ExtendPlanLocationType,
              destination: value,
            });
            return;
          }
          const hasPlanningSnapshot = !!state.planningSpotSnapshots[date];
          const currentDepartureAndDestination =
            type === TransportNodeType.DEPARTURE
              ? state.plans[existingPlansIndex].departure
              : state.plans[existingPlansIndex].destination;

          if (type === TransportNodeType.DEPARTURE) {
            state.plans[existingPlansIndex].departure = {
              ...value,
              name: value.name === '' ? '出発地_' + date : value.name,
            };
          }
          if (type === TransportNodeType.DESTINATION) {
            state.plans[existingPlansIndex].destination = {
              ...value,
              name: value.name === '' ? '目的地_' + date : value.name,
            };
          }

          if (hasPlanningSnapshot && hasDirtyDepartureAndDestinationChange(currentDepartureAndDestination, value)) {
            state.dirtyPlanningDates[date] = true;
          }

          if (isSingleDay && state.isLocationLinked) {
            const oppositeType = type === TransportNodeType.DEPARTURE ? 'destination' : 'departure';
            const currentOppositeLocation = state.plans[existingPlansIndex][oppositeType];
            const linkedLocationName =
              value.name === '' ? (oppositeType === 'departure' ? '出発地_' + date : '目的地_' + date) : value.name;
            const linkedLocationType =
              oppositeType === 'departure' ? TransportNodeType.DEPARTURE : TransportNodeType.DESTINATION;

            // 名前が空の場合は、登録値に合わせたデフォルトの名前を入れる
            if (value.name === '') {
              state.plans[existingPlansIndex][oppositeType] = copyLinkedLocationPreservingTime(
                value,
                currentOppositeLocation,
                linkedLocationName,
                linkedLocationType,
              );
              return;
            }

            // 連動ONの場合でも、出発時間または到着時間は連動させない
            state.plans[existingPlansIndex][oppositeType] = copyLinkedLocationPreservingTime(
              value,
              currentOppositeLocation,
              linkedLocationName,
              linkedLocationType,
            );
          }
          if (state.isLocationLinked && type === TransportNodeType.DESTINATION) {
            // 複数日の場合は、当日の目的地を翌日の出発地に連動させる(片方向)
            const nextDate = dates[currentDayIndex + 1];
            const nextDayPlanIndex = state.plans.findIndex((plan) => plan.date === nextDate);
            if (!isSingleDay && nextDayPlanIndex > 0) {
              // 連動ONの場合でも、出発時間または到着時間は連動させない
              state.plans[nextDayPlanIndex].departure = copyLinkedLocationPreservingTime(
                value,
                state.plans[nextDayPlanIndex].departure,
                value.name === '' ? '出発地_' + nextDate : value.name,
                TransportNodeType.DEPARTURE,
              );
            }

            const hasPlanningNextDateSnapshot = !!state.planningSpotSnapshots[nextDate];

            if (
              hasPlanningNextDateSnapshot &&
              hasDirtyDepartureAndDestinationChange(currentDepartureAndDestination, value)
            ) {
              state.dirtyPlanningDates[nextDate] = true;
            }
          }
        });
      },
      getDepartureAndDestination: (date, type) => {
        if (type == TransportNodeType.DEPARTURE) {
          return get().plans.filter((val) => val.date == date)[0]
            ? get().plans.filter((val) => val.date == date)[0].departure
            : DEFAULT_DEPARTURE_AND_DESTINATION;
        }
        if (type == TransportNodeType.DESTINATION) {
          return get().plans.filter((val) => val.date == date)[0]
            ? get().plans.filter((val) => val.date == date)[0].destination
            : DEFAULT_DEPARTURE_AND_DESTINATION;
        }

        return DEFAULT_DEPARTURE_AND_DESTINATION;
      },
      setSpots: (date, spot, isDeleted = false) => {
        set((state) => {
          const existingPlansIndex = state.plans.findIndex((info) => info.date === date);
          if (existingPlansIndex < 0) {
            state.plans.push({
              date: date,
              spots: [spot],
              departure: DEFAULT_DEPARTURE_AND_DESTINATION,
              destination: DEFAULT_DEPARTURE_AND_DESTINATION,
            });
            return;
          }
          const existingSpotIndex = state.plans[existingPlansIndex].spots.findIndex((info) => info.id === spot.id);
          const hasPlanningSnapshot = !!state.planningSpotSnapshots[date];

          if (existingSpotIndex >= 0 && !isDeleted) {
            const previousSpot = state.plans[existingPlansIndex].spots[existingSpotIndex];
            state.plans[existingPlansIndex].spots[existingSpotIndex] = spot;
            if (hasPlanningSnapshot && hasDirtySpotChange(previousSpot, spot)) {
              state.dirtyPlanningDates[date] = true;
            }
          } else if (existingSpotIndex >= 0 && isDeleted) {
            state.plans[existingPlansIndex].spots.splice(existingSpotIndex, 1);
            if (hasPlanningSnapshot) {
              state.dirtyPlanningDates[date] = true;
            }
          } else if (existingSpotIndex < 0 && !isDeleted) {
            state.plans[existingPlansIndex].spots.push(spot);
            if (hasPlanningSnapshot) {
              state.dirtyPlanningDates[date] = true;
            }
          }
        });
      },
      getFields: (field) => get()[field],
      setFields: (field, value) =>
        set((state) => {
          state[field] = value;
        }),
      setRangeDate: (date) => set((state) => ({ ...state, startDate: date?.from, endDate: date?.to })),
      addDateWithDefaultLocation: (date, defaultDeparture, defaultDestination) => {
        set((state) => {
          // 既存のプランかどうかを確認
          const existingPlanIndex = state.plans.findIndex((plan) => plan.date === date);
          // 既存のプランがある場合は何もしない（上書きしない）
          if (existingPlanIndex >= 0) {
            return;
          }
          // 新規日付の場合のみ、デフォルト値を設定したプランを追加
          state.plans.push({
            date: date,
            spots: [],
            departure: {
              ...defaultDeparture,
              time: DEFAULT_DEPARTURE_TIME,
              name: defaultDeparture.name === '' ? '出発地_' + date : defaultDeparture.name,
              locationType: TransportNodeType.DEPARTURE,
            },
            destination: {
              ...defaultDestination,
              time: DEFAULT_ARRIVAL_TIME,
              name: defaultDestination.name === '' ? '目的地_' + date : defaultDestination.name,
              locationType: TransportNodeType.DESTINATION,
            },
          });
          // 日付順にソート
          state.plans.sort((a, b) => a.date.localeCompare(b.date));
        });
      },
      setErrors: (errors) => set((state) => ({ ...state, errors })),
      getPlanErrors: (date) => {
        const planErrors = get().planErrors[date];
        return planErrors ? planErrors : undefined;
      },
      setPlanErrors: (date, errors) =>
        set((state) => {
          const dateKey = date;
          state.planErrors[dateKey] = {
            ...state.planErrors[dateKey],
            ...errors,
          };
          return state;
        }),
      setSpotErrors: (date, errors) =>
        set((state) => {
          const dateKey = date;
          state.spotErrors[dateKey] = {
            ...state.spotErrors[dateKey],
            ...errors,
          };

          return state;
        }),
      editSpots: (date, spotId, updatedSpot) => {
        set((state) => {
          const plansForDateIndex = state.plans.findIndex((plan) => plan.date === date);
          const hasPlanningSnapshot = !!state.planningSpotSnapshots[date];

          if (plansForDateIndex >= 0) {
            const spotIndex = state.plans[plansForDateIndex].spots.findIndex((spot) => spot.id === spotId);
            if (spotIndex >= 0) {
              const currentSpot = state.plans[plansForDateIndex].spots[spotIndex];
              state.plans[plansForDateIndex].spots[spotIndex] = {
                ...state.plans[plansForDateIndex].spots[spotIndex],
                ...updatedSpot,
              };
              // スポットのdirty判定を行い、必要に応じてdirtyPlanningDatesに追加
              if (hasPlanningSnapshot && hasDirtySpotChange(currentSpot, { ...currentSpot, ...updatedSpot })) {
                state.dirtyPlanningDates[date] = true;
              }
            } else {
              console.warn(`Spot with id ${spotId} not found in plans for date ${date}`);
            }
          } else {
            console.warn(`No plans found for date ${date}`);
          }
        });
      },
      getSpotCoordination: (date: string) => {
        const plansForDate = get().plans.find((plan) => plan.date === date);
        if (plansForDate) {
          const spotCoordination = plansForDate.spots;

          return {
            departureCoordination: spotCoordination[0] || {},
            destinationCoordination: spotCoordination[spotCoordination.length - 1] || {},
            spotCoordination: spotCoordination,
          };
        }
      },
      resetErrors: () => set((state) => ({ ...state, errors: {}, tripInfoErrors: {}, planErrors: {}, spotErrors: {} })),
      resetForm: () => set((state) => ({ ...state, errors: {} })),
      resetPlanningStore: () => set(() => ({ ...createPlanningInitialState() })),
      switchAlternativeRoute: (date, routeId, selectedTransportMethodId) => {
        set((state) => {
          const planningResult = state.planningResults[date];

          if (!planningResult) return;

          const routeIndex = planningResult.routes.findIndex((route) => route.id === routeId);
          if (routeIndex === -1) return;

          const route = planningResult.routes[routeIndex];
          const selectedAlternativeRoute = route.alternativeRoutes?.find(
            (alt) => alt.transportMethodId === selectedTransportMethodId,
          );
          const isSameTransportMethodSelected = route.transportMethodId === selectedTransportMethodId;
          const selectedRouteInfo = isSameTransportMethodSelected ? route : selectedAlternativeRoute;

          if (!selectedRouteInfo) return;

          // transportMethodIdからTravelModeTypeに変換するヘルパー
          const getTransportName = (methodId: number): 'WALKING' | 'DRIVING' | 'BICYCLING' | 'TRANSIT' | 'DEFAULT' => {
            switch (methodId) {
              case 1:
                return 'WALKING';
              case 2:
                return 'BICYCLING';
              case 3:
                return 'DRIVING';
              case 4:
              case 5:
                return 'TRANSIT';
              default:
                return 'DEFAULT';
            }
          };

          // ルートを更新
          state.planningResults[date].routes[routeIndex] = {
            ...route,
            transportMethod: selectedRouteInfo.transportMethod,
            transportMethodId: selectedRouteInfo.transportMethodId,
            duration: selectedRouteInfo.duration,
            distance: selectedRouteInfo.distance,
            durationText: selectedRouteInfo.durationText,
            distanceText: selectedRouteInfo.distanceText,
          };

          // 総距離と総時間を再計算
          const newTotalDuration = state.planningResults[date].routes.reduce((sum, r) => sum + r.duration, 0);
          const newTotalDistance = state.planningResults[date].routes.reduce((sum, r) => sum + r.distance, 0);
          state.planningResults[date].totalDuration = newTotalDuration;
          state.planningResults[date].totalDistance = newTotalDistance;

          // 新しいTravelModeType
          const newTransportName = getTransportName(selectedTransportMethodId);

          // スポット・出発地・目的地のtransportsも更新
          const plansForDateIndex = state.plans.findIndex((plan) => plan.date === date);
          if (plansForDateIndex === -1) return;

          // 出発地から最初のスポットへのルートの場合
          if (route.fromType === 'DEPARTURE' && route.toType === 'SPOT') {
            // 直接departureを更新（immer内なのでsetterを使わない）
            const currentDeparture = state.plans[plansForDateIndex].departure;

            if (currentDeparture) {
              state.plans[plansForDateIndex].departure = {
                ...currentDeparture,
                travelTime: selectedRouteInfo.duration,
                transportMethod: selectedRouteInfo.transportMethod,
                transportMethodId: selectedRouteInfo.transportMethodId,
                alternativeTransports: route.alternativeRoutes,
              };
            }
          }
          // スポット間のルートの場合（fromSpotIdのスポットのtransportsを更新）
          else if (route.fromType === 'SPOT' && route.toType === 'SPOT') {
            const spotIndex = state.plans[plansForDateIndex].spots.findIndex((spot) => spot.id === route.fromSpotId);
            if (spotIndex !== -1) {
              const currentSpot = state.plans[plansForDateIndex].spots[spotIndex];
              state.plans[plansForDateIndex].spots[spotIndex] = {
                ...currentSpot,
                travelTime: selectedRouteInfo.duration,
                transportMethod: selectedRouteInfo.transportMethod,
                transportMethodId: selectedRouteInfo.transportMethodId,
                alternateRoutes: route.alternativeRoutes,
              };
            }
          }
          // 最後のスポットから目的地へのルートの場合
          else if (route.toType === 'DESTINATION') {
            // 直接destinationを更新（immer内なのでsetterを使わない）
            const currentDestination = state.plans[plansForDateIndex].destination;
            if (currentDestination) {
              state.plans[plansForDateIndex].destination = {
                ...currentDestination,
                travelTime: selectedRouteInfo.duration,
                transportMethod: selectedRouteInfo.transportMethod,
                transportMethodId: selectedRouteInfo.transportMethodId,
                alternativeTransports: route.alternativeRoutes,
              };
            }
          }

          const hasPlanningSnapshot = !!state.planningSpotSnapshots[date];
          if (hasPlanningSnapshot && !isSameTransportMethodSelected) {
            state.dirtyPlanningDates[date] = true;
          }
        });
      },
    })),
  ),
);

type Departure = {
  lat: number;
  lng: number;
};

type PhotoType = {
  flagContentURI: string;
};

export type PlaceInfo = {
  id: string;
  name: string;
  url: string;
  location: Departure;
  photos: PhotoType[];
};

export async function searchSpots(params: SearchSpotByCategoryParams): Promise<Spot[]> {
  const { Place, SearchNearbyRankPreference, SearchByTextRankPreference } = (await google.maps.importLibrary(
    'places',
  )) as google.maps.PlacesLibrary;

  // Restrict within the map viewport.

  // 複数ジャンルを指定した場合にgoogle docsのtypeを使用
  //https://developers.google.com/maps/documentation/places/web-service/place-types?hl=ja&_gl=1*tofb5y*_up*MQ..*_ga*MTQ4MDA4MDA0Mi4xNzQzODkxMDQ4*_ga_NRWSTWS78N*MTc0Mzg5MTA0Ny4xLjEuMTc0Mzg5MTMxNy4wLjAuMA..
  const searchCategoryList: string[] = params.genreIds ?? [];

  const placeToSpot = (place: google.maps.places.Place): Spot => ({
    id: place.id,
    location: {
      id: place.id,
      name: place.displayName ?? '',
      lat: place.location?.lat() ?? 0,
      lng: place.location?.lng() ?? 0,
    },
    // image: place.photos?.[0]?.getURI() ?? '',
    // TODO: 画像課金対策のため一旦デフォルト画像にする
    image: '/scene.webp',
    url: place.websiteURI ?? '',
    rating: place.rating ?? 0,
    stayStart: '09:00',
    stayEnd: '10:00',
    stayDuration: 60,
    description: place.editorialSummary ?? '説明なし',
    category: place.types, // TODO: 日本語化
    prefecture: getPrefectures(place.addressComponents),
    address: place.formattedAddress ?? '',
    ratingCount: place.userRatingCount ?? 0,
    regularOpeningHours: formatOpeningHours(place.regularOpeningHours?.periods ?? null),
    order: 1,
  });

  const fields = [
    'displayName',
    'location',
    'businessStatus',
    'googleMapsURI',
    // 'photos',
    'rating',
    'types',
    'primaryType',
    'primaryTypeDisplayName',
    'attributions',
    'regularOpeningHours',
    'editorialSummary',
    'websiteURI',
    'priceLevel',
    'userRatingCount',
    'formattedAddress',
    'addressComponents',
  ];

  if (params.searchWord) {
    const request: google.maps.places.SearchByTextRequest = {
      textQuery: params.searchWord,
      fields: fields,
      locationRestriction: params.center ? new google.maps.LatLngBounds(params.center) : undefined,
      maxResultCount: params.maxResultLimit,
      rankPreference:
        params.sortOption === 'distance' ? SearchByTextRankPreference.DISTANCE : SearchByTextRankPreference.RELEVANCE,
      language: 'ja',
      region: 'JP',
    };
    const { places } = await Place.searchByText(request);

    return places?.map(placeToSpot) ?? [];
  } else {
    // TODO: 一旦保留
    if (!params.center) {
      return [];
    }
    const center = new google.maps.LatLng(params.center.lat, params.center.lng);
    const request: google.maps.places.SearchNearbyRequest = {
      // required parameters
      fields: fields,
      locationRestriction: {
        center: center,
        radius: params.radius * 1000, // 半径をメートルに変換
      },
      // optional parameters
      includedTypes: searchCategoryList,
      maxResultCount: params.maxResultLimit,
      rankPreference:
        params.sortOption === 'popularity'
          ? SearchNearbyRankPreference.POPULARITY
          : SearchNearbyRankPreference.DISTANCE,
      language: 'ja',
      region: 'JP',
    };
    const { places } = await Place.searchNearby(request);

    return places?.map(placeToSpot) ?? [];
  }
}

export type RouteResult = {
  path: google.maps.LatLngLiteral[];
  distance: string;
  duration: string;
  travelMode: TravelModeType;
};

export const getRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  travelMode: TravelModeType = 'WALKING',
): Promise<RouteResult> => {
  try {
    const directionsService = new google.maps.DirectionsService();
    if (travelMode === 'DEFAULT') {
      travelMode = 'WALKING';
    }
    const searchForTravelMode: google.maps.TravelMode = google.maps.TravelMode[travelMode];
    const result = await directionsService.route({
      origin,
      destination,
      travelMode: searchForTravelMode,
    });

    if (result.routes[0]) {
      return {
        path: result.routes[0].overview_path.map((point) => ({
          lat: point.lat(),
          lng: point.lng(),
        })),
        distance: result.routes[0].legs[0].distance?.text || '',
        duration: result.routes[0].legs[0].duration?.text || '',
        travelMode: travelMode || 'DEFAULT',
      };
    }
  } catch (error) {
    console.error('Failed to get route:', error);
  }

  // フォールバック: 直線距離
  return {
    path: [origin, destination],
    distance: '',
    duration: '',
    travelMode: 'DEFAULT',
  };
};
