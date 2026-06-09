/**
 * DB Connector — Direct database seeding (optional feature)
 * Supports PostgreSQL, MySQL, SQLite, and MongoDB via their respective drivers.
 * 
 * Drivers are lazy-loaded at runtime — only install the driver for your DB:
 *   npm install pg                # PostgreSQL
 *   npm install mysql2            # MySQL
 *   npm install better-sqlite3   # SQLite
 *   npm install mongodb           # MongoDB
 * 
 * Usage:
 *   const connector = new DBConnector(config);
 *   await connector.connect();
 *   await connector.seed(data, seedOrder);
 *   await connector.disconnect();
 */

export interface DBConfig {
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  /** Path to SSL CA certificate file (for PostgreSQL) */
  sslCaPath?: string;
  /** MongoDB connection options */
  mongodbOptions?: {
    authSource?: string;
    replicaSet?: string;
    directConnection?: boolean;
  };
}

interface SeedResult {
  entityName: string;
  insertedCount: number;
  skippedCount: number;
  errors: string[];
}

interface DBConnection {
  query: (sql: string, params?: unknown[]) => Promise<{ rowCount: number }>;
  close: () => Promise<void> | void;
}

export class DBConnector {
  private config: DBConfig;
  private connection: DBConnection | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mongoClient: any | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mongoDb: any | null = null;

  constructor(config: DBConfig) {
    this.config = config;
  }

