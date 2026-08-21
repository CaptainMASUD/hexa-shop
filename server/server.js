import 'dotenv/config';
import app from './src/app.js';
import connectDatabase from './src/config/db.js';
import { env, validateProductionEnv } from './src/config/env.js';

const start = async () => {
  validateProductionEnv();
  await connectDatabase();
  const server = app.listen(env.PORT, () => {
    console.log(`HEXA API running on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Closing HEXA API...`);
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((error) => {
  console.error('Failed to start HEXA API:', error.message);
  process.exit(1);
});
