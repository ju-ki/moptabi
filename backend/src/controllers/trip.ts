import { Context } from 'hono';
import { getAuth } from '@hono/clerk-auth';

import { TripSchema } from '../models/trip';
import { Prisma, PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const getTripHandler = {
  // 全ての旅行計画を取得
  getTrips: async (c: Context) => {
    try {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized error' }, 401);
      }

      const userId = auth.userId;

      const tripInfo = await prisma.trip.findMany({
        where: { userId: userId },
        include: {
          tripInfo: true,
          plans: true,
        },
      });

      if (!tripInfo.length) {
        return c.json([], 200);
      }

      return c.json(tripInfo, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(errorMessage);
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
  },

  // 特定の旅行計画を取得

  getTripDetail: async (c: Context) => {
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

      include: {
        tripInfo: true,
        plans: {
          include: {
            planSpots: {
              orderBy: { order: 'asc' },
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

    if (!targetTrip) {
      return c.json({ error: 'No trip found' }, 404);
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
    try {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      if (!body) {
        return c.json({ error: 'Request body is required' }, 400);
      }

      const result = TripSchema.safeParse(body);
      if (!result.success) {
        const formattedErrors = result.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          received: err.code === 'invalid_type' ? err.received : undefined,
          expected: err.code === 'invalid_type' ? err.expected : undefined,
        }));

        console.error('Validation failed:', formattedErrors);
        return c.json({ error: 'Invalid request body', details: formattedErrors }, 400);
      }

      const tripData = result.data;
      const userId = auth.userId;

      // レスポンス用変数を定義
      let createdTrip;

      try {
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
                    latitude: spot.location.latitude,
                    longitude: spot.location.longitude,
                    image: spot.image ?? '',
                    rating: spot.rating ?? 0,
                    categories: spot.category,
                    catchphrase: spot.catchphrase ?? '',
                    description: spot.description ?? '',
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
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(`Prisma error code: ${error.code}`);
          console.log(error);
          return c.json({ error: 'Internal Server Error', details: error.code }, 500);
        } else if (error instanceof Prisma.PrismaClientValidationError) {
          console.error(error);
          return c.json({ error: 'Validation error' }, 500);
        } else {
          console.error(error);
          return c.json({ error: 'Unexpected error occurred' }, 500);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(errorMessage);
      return c.json({ error: 'Internal Server Error', details: errorMessage }, 500);
    }
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
};
