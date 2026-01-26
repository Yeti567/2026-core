import { getPostgresClient } from './postgres-client';

// Simple Supabase-like wrapper for PostgreSQL queries
export class NeonWrapper {
  private client = getPostgresClient();

  // Table query interface
  from(table: string) {
    return new NeonQueryBuilder(this.client, table);
  }

  // RPC function interface
  async rpc(functionName: string, params: any = {}) {
    // Convert params to $1, $2, etc.
    const paramKeys = Object.keys(params);
    const paramValues = Object.values(params);
    const paramPlaceholders = paramKeys.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `SELECT * FROM ${functionName}(${paramPlaceholders})`;
    
    try {
      const result = await this.client.query(query, paramValues);
      return {
        data: result.rows,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  // Auth interface (placeholder - will be replaced with proper auth)
  get auth() {
    return {
      getUser: async () => {
        // TODO: Implement proper auth using JWT/session
        return {
          data: { user: null },
          error: new Error('Auth not implemented yet')
        };
      },
      admin: {
        createUser: async (userData: any) => {
          // TODO: Implement user creation without Supabase Auth
          return {
            data: { user: null },
            error: new Error('Auth admin not implemented yet')
          };
        },
        deleteUser: async (userId: string) => {
          // TODO: Implement user deletion
          return {
            data: null,
            error: new Error('Auth admin not implemented yet')
          };
        }
      }
    };
  }
}

// Query builder for table operations
class NeonQueryBuilder {
  private client: ReturnType<typeof getPostgresClient>;
  private table: string;
  private selectFields: string[] = [];
  private whereConditions: string[] = [];
  private whereValues: any[] = [];
  private orderBy: string[] = [];
  private limitCount?: number;
  private offsetCount?: number;
  private insertData?: any;
  private updateData?: any;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';

  constructor(client: ReturnType<typeof getPostgresClient>, table: string) {
    this.client = client;
    this.table = table;
  }

  select(fields: string = '*') {
    if (typeof fields === 'string') {
      this.selectFields = [fields];
    } else {
      this.selectFields = fields;
    }
    if (this.operation === 'select') {
      this.operation = 'select';
    }
    return this;
  }

  eq(column: string, value: any) {
    this.whereConditions.push(`${column} = $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  neq(column: string, value: any) {
    this.whereConditions.push(`${column} <> $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  gte(column: string, value: any) {
    this.whereConditions.push(`${column} >= $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  lte(column: string, value: any) {
    this.whereConditions.push(`${column} <= $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  like(column: string, pattern: string) {
    this.whereConditions.push(`${column} LIKE $${this.whereValues.length + 1}`);
    this.whereValues.push(pattern);
    return this;
  }

  ilike(column: string, pattern: string) {
    this.whereConditions.push(`${column} ILIKE $${this.whereValues.length + 1}`);
    this.whereValues.push(pattern);
    return this;
  }

  is(column: string, value: any) {
    if (value === null) {
      this.whereConditions.push(`${column} IS NULL`);
      return this;
    }

    this.whereConditions.push(`${column} IS $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is') {
      if (value === null) {
        this.whereConditions.push(`${column} IS NOT NULL`);
        return this;
      }

      this.whereConditions.push(`${column} IS NOT $${this.whereValues.length + 1}`);
      this.whereValues.push(value);
      return this;
    }

    if (operator === 'eq') {
      return this.neq(column, value);
    }

    if (operator === 'like') {
      this.whereConditions.push(`${column} NOT LIKE $${this.whereValues.length + 1}`);
      this.whereValues.push(value);
      return this;
    }

    if (operator === 'ilike') {
      this.whereConditions.push(`${column} NOT ILIKE $${this.whereValues.length + 1}`);
      this.whereValues.push(value);
      return this;
    }

    throw new Error(`Unsupported not() operator: ${operator}`);
  }

  in(column: string, values: any[]) {
    const placeholders = values.map((_, i) => `$${this.whereValues.length + 1 + i}`).join(', ');
    this.whereConditions.push(`${column} IN (${placeholders})`);
    this.whereValues.push(...values);
    return this;
  }

  order(column: string, ascending: boolean = true) {
    const direction = ascending ? 'ASC' : 'DESC';
    this.orderBy.push(`${column} ${direction}`);
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  offset(count: number) {
    this.offsetCount = count;
    return this;
  }

  insert(data: any) {
    this.insertData = data;
    this.operation = 'insert';
    return this;
  }

  update(data: any) {
    this.updateData = data;
    this.operation = 'update';
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  private async executeQuery(query: string, params: any[] = []) {
    try {
      const result = await this.client.query(query, params);
      return {
        data: result.rows,
        error: null,
        rows: result.rows // Add rows property for compatibility
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        rows: []
      };
    }
  }

  // Execute query when awaited (Supabase-like thenable)
  async then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    const returning = this.selectFields.length > 0 ? this.selectFields.join(', ') : '*';

    try {
      if (this.operation === 'insert') {
        if (!this.insertData) {
          resolve({ data: null, error: new Error('No data provided for insert') });
          return;
        }

        const columns = Object.keys(this.insertData);
        const values = Object.values(this.insertData);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING ${returning}`;
        const result = await this.client.query(query, values);

        if (this.limitCount === 1) {
          resolve({ data: result.rows[0] || null, error: null });
        } else {
          resolve({ data: result.rows, error: null });
        }
        return;
      }

      if (this.operation === 'update') {
        if (!this.updateData) {
          resolve({ data: null, error: new Error('No data provided for update') });
          return;
        }

        const setClause = Object.keys(this.updateData)
          .map((key, i) => `${key} = $${this.whereValues.length + i + 1}`)
          .join(', ');

        const params = [...this.whereValues, ...Object.values(this.updateData)];
        let query = `UPDATE ${this.table} SET ${setClause}`;

        if (this.whereConditions.length > 0) {
          query += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }

        query += ` RETURNING ${returning}`;
        const result = await this.client.query(query, params);

        if (this.limitCount === 1) {
          resolve({ data: result.rows[0] || null, error: null });
        } else {
          resolve({ data: result.rows, error: null });
        }
        return;
      }

      if (this.operation === 'delete') {
        const params = [...this.whereValues];
        let query = `DELETE FROM ${this.table}`;

        if (this.whereConditions.length > 0) {
          query += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }

        query += ` RETURNING ${returning}`;
        const result = await this.client.query(query, params);

        if (this.limitCount === 1) {
          resolve({ data: result.rows[0] || null, error: null });
        } else {
          resolve({ data: result.rows, error: null });
        }
        return;
      }

      // Default: SELECT
      const fields = returning;
      let query = `SELECT ${fields} FROM ${this.table}`;
      const params = [...this.whereValues];

      if (this.whereConditions.length > 0) {
        query += ` WHERE ${this.whereConditions.join(' AND ')}`;
      }

      if (this.orderBy.length > 0) {
        query += ` ORDER BY ${this.orderBy.join(', ')}`;
      }

      if (this.limitCount) {
        query += ` LIMIT ${this.limitCount}`;
      }

      if (this.offsetCount) {
        query += ` OFFSET ${this.offsetCount}`;
      }

      const result = await this.client.query(query, params);

      if (this.limitCount === 1) {
        resolve({ data: result.rows[0] || null, error: null });
      } else {
        resolve({ data: result.rows, error: null });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (reject) reject(err);
      return { data: null, error: err };
    }
  }

  // Execute INSERT query
  async insertThen(resolve: (value: any) => any, reject?: (reason: any) => any) {
    if (!this.insertData) {
      const error = new Error('No data provided for insert');
      if (reject) reject(error);
      return { data: null, error };
    }

    const columns = Object.keys(this.insertData);
    const values = Object.values(this.insertData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    let query = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    // Add RETURNING clause to get the inserted record
    query += ` RETURNING *`;

    try {
      const result = await this.client.query(query, values);
      
      // Return single inserted record
      resolve({
        data: result.rows[0] || null,
        error: null
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (reject) reject(err);
      return { data: null, error: err };
    }
  }

  // Execute UPDATE query
  async updateThen(resolve: (value: any) => any, reject?: (reason: any) => any) {
    if (!this.updateData) {
      const error = new Error('No data provided for update');
      if (reject) reject(error);
      return { data: null, error };
    }

    const setClause = Object.keys(this.updateData)
      .map((key, i) => `${key} = $${this.whereValues.length + i + 1}`)
      .join(', ');
    
    const params = [...this.whereValues, ...Object.values(this.updateData)];
    
    let query = `UPDATE ${this.table} SET ${setClause}`;
    
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    query += ` RETURNING *`;

    try {
      const result = await this.client.query(query, params);
      
      resolve({
        data: result.rows,
        error: null
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (reject) reject(err);
      return { data: null, error: err };
    }
  }

  // Execute DELETE query
  async deleteThen(resolve: (value: any) => any, reject?: (reason: any) => any) {
    let query = `DELETE FROM ${this.table}`;
    const params = [...this.whereValues];
    
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    query += ` RETURNING *`;

    try {
      const result = await this.client.query(query, params);
      
      resolve({
        data: result.rows,
        error: null
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (reject) reject(err);
      return { data: null, error: err };
    }
  }

  // Upsert query (PostgreSQL ON CONFLICT)
  async upsert(data: any, options?: { onConflict?: string }) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    let query = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    if (options?.onConflict) {
      const updateSet = columns
        .filter(col => col !== 'created_at') // Don't update created_at
        .map((col, i) => `${col} = EXCLUDED.${col}`)
        .join(', ');
      
      query += ` ON CONFLICT (${options.onConflict}) DO UPDATE SET ${updateSet}`;
    }
    
    query += ` RETURNING *`;

    try {
      const result = await this.client.query(query, values);
      return {
        data: result.rows[0] || null,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  // Single record helper
  single() {
    this.limitCount = 1;
    return this;
  }
}

// Create wrapper instance
export function createNeonWrapper() {
  return new NeonWrapper();
}
