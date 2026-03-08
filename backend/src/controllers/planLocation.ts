import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { getUserId } from '@/middleware/auth';
import { CreatePlanLocationSchema, LocationType } from '@/models/planLocation';
import { getPlanLocationCandidates, createOrUpdatePlanLocation, deletePlanLocation } from '@/services/planLocation';

export const planLocationHandler = {
  /**
   * 候補を取得（お気に入り + 履歴）
   */
  getCandidates: async (c: Context) => {
    const userId = getUserId(c);
    const query = c.req.query();

    const options = {
      locationType: query.locationType as LocationType | undefined,
      search: query.search,
      limit: query.limit ? Number(query.limit) : undefined,
    };

    const response = await getPlanLocationCandidates(userId, options);
    return c.json(response, 200);
  },

  /**
   * 作成（または使用回数更新）
   */
  create: async (c: Context) => {
    const body = await c.req.json();
    const userId = getUserId(c);

    const parsed = CreatePlanLocationSchema.safeParse(body);
    if (!parsed.success) {
      throw new HTTPException(400, { message: 'リクエストが不正です' });
    }

    const response = await createOrUpdatePlanLocation(userId, parsed.data);
    return c.json(response, 201);
  },

  /**
   * 削除
   */
  delete: async (c: Context) => {
    const userId = getUserId(c);
    const idParam = c.req.param('id');

    if (!idParam || isNaN(Number(idParam))) {
      throw new HTTPException(400, { message: 'IDが不正です' });
    }

    const id = Number(idParam);
    const deleted = await deletePlanLocation(userId, id);

    if (!deleted) {
      throw new HTTPException(404, { message: '指定されたIDが存在しないか、削除権限がありません' });
    }

    return c.json(deleted, 200);
  },
};
