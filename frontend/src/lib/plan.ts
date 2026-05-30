import { z } from 'zod';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  PlanErrorType,
  SearchSpotByCategoryParams,
  Spot,
  TransportNodeType,
  TravelModeType,
  TravelPlanType,
  TripInfo,
} from '@/types/plan';
import { TripSchema } from '@/models/trip';
import { DepartureAndDestinationType, PlanLocationCandidatesResponse } from '@/models/planLocation';
import { DEFAULT_DEPARTURE_AND_DESTINATION } from '@/data/constants';

import { getPrefectures } from './algorithm';
import { formatOpeningHours } from './google-maps';
import { getDatesBetween } from './utils';
import { PlanningInfo, PlanningResult } from './planning';

export type FormData = z.infer<typeof TripSchema>;

type PlanningInitialState = Pick<
  FormState,
  | 'id'
  | 'title'
  | 'imageUrl'
  | 'startDate'
  | 'endDate'
  | 'tripInfo'
  | 'plans'
  | 'departureList'
  | 'destinationList'
  | 'isLocationLinked'
  | 'errors'
  | 'tripInfoErrors'
  | 'planErrors'
  | 'spotErrors'
  | 'planningInfo'
  | 'planningResults'
  | 'simulationStatus'
>;

function createPlanningInitialState(): PlanningInitialState {
  return {
    id: undefined,
    title: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    tripInfo: [],
    plans: [],
    departureList: { favorites: [], history: [] },
    destinationList: { favorites: [], history: [] },
    isLocationLinked: false,
    errors: {},
    tripInfoErrors: {},
    planErrors: {},
    spotErrors: {},
    planningInfo: {},
    planningResults: {},
    simulationStatus: null,
  };
}

function copyLinkedLocationPreservingTime(
  source: DepartureAndDestinationType,
  current: DepartureAndDestinationType,
  name: string,
  locationType?: TransportNodeType,
): DepartureAndDestinationType {
  return {
    ...source,
    name,
    time: current.time,
    locationType: locationType ?? source.locationType,
  };
}

