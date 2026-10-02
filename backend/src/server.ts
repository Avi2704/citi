import { app } from './app.js';
import { env } from './utils/env.js';

app.listen(env.PORT, () => {
  console.log(`WasteFlow backend listening on port ${env.PORT}`);
});
