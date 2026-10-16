import { createRoute, z } from '@hono/zod-openapi';
import { UserLimitSchema } from '@shared/user/schema';

export const getUserLimitsRoute = createRoute({
  method: 'get',
  path: '/limits',
  tags: ['User'],
  summary: 'ユーザーの上限値を取得',
  responses: {
    200: {
      description: 'ユーザーの上限値',
      content: {
        'application/json': {
          schema: UserLimitSchema,
        },
      },
    },
    401: {
      description: '未認証',
      content: {
        'application/json': {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});
