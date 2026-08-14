import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

// Load .env.local manually if not loaded
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

async function runBackup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in environment or .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Connected successfully!");

    const db = client.db();
    const dbName = db.databaseName;
    console.log(`Target Database: ${dbName}`);

    // Create timestamped backup directory
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const backupDir = path.join(process.cwd(), 'backups', `backup_${dbName}_${timestamp}`);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collection(s) to backup.`);

    const manifest = {
      database: dbName,
      timestamp: now.toISOString(),
      collections: []
    };

    let totalDocs = 0;

    for (const collInfo of collections) {
      const collName = collInfo.name;
      if (collName.startsWith('system.')) continue;

      const coll = db.collection(collName);
      const count = await coll.countDocuments();
      console.log(`Backing up "${collName}" (${count} documents)...`);

      const docs = await coll.find({}).toArray();
      const filePath = path.join(backupDir, `${collName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');

      const stats = fs.statSync(filePath);
      manifest.collections.push({
        name: collName,
        count: count,
        file: `${collName}.json`,
        sizeBytes: stats.size
      });
      totalDocs += count;
    }

    // Save manifest
    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    console.log("\n==========================================");
    console.log(" Backup Completed Successfully!");
    console.log(` Location: ${backupDir}`);
    console.log(` Total Collections: ${manifest.collections.length}`);
    console.log(` Total Documents: ${totalDocs}`);
    console.log("==========================================");

  } catch (error) {
    console.error("Backup failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runBackup();
