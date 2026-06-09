/**
 * DB Connector — Direct database seeding (optional feature)
 * Supports PostgreSQL, MySQL, and SQLite via their respective drivers.
 * 
 * Drivers are lazy-loaded at runtime — only install the driver for your DB:
 *   npm install pg          # PostgreSQL
 *   npm install mysql2       # MySQL
 *   npm install better-sqlite3  # SQLite
 * 
 * Usage:
 *   const connector = new DBConnector(config);
 *   await connector.connect();
 *   await connector.seed(data, seedOrder);
 *   await connector.disconnect();
 */

export interface DBConfig {
  type: 'postgresql' | 'mysql' | 'sqlite';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  /** Path to SSL CA certificate file (for PostgreSQL) */
  sslCaPath?: string;
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
      default:
        throw new Error('Unsupported database type: ' + this.config.type);
    }
  }

  /**
   * Seed data into the database.
   * Inserts records in the provided order, respecting foreign key constraints.
   */
  async seed(
    data: Map<string, Record<string, unknown>[]>,
    seedOrder: string[],
  ): Promise<SeedResult[]> {
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
   * Disconnect from the database.
   */
  async disconnect(): Promise<void> {
    if (!this.connection) return;
    await this.connection.close();
    this.connection = null;
  }

  // ─── Private Helpers ────────────────────────────────────────────

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
        'Direct database seeding is optional. Use output formatters (prisma-seed, sql, json, csv, factory) instead.'
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
        return '`' + name.replace(/`/g, '``') + '`';
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
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
}