  /**
   * Connect to the database using the appropriate driver.
   * Drivers are lazy-loaded to avoid requiring all DB drivers at once.
   */
  async connect(): Promise<void> {
    switch (this.config.type) {
      case 'postgresql': {
        const pg = await this.loadDriver('pg', 'npm install pg');
        const sslConfig = this.config.ssl ? { rejectUnauthorized: false } : undefined;
        const client = new pg.Client({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          ssl: sslConfig,
        });
        await client.connect();
        await client.query('SELECT 1');
        this.connection = {
          query: (sql: string, params?: unknown[]) => client.query(sql, params),
          close: () => client.end(),
        };
        break;
      }
      case 'mysql': {
        const mysql = await this.loadDriver('mysql2/promise', 'npm install mysql2');
        const pool = mysql.createPool({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          connectionLimit: 5,
        });
        await pool.query('SELECT 1');
        this.connection = {
          query: async (sql: string, params?: unknown[]) => {
            const [rows] = await pool.query(sql, params);
            return { rowCount: Array.isArray(rows) ? rows.length : 0 };
          },
          close: () => pool.end(),
        };
        break;
      }
      case 'sqlite': {
        const sqlite = await this.loadDriver('better-sqlite3', 'npm install better-sqlite3');
        const db = new sqlite(this.config.database);
        this.connection = {
          query: (sql: string, params?: unknown[]) => {
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
              const rows = db.prepare(sql).all(...(params ?? []));
              return Promise.resolve({ rowCount: rows.length });
            }
            const result = db.prepare(sql).run(...(params ?? []));
            return Promise.resolve({ rowCount: result.changes });
          },
          close: () => db.close(),
        };
        break;
      }
      case 'mongodb': {
        const mongodb = await this.loadDriver('mongodb', 'npm install mongodb');
        const mongoOptions: Record<string, unknown> = {};
        if (this.config.mongodbOptions?.authSource) {
          mongoOptions.authSource = this.config.mongodbOptions.authSource;
        }
        if (this.config.mongodbOptions?.replicaSet) {
          mongoOptions.replicaSet = this.config.mongodbOptions.replicaSet;
        }
        if (this.config.mongodbOptions?.directConnection !== undefined) {
          mongoOptions.directConnection = this.config.mongodbOptions.directConnection;
        }

        const connectionString = this.buildMongoDBConnectionString();
        this.mongoClient = new mongodb.MongoClient(connectionString, mongoOptions);
        await this.mongoClient.connect();
        this.mongoDb = this.mongoClient.db(this.config.database);

        // Verify connection by listing collections
        await this.mongoDb.listCollections().toArray();
        // MongoDB doesn't use the SQL connection interface — leave it null
        this.connection = null;
        break;
      }
      default:
        throw new Error('Unsupported database type: ' + this.config.type);
    }
  }

  /**
   * Seed data into the database.
   * For SQL databases, inserts records in the provided order, respecting foreign key constraints.
   * For MongoDB, inserts documents into collections in the provided order.
   */
  async seed(
    data: Map<string, Record<string, unknown>[]>,
    seedOrder: string[],
  ): Promise<SeedResult[]> {
    // MongoDB seeding uses a different approach
    if (this.config.type === 'mongodb') {
      return this.seedMongoDB(data, seedOrder);
    }

    if (!this.connection) {
      throw new Error('Not connected. Call connect() first.');
    }

    const results: SeedResult[] = [];

    // Start transaction
    await this.connection.query('BEGIN');

    try {
      // Delete in reverse dependency order
      for (const entity of seedOrder.slice().reverse()) {
        const tableName = toSnakeCase(entity);
        await this.connection.query('DELETE FROM ' + this.escapeIdentifier(tableName));
      }

      // Insert in dependency order
      for (const entity of seedOrder) {
        const records = data.get(entity) ?? [];
        const tableName = toSnakeCase(entity);
        let insertedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const record of records) {
          const fields = Object.keys(record).filter(k => k !== '__edgeCase');
          const values = fields.map(f => this.formatValue(record[f]));
          const columns = fields.map(f => this.escapeIdentifier(toSnakeCase(f)));
          const placeholders = fields.map((_, i) => this.getPlaceholder(i));

          const sql = 'INSERT INTO ' + this.escapeIdentifier(tableName) +
            ' (' + columns.join(', ') + ') VALUES (' + placeholders.join(', ') + ')';

          try {
            await this.connection.query(sql, values);
            insertedCount++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('UNIQUE')) {
              skippedCount++;
            } else {
              errors.push(msg);
            }
          }
        }

        results.push({ entityName: entity, insertedCount, skippedCount, errors });
      }

      await this.connection.query('COMMIT');
    } catch (err) {
      await this.connection.query('ROLLBACK');
      throw err;
    }

    return results;
  }

  /**
   * Seed data into MongoDB collections.
   * Drops collections in reverse order, then inserts documents in dependency order.
   */
  private async seedMongoDB(
    data: Map<string, Record<string, unknown>[]>,
    seedOrder: string[],
  ): Promise<SeedResult[]> {
    if (!this.mongoDb) {
      throw new Error('Not connected to MongoDB. Call connect() first.');
    }

    const results: SeedResult[] = [];

    // Drop collections in reverse dependency order
    for (const entity of seedOrder.slice().reverse()) {
      const collectionName = toSnakeCase(entity);
      try {
        await this.mongoDb.collection(collectionName).drop();
      } catch {
        // Collection may not exist — ignore
      }
    }

    // Insert documents in dependency order
    for (const entity of seedOrder) {
      const records = data.get(entity) ?? [];
      const collectionName = toSnakeCase(entity);
      let insertedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      if (records.length === 0) {
        results.push({ entityName: entity, insertedCount: 0, skippedCount: 0, errors: [] });
        continue;
      }

      // Clean documents for MongoDB insertion
      const cleanDocs = records.map(record => {
        const doc: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record)) {
          if (key === '__edgeCase') continue;

          // Convert 'id' field to '_id' for MongoDB if it looks like a UUID
          if (key === 'id' && typeof value === 'string' && value.length === 36) {
            doc['_id'] = value;
          } else {
            doc[toSnakeCase(key)] = this.formatMongoValue(value);
          }
        }
        return doc;
      });

      try {
        const insertResult = await this.mongoDb.collection(collectionName).insertMany(cleanDocs, {
          ordered: false, // Continue inserting even if some docs fail
        });
        insertedCount = insertResult.insertedCount;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'result' in err) {
          const writeErr = err as { result: { insertedCount: number }; writeErrors?: Array<{ code: number; errmsg: string }> };
          insertedCount = writeErr.result?.insertedCount ?? 0;
          const writeErrors = writeErr.writeErrors ?? [];
          for (const we of writeErrors) {
            if (we.code === 11000) {
              skippedCount++;
            } else {
              errors.push(we.errmsg);
            }
          }
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('duplicate key') || msg.includes('E11000')) {
            skippedCount = records.length;
          } else {
            errors.push(msg);
          }
        }
      }

      results.push({ entityName: entity, insertedCount, skippedCount, errors });
    }

    return results;
  }

  /**
   * Disconnect from the database.
   */
  async disconnect(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.mongoClient = null;
      this.mongoDb = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────

  /**
   * Build a MongoDB connection string from the DBConfig.
   */
  private buildMongoDBConnectionString(): string {
    const cfg = this.config;
    const encodedPassword = encodeURIComponent(cfg.password);
    if (cfg.user && cfg.password) {
      return 'mongodb://' + cfg.user + ':' + encodedPassword + '@' + cfg.host + ':' + cfg.port + '/' + cfg.database;
    }
    return 'mongodb://' + cfg.host + ':' + cfg.port + '/' + cfg.database;
  }

  /**
   * Format a value for MongoDB document insertion.
   * Handles Date objects, BigInt, and nested objects.
   */
  private formatMongoValue(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'object' && !Array.isArray(value)) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        obj[k] = this.formatMongoValue(v);
      }
      return obj;
    }
    return value;
  }

  /**
   * Lazy-load a database driver with a helpful error message if not installed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadDriver(moduleName: string, installHint: string): Promise<any> {
    try {
      return await import(moduleName);
    } catch {
      throw new Error(
        'Database driver "' + moduleName + '" is not installed. Install it with: ' + installHint + '\n' +
        'Direct database seeding is optional. Use output formatters (prisma-seed, sql, json, csv, factory, mongodb) instead.'
      );
    }
  }

  private getPlaceholder(index: number): string {
    switch (this.config.type) {
      case 'postgresql':
        return '$' + (index + 1);
      case 'mysql':
      case 'sqlite':
        return '?';
      default:
        return '$' + (index + 1);
    }
  }

  private escapeIdentifier(name: string): string {
    switch (this.config.type) {
      case 'postgresql':
        return '"' + name.replace(/"/g, '""') + '"';
      case 'mysql':
        return String.fromCharCode(96) + name.replace(String.fromCharCode(96), String.fromCharCode(96) + String.fromCharCode(96)) + String.fromCharCode(96);
      case 'sqlite':
        return '"' + name.replace(/"/g, '""') + '"';
      default:
        return '"' + name + '"';
    }
  }

  private formatValue(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'bigint') return Number(value);
    return value;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '')
    .replace(/([a-z\d])([A-Z])/g, '')
    .toLowerCase();
}
