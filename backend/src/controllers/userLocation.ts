import { Context } from 'hono';

import {
  createUserLocation,
  deleteUserLocation,
  getUserLocationList,
  updateUserLocation,
} from '@/services/userLocation';

export const userLocationHandler = {
  getUserLocationList: async (c: Context) => {
    const response = await getUserLocationList(c);
    return c.json(response, 200);
  },
  createUserLocation: async (c: Context) => {
    const response = await createUserLocation(c);
    return c.json(response, 201);
  },
  updateUserLocation: async (c: Context) => {
    const response = await updateUserLocation(c);
    return c.json(response, 200);
  },
  deleteUserLocation: async (c: Context) => {
    const response = await deleteUserLocation(c);
    return c.json(response, 204);
  },
};
