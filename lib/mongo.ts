import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getUri(): string {
  return process.env.MONGODB_URI?.trim() || "";
}

export function isMongoConfigured(): boolean {
  return Boolean(getUri());
}

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = getUri();
  if (!uri) return null;

  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 12_000,
      connectTimeoutMS: 12_000,
    });
    globalForMongo._mongoClientPromise = client.connect().catch((err) => {
      // Don't cache a failed connect — next request can retry
      globalForMongo._mongoClientPromise = undefined;
      throw err;
    });
  }

  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  // Prefer DB name from URI path; fall back to elitespeak
  const dbName = client.options.dbName || "elitespeak";
  return client.db(dbName);
}

/** Safe one-line reason for admin UI (no secrets). */
export function mongoErrorHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/bad auth|authentication failed|SCRAM/i.test(msg)) {
    return "MongoDB authentication failed. Check username/password in MONGODB_URI (URL-encode special characters in the password).";
  }
  if (/ENOTFOUND|querySrv|getaddrinfo/i.test(msg)) {
    return "Could not reach the Atlas cluster hostname. Check the MONGODB_URI host.";
  }
  if (/timed out|Timeout|Server selection/i.test(msg)) {
    return "MongoDB timed out. In Atlas → Network Access, allow 0.0.0.0/0 (or Vercel IPs), then redeploy.";
  }
  if (/IP|whitelist|not authorized/i.test(msg)) {
    return "IP not allowed. In Atlas → Network Access, add 0.0.0.0/0 for Vercel.";
  }
  return "Could not connect to MongoDB. Check MONGODB_URI and Atlas Network Access (0.0.0.0/0).";
}
