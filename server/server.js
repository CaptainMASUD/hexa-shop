import 'dotenv/config';
import app from './src/app.js';
import connectDatabase from './src/config/db.js';
import { env, validateProductionEnv } from './src/config/env.js';
import { startSubscriptionWorker, stopSubscriptionWorker } from './src/services/subscriptionWorker.js';

const start = async () => {
  validateProductionEnv();
  await connectDatabase();
  const worker = startSubscriptionWorker(60 * 60 * 1000); // Check expiry every 1 hour
  const server = app.listen(env.PORT, () => {
    console.log(`HEXA API running on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Closing HEXA API...`);
    stopSubscriptionWorker();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });
};

start().catch((error) => {
  console.error('Failed to start HEXA API:', error.message);
  process.exit(1);
});
