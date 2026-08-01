import { Context } from 'hono';

import {
  createUserLocation,
  deleteUserLocation,
  getUserLocationList,
  updateUserLocation,
} from '@/services/userLocation';
import { getDbFromContext } from '@/db';

export const userLocationHandler = {
  getUserLocationList: async (c: Context) => {
    const db = getDbFromContext(c);
    const response = await getUserLocationList(db, c);
    return c.json(response, 200);
  },
  createUserLocation: async (c: Context) => {
    const db = getDbFromContext(c);
    const response = await createUserLocation(db, c);
    return c.json(response, 201);
  },
  updateUserLocation: async (c: Context) => {
    const db = getDbFromContext(c);
    const response = await updateUserLocation(db, c);
    return c.json(response, 200);
  },
  deleteUserLocation: async (c: Context) => {
    const db = getDbFromContext(c);
    const response = await deleteUserLocation(db, c);
    return c.json(response, 204);
  },
};
