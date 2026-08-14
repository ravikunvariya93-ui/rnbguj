import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

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

async function runRestore() {
  const backupFolderArg = process.argv[2];
  const backupsBase = path.join(process.cwd(), 'backups');

  let targetBackupDir = '';

  if (backupFolderArg) {
    targetBackupDir = path.isAbsolute(backupFolderArg) ? backupFolderArg : path.join(process.cwd(), backupFolderArg);
  } else {
    // Find the latest backup directory
    if (!fs.existsSync(backupsBase)) {
      console.error("No backups directory found.");
      process.exit(1);
    }
    const dirs = fs.readdirSync(backupsBase)
      .filter(f => fs.statSync(path.join(backupsBase, f)).isDirectory() && f.startsWith('backup_'))
      .sort()
      .reverse();

    if (dirs.length === 0) {
      console.error("No backup directories found inside backups/");
      process.exit(1);
    }

    targetBackupDir = path.join(backupsBase, dirs[0]);
  }

  console.log(`Restoring from: ${targetBackupDir}`);

  const manifestPath = path.join(targetBackupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error("manifest.json not found in backup directory.");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    console.log(`Connected to database: ${db.databaseName}`);

    for (const item of manifest.collections) {
      const filePath = path.join(targetBackupDir, item.file);
      if (!fs.existsSync(filePath)) continue;

      const docs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const coll = db.collection(item.name);

      console.log(`Restoring ${item.name} (${docs.length} documents)...`);
      await coll.deleteMany({});
      if (docs.length > 0) {
        await coll.insertMany(docs);
      }
    }

    console.log("\n==========================================");
    console.log(" Restore Completed Successfully!");
    console.log("==========================================");
  } catch (err) {
    console.error("Restore failed:", err);
  } finally {
    await client.close();
  }
}

runRestore();
