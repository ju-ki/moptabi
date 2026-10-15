import { RouteHandler } from '@hono/zod-openapi';
import { Context } from 'hono';
import { getDbFromContext } from '@db/index';

import { getUserId } from '@/middleware/auth';
import { getUserLimits } from '@/services/userLimit';

import { getUserLimitsRoute } from '../routes/user';

export const getUserLimitsHandler: RouteHandler<typeof getUserLimitsRoute> = async (c: Context) => {
  const userId = getUserId(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = getDbFromContext(c);
  const limits = await getUserLimits(db, userId);
  return c.json(limits, 200);
};
