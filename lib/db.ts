import mongoose from 'mongoose';

// Register all schemas/models to prevent MissingSchemaError during Next.js route-splitting / hot-reloads
import '@/models/Agency';
import '@/models/Approval';
import '@/models/ApprovedWork';
import '@/models/BOQ';
import '@/models/Bank';
import '@/models/Bill';
import '@/models/DTP';
import '@/models/LOA';
import '@/models/Package';
import '@/models/TechnicalSanction';
import '@/models/Tender';
import '@/models/User';
import '@/models/WorkOrder';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global scope to preserve connection across hot reloads in development
let cached = (global as any).mongoose as MongooseCache;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
