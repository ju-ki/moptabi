// import path from 'path';

import { getAuth } from '@hono/clerk-auth';
import { Context } from 'hono';

export const getImageHandler = {
  // 画像をアップロード
  uploadImage: async (c: Context) => {
    try {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.formData();
      const file = body.get('file') as File;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const newFilename = `${Date.now()}_${file.name}`;
      const newPath = `static/${newFilename}`;

      await Bun.write(newPath, buffer);

      return c.json({ fileName: newFilename });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.log(errorMessage);
      return c.json({ error: 'Internal Server Error', detail: errorMessage }, 500);
    }
  },

  getImage: async (c: Context) => {
    const { fileName } = c.req.param();
    const filePath = `./static/${fileName}`;

    try {
      const file = await Bun.file(filePath);
      return new Response(file.stream(), {
        headers: { 'Content-type': file.type },
      });
    } catch {
      return c.notFound();
    }
  },
};
