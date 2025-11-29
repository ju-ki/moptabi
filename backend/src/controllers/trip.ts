import { Context } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { HTTPException } from 'hono/http-exception';

import { TripSchema } from '../models/trip';
import { Prisma, PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const getTripHandler = {
  // 全ての旅行計画を取得
  getTrips: async (c: Context) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      throw new HTTPException(401, { message: 'Unauthorized error' });
    }

    const userId = auth.userId;

    const tripInfo = await prisma.trip.findMany({
      where: { userId: userId },
      include: {
        tripInfo: true,
        plans: true,
      },
    });

    return c.json(tripInfo, 200);
  },

  // 特定の旅行計画を取得

  getTripDetail: async (c: Context) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      throw new HTTPException(401, { message: 'Unauthorized error' });
    }

    const tripId = parseInt(c.req.param('id'));
    if (isNaN(tripId)) {
      throw new HTTPException(400, { message: 'Invalid trip ID' });
    }

    const targetTrip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId: auth.userId,
      },

      include: {
        tripInfo: true,
        plans: {
          include: {
            planSpots: {
              orderBy: { order: 'asc' },
              include: {
                fromLocation: true,
                toLocation: true,
                spot: {
                  include: {
                    meta: true,
                    nearestStations: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!targetTrip) {
      throw new HTTPException(404, { message: 'No trip found' });
    }

    return c.json(targetTrip, 200);
  },

  deleteTrip: async (c: Context) => {
    try {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const tripId = parseInt(c.req.param('id'));

      const targetTrip = await prisma.trip.findFirst({
        where: {
          id: tripId,
          userId: auth.userId,
        },
      });

      if (!targetTrip) {
        return c.json({ error: 'No trip found' }, 404);
      }

      await prisma.trip.delete({
        where: {
          id: tripId,
        },
      });

      return c.json({ message: 'Trip deleted successfully' }, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(errorMessage);
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
  },

  // 新しい旅行計画を登録
  createTrip: async (c: Context) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      throw new HTTPException(401, { message: 'Unauthorized error' });
    }

    const body = await c.req.json();
    if (!body) {
      throw new HTTPException(400, { message: 'Request body is required' });
    }

    const result = TripSchema.safeParse(body);
    if (!result.success) {
      throw new HTTPException(400, { message: 'Invalid request body' });
    }

    const tripData = result.data;
    const userId = auth.userId;

    // レスポンス用変数を定義
    let createdTrip;

    await prisma.$transaction(async (tx) => {
      const allSpotsList = await tx.spot.findMany({
        select: { id: true },
        where: {
          id: {
            notIn: ['departure', 'destination'],
          },
        },
      });

      const nonExistingSpot = tripData.plans.flatMap((plan) =>
        plan.spots.filter((spot) => !allSpotsList.some((existingSpot) => existingSpot.id === spot.id)),
      );

      for (const spot of nonExistingSpot) {
        await tx.spot.create({
          data: {
            id: spot.id,
            meta: {
              create: {
                id: spot.id,
                name: spot.location.name,
                latitude: spot.location.lat,
                longitude: spot.location.lng,
                image: spot.image ?? '',
                rating: spot.rating ?? 0,
                categories: spot.category,
                catchphrase: spot.catchphrase ?? '',
                description: spot.description ?? '',
                openingHours: spot.regularOpeningHours ? spot.regularOpeningHours : undefined,
              },
            },
          },
        });
      }

      // TODO: TripInfoいらないかもしれない
      const newTrip = await tx.trip.create({
        data: {
          title: tripData.title,
          imageUrl: tripData.imageUrl,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          userId,
          tripInfo: {
            create: tripData.tripInfo.map((info) => ({
              date: info.date,
              genreId: info.genreId,
              transportationMethods: info.transportationMethod,
              memo: info.memo ?? '',
            })),
          },
          plans: {
            create: tripData.plans.map((plan) => ({
              date: plan.date,
              planSpots: {
                create: plan.spots.map((spot) => ({
                  spotId: spot.id,
                  stayStart: spot.stayStart,
                  stayEnd: spot.stayEnd,
                  memo: spot.memo ?? null,
                  order: spot.order, // スポットの順序を設定
                })),
              },
            })),
          },
        },
      });

      // 交通手段は別途作成（PlanSpotが作成された後）
      for (const planData of tripData.plans) {
        const createdPlan = await tx.plan.findFirst({
          where: {
            tripId: newTrip.id,
            date: planData.date,
          },
          include: {
            planSpots: {
              orderBy: { order: 'asc' },
            },
          },
        });

        if (createdPlan) {
          // スポット間の交通手段を作成
          for (let i = 0; i < createdPlan.planSpots.length - 1; i++) {
            const fromSpot = createdPlan.planSpots[i];
            const toSpot = createdPlan.planSpots[i + 1];

            const transportData = planData.spots[i].transports; // 対応する交通手段データ

            await tx.transport.create({
              data: {
                planId: createdPlan.id,
                fromType: 'SPOT',
                toType: 'SPOT',
                fromSpotId: fromSpot.id,
                toSpotId: toSpot.id,
                cost: transportData.cost ?? 0,
                travelTime: transportData.travelTime ?? '不明',
                transportMethods: {
                  create:
                    transportData.transportMethodIds?.map((methodId: number) => ({
                      transportMethodId: methodId,
                    })) ?? [],
                },
              },
            });
          }

          // 最初のスポットへの交通手段（出発地から）
          if (createdPlan.planSpots.length > 0) {
            const firstSpot = createdPlan.planSpots[0];
            await tx.transport.create({
              data: {
                planId: createdPlan.id,
                fromType: 'DEPARTURE',
                toType: 'SPOT',
                toSpotId: firstSpot.id,
                cost: 0,
                travelTime: '出発',
              },
            });
          }

          // 最後のスポットからの交通手段（目的地へ）
          if (createdPlan.planSpots.length > 0) {
            const lastSpot = createdPlan.planSpots[createdPlan.planSpots.length - 1];
            await tx.transport.create({
              data: {
                planId: createdPlan.id,
                fromType: 'SPOT',
                toType: 'DESTINATION',
                fromSpotId: lastSpot.id,
                cost: 0,
                travelTime: '帰宅',
              },
            });
          }
        }
      }

      createdTrip = await tx.trip.findFirst({
        where: { id: newTrip.id, userId: userId },
        include: {
          tripInfo: true,
          plans: {
            include: {
              planSpots: {
                include: {
                  spot: {
                    include: {
                      meta: true,
                      nearestStations: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return c.json(createdTrip, 201);
  },

  // 交通手段を取得
  getTransportMethods: async (c: Context) => {
    try {
      const transportMethods = await prisma.transportMethod.findMany({
        orderBy: { id: 'asc' },
      });

      return c.json(transportMethods, 200);
    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      let errorDetails = {};

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // 既知のPrismaエラー
        errorMessage = `Prisma error code: ${error.code}`;
        errorDetails = {
          message: error.message,
          code: error.code,
          meta: error.meta,
        };
      } else if (error instanceof Prisma.PrismaClientValidationError) {
        // バリデーションエラー（型など）
        errorMessage = 'Validation error';
        errorDetails = {
          message: error.message,
        };
      } else if (error instanceof Error) {
        // その他のJSエラー
        errorMessage = error.message;
        errorDetails = { message: error.message };
      }

      console.error('Error during Prisma operation:', errorDetails);

      return c.json(
        {
          error: 'Internal Server Error',
          message: errorMessage,
          details: errorDetails,
        },
        500,
      );
    }
  },

  /**
   * ユーザーの出発地と目的地の取得
   */
  getDepartureAndDepartment: async (c: Context) => {
    try {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const userId = auth.userId;

      const departureAndDestinationSpots = await prisma.planSpot.findMany({
        where: {
          // 1. スポットIDが出発地または目的地で始まるものをフィルタリング
          spot: {
            OR: [{ id: { startsWith: 'departure' } }, { id: { startsWith: 'destination' } }],
          },
          // 2. 関連するプランを通じて、特定のユーザーIDを持つ旅行に絞り込み
          plan: {
            trip: {
              userId: userId,
            },
          },
        },
        // 3. スポットIDで重複を排除
        distinct: ['spotId'],
        select: {
          // 4. 必要な情報のみを選択
          spot: {
            select: {
              meta: {
                select: {
                  id: true,
                  name: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
        },
      });

      const allDeparture: { id: string; name: string; lat: number; lng: number }[] = [];
      const allDestination: { id: string; name: string; lat: number; lng: number }[] = [];

      departureAndDestinationSpots.forEach((item) => {
        const spotMeta = item.spot.meta;
        if (!spotMeta) {
          return;
        }
        if (
          spotMeta.id.startsWith('departure') &&
          allDeparture.filter((spot) => spot.name == spotMeta.name).length == 0
        ) {
          allDeparture.push({
            id: spotMeta.id,
            name: spotMeta.name,
            lat: spotMeta.latitude,
            lng: spotMeta.longitude,
          });
        }
        if (
          spotMeta.id.startsWith('destination') &&
          allDestination.filter((spot) => spot.name == spotMeta.name).length == 0
        ) {
          allDestination.push({
            id: spotMeta.id,
            name: spotMeta.name,
            lat: spotMeta.latitude,
            lng: spotMeta.longitude,
          });
        }
      });

      const response = {
        departure: allDeparture,
        destination: allDestination,
      };
      return c.json(response, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(errorMessage);
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
  },
};
