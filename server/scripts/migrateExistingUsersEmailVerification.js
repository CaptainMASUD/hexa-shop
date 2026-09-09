import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../src/models/User.js';

const MONGODB_URL = process.env.MONGODB_URL;

async function migrate() {
  if (!MONGODB_URL) {
    console.error('❌ MONGODB_URL environment variable is missing.');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URL);
  console.log('✅ Connected.');

  console.log('🔍 Finding existing users without isEmailVerified field...');
  const result = await User.updateMany(
    { isEmailVerified: { $exists: false } },
    { $set: { isEmailVerified: true } }
  );

  console.log('====================================================');
  console.log('🎉 Migration Completed Successfully:');
  console.log(`   - Matched legacy users:  ${result.matchedCount}`);
  console.log(`   - Updated users:         ${result.modifiedCount}`);
  console.log('   - Existing users are now marked isEmailVerified: true');
  console.log('====================================================');
}

migrate()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  });
