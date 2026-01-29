import { serve } from 'bun';

import app from '.';

if (import.meta.env.NODE_ENV === 'development') {
  serve({
    port: 8787,
    fetch: app.fetch,
  });
}