interface FormState {
  id?: string;
  title: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  tripInfo: TripInfo[];
  plans: TravelPlanType[];
  departureList: PlanLocationCandidatesResponse;
  destinationList: PlanLocationCandidatesResponse;
  /** 出発地・目的地連動チェックボックスの状態 */
  isLocationLinked: boolean;
  errors: Partial<Record<keyof FormData, string>>;
  tripInfoErrors: Partial<Record<string, Partial<Record<keyof TripInfo, string>>>>;
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
  /** プランニング結果を設定 */
  setPlanningResult: (date: string, result: PlanningResult) => void;
  /** プランニング結果を取得 */
  getPlanningResult: (date: string) => PlanningResult | undefined;
  /** プランニング結果をクリア */
  clearPlanningResult: (date: string) => void;
  setDepartureList: (list: PlanLocationCandidatesResponse) => void;
  setDestinationList: (list: PlanLocationCandidatesResponse) => void;
  /** 出発地・目的地連動チェックボックスの状態を設定 */
  setIsLocationLinked: (isLinked: boolean) => void;
  getTripInfo: (date: string) => TripInfo;
  setTripInfo: (
    date: string,
    name: 'date' | 'genreId' | 'transportationMethod' | 'memo',
    value: string | number,
  ) => void;
  getSpotInfo: (date: string, type: TransportNodeType | null) => Spot[];
  simulationStatus: { date: string; status: number }[] | null;
  setSimulationStatus: (status: { date: string; status: number }) => void;
  getDepartureAndDestination: (date: string, type: TransportNodeType) => DepartureAndDestinationType;
  setDepartureAndDestination: (date: string, type: TransportNodeType, value: DepartureAndDestinationType) => void;
  setSpots: (date: string, spot: Spot, isDeleted: boolean) => void;
  editSpots: (date: string, spotId: string, updatedSpot: Partial<Spot>) => void;
  getSortedSpots: (date: string) => Spot[];
  setFields: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  setErrors: (errors: Partial<Record<keyof FormData, string>>) => void;
  setTripInfoErrors: (date: string, errors: Partial<Record<keyof TripInfo, string>>) => void;
  setSpotErrors: (date: string, errors: Partial<Record<keyof Spot, string>>) => void;
  setPlanErrors: (date: string, errors: Partial<Record<PlanErrorType, string>>) => void;
  setRangeDate: (date: { from: string | undefined; to: string | undefined } | undefined) => void;
  getSpotCoordination: (date: string) => Record<string, Spot>;
  /** 新規日付を追加。既存の日付は変更せず、新規日付にのみデフォルト値を設定 */
  addDateWithDefaultLocation: (
    date: string,
    defaultDeparture: DepartureAndDestinationType,
    defaultDestination: DepartureAndDestinationType,
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
      setDepartureList: (list) => set((state) => ({ ...state, departureList: list })),
      setDestinationList: (list) => set((state) => ({ ...state, destinationList: list })),
      setIsLocationLinked: (isLinked) => set((state) => ({ ...state, isLocationLinked: isLinked })),
      getSpotInfo: (date, type: TransportNodeType | null = null) => {
        const plansForDate = get().plans.filter((plan) => plan.date === date);
        if (plansForDate.length > 0) {
          if (type === TransportNodeType.DEPARTURE) {
            return plansForDate[0].spots.filter((spot) => spot.transports?.fromType === type);
          } else if (type === TransportNodeType.DESTINATION) {
            return plansForDate[0].spots.filter((spot) => spot.transports?.toType === type);
          } else if (type === TransportNodeType.SPOT) {
            return plansForDate[0].spots
              .filter((spot) => spot.transports?.fromType === type && spot.transports?.toType === type)
              .sort((a, b) => a.order - b.order);
          } else {
            return [...plansForDate[0].spots].sort((a, b) => a.order - b.order);
          }
        }
        return [];
      },
      getTripInfo: (date) => {
        return get().tripInfo.find((info) => info.date == date);
      },
      setTripInfo: (date, name, value) => {
        set((state) => {
          const existingTripInfoIndex = state.tripInfo.findIndex((info) => info.date === date);

          if (existingTripInfoIndex >= 0) {
            state.tripInfo[existingTripInfoIndex] = {
              ...state.tripInfo[existingTripInfoIndex],
              [name]: value,
            };
          } else {
            state.tripInfo.push({
              date: date,
              genreId: name === 'genreId' ? Number(value) : 0,
              transportationMethod: name === 'transportationMethod' ? (value as number) : 1,
              memo: name === 'memo' ? (value as string) : '',
            });
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
              destination: {} as DepartureAndDestinationType,
            });
            return;
          } else if (existingPlansIndex < 0 && type == TransportNodeType.DESTINATION) {
            state.plans.push({
              date: date,
              spots: [],
              departure: {} as DepartureAndDestinationType,
              destination: value,
            });
            return;
          }
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

          if (existingSpotIndex >= 0 && !isDeleted) {
            state.plans[existingPlansIndex].spots[existingSpotIndex] = spot;
          } else if (existingSpotIndex >= 0 && isDeleted) {
            state.plans[existingPlansIndex].spots.splice(existingSpotIndex, 1);
          } else if (existingSpotIndex < 0 && !isDeleted) {
            state.plans[existingPlansIndex].spots.push(spot);
          }
        });
      },
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
              time: '09:00',
              name: defaultDeparture.name === '' ? '出発地_' + date : defaultDeparture.name,
              locationType: TransportNodeType.DEPARTURE,
            },
            destination: {
              ...defaultDestination,
              time: '18:00',
              name: defaultDestination.name === '' ? '目的地_' + date : defaultDestination.name,
              locationType: TransportNodeType.DESTINATION,
            },
          });
          // 日付順にソート
          state.plans.sort((a, b) => a.date.localeCompare(b.date));
        });
      },
      setErrors: (errors) => set((state) => ({ ...state, errors })),
      setTripInfoErrors: (date, errors) =>
        set((state) => {
          const dateKey = date;
          state.tripInfoErrors[dateKey] = {
            ...state.tripInfoErrors[dateKey],
            ...errors,
          };
          return state;
        }),
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

          if (plansForDateIndex >= 0) {
            const spotIndex = state.plans[plansForDateIndex].spots.findIndex((spot) => spot.id === spotId);
            if (spotIndex >= 0) {
              state.plans[plansForDateIndex].spots[spotIndex] = {
                ...state.plans[plansForDateIndex].spots[spotIndex],
                ...updatedSpot,
              };
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
          const departureSpot = plansForDate.spots.find(
            (spot) => spot.transports?.fromType === TransportNodeType.DEPARTURE,
          );
          const destinationSpot = plansForDate.spots.find(
            (spot) => spot.transports?.toType === TransportNodeType.DESTINATION,
          );
          const spotCoordination = plansForDate.spots.filter(
            (spot) =>
              spot.transports?.fromType === TransportNodeType.SPOT &&
              spot.transports?.toType === TransportNodeType.SPOT,
          );

          return {
            departureCoordination: departureSpot,
            destinationCoordination: destinationSpot,
            spotCoordination: spotCoordination,
          };
        }
      },
      resetErrors: () => set((state) => ({ ...state, tripInfoErrors: {}, planErrors: {}, spotErrors: {} })),
      resetForm: () => set((state) => ({ ...state, errors: {} })),
      resetPlanningStore: () => set(() => ({ ...createPlanningInitialState() })),
      switchAlternativeRoute: (date, routeId, selectedTransportMethodId) => {
        set((state) => {
          const planningResult = state.planningResults[date];

          if (!planningResult) return;

          const routeIndex = planningResult.routes.findIndex((route) => route.id === routeId);
          if (routeIndex === -1) return;

          const route = planningResult.routes[routeIndex];
          const alternativeRoute = route.alternativeRoutes?.find(
            (alt) => alt.transportMethodId === selectedTransportMethodId,
          );

          if (!alternativeRoute) return;

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
            transportMethod: alternativeRoute.transportMethod,
            transportMethodId: alternativeRoute.transportMethodId,
            duration: alternativeRoute.duration,
            distance: alternativeRoute.distance,
            durationText: alternativeRoute.durationText,
            distanceText: alternativeRoute.distanceText,
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
                transports: {
                  ...currentDeparture.transports,
                  name: newTransportName,
                  transportMethod: selectedTransportMethodId,
                  travelTime: alternativeRoute.durationText,
                  fromType: TransportNodeType.DEPARTURE,
                  toType: TransportNodeType.SPOT,
                },
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
                transports: {
                  ...currentSpot.transports,
                  name: newTransportName,
                  transportMethod: selectedTransportMethodId,
                  travelTime: alternativeRoute.durationText,
                  fromType: TransportNodeType.SPOT,
                  toType: TransportNodeType.SPOT,
                },
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
                transports: {
                  ...currentDestination.transports,
                  name: newTransportName,
                  transportMethod: selectedTransportMethodId,
                  travelTime: alternativeRoute.durationText,
                  fromType: TransportNodeType.SPOT,
                  toType: TransportNodeType.DESTINATION,
                },
                alternativeTransports: route.alternativeRoutes,
              };
            }
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
    transports: {
      transportMethod: 1,
      name: 'WALKING',
      travelTime: '不明',
      fromType: TransportNodeType.SPOT,
      toType: TransportNodeType.SPOT,
    },
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
