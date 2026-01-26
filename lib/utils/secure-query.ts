/**
 * Secure Query Builder
 * 
 * Provides safe database query construction with parameterized statements
 * to prevent SQL injection attacks.
 */

/**
 * Escape identifiers (table names, column names) for SQL queries
 * @param identifier - SQL identifier to escape
 * @returns Escaped identifier safe for use in SQL
 */
export function escapeIdentifier(identifier: string): string {
  // Remove any existing quotes and escape properly
  const cleaned = identifier.replace(/"/g, '');
  return `"${cleaned}"`;
}

/**
 * Build a parameterized SELECT query
 * @param table - Table name
 * @param columns - Array of column names (default: ['*'])
 * @param where - WHERE conditions object
 * @param options - Additional query options (orderBy, limit, offset)
 * @returns Parameterized query object
 */
export function buildSelectQuery(
  table: string,
  columns: string[] = ['*'],
  where: Record<string, any> = {},
  options: {
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  } = {}
) {
  const escapedTable = escapeIdentifier(table);
  const escapedColumns = columns.map(col => 
    col === '*' ? col : escapeIdentifier(col)
  );
  
  let query = `SELECT ${escapedColumns.join(', ')} FROM ${escapedTable}`;
  const params: any[] = [];
  const paramNames: string[] = [];
  
  // Build WHERE clause
  const whereConditions: string[] = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(where)) {
    if (value !== undefined && value !== null) {
      const escapedColumn = escapeIdentifier(key);
      const paramName = `param_${paramIndex++}`;
      
      if (Array.isArray(value)) {
        // Handle IN clause
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        whereConditions.push(`${escapedColumn} IN (${placeholders})`);
        params.push(...value);
      } else if (typeof value === 'object' && value !== null) {
        // Handle operators like { $gt: 100, $lt: 200 }
        for (const [operator, operatorValue] of Object.entries(value)) {
          switch (operator) {
            case '$gt':
              whereConditions.push(`${escapedColumn} > $${paramIndex++}`);
              params.push(operatorValue);
              break;
            case '$gte':
              whereConditions.push(`${escapedColumn} >= $${paramIndex++}`);
              params.push(operatorValue);
              break;
            case '$lt':
              whereConditions.push(`${escapedColumn} < $${paramIndex++}`);
              params.push(operatorValue);
              break;
            case '$lte':
              whereConditions.push(`${escapedColumn} <= $${paramIndex++}`);
              params.push(operatorValue);
              break;
            case '$ne':
              whereConditions.push(`${escapedColumn} != $${paramIndex++}`);
              params.push(operatorValue);
              break;
            case '$like':
              whereConditions.push(`${escapedColumn} LIKE $${paramIndex++}`);
              params.push(operatorValue);
              break;
            case '$ilike':
              whereConditions.push(`${escapedColumn} ILIKE $${paramIndex++}`);
              params.push(operatorValue);
              break;
            default:
              throw new Error(`Unsupported operator: ${operator}`);
          }
        }
      } else {
        whereConditions.push(`${escapedColumn} = $${paramIndex++}`);
        params.push(value);
      }
    }
  }
  
  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }
  
  // Add ORDER BY
  if (options.orderBy) {
    const escapedOrderBy = escapeIdentifier(options.orderBy);
    const direction = options.orderDirection?.toUpperCase() || 'ASC';
    query += ` ORDER BY ${escapedOrderBy} ${direction}`;
  }
  
  // Add LIMIT and OFFSET
  if (options.limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }
  
  if (options.offset) {
    query += ` OFFSET $${paramIndex++}`;
    params.push(options.offset);
  }
  
  return { query, params };
}

/**
 * Build a parameterized INSERT query
 * @param table - Table name
 * @param data - Object with column values
 * @param options - Additional options (returning)
 * @returns Parameterized query object
 */
export function buildInsertQuery(
  table: string,
  data: Record<string, any>,
  options: {
    returning?: string | string[];
    onConflict?: string; // ON CONFLICT clause
  } = {}
) {
  const escapedTable = escapeIdentifier(table);
  const columns = Object.keys(data);
  const escapedColumns = columns.map(col => escapeIdentifier(col));
  const values = Object.values(data);
  
  const placeholders = values.map((_, index) => `$${index + 1}`);
  
  let query = `INSERT INTO ${escapedTable} (${escapedColumns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  
  // Add ON CONFLICT if specified
  if (options.onConflict) {
    query += ` ON CONFLICT ${options.onConflict}`;
  }
  
  // Add RETURNING clause
  if (options.returning) {
    const returningColumns = Array.isArray(options.returning) 
      ? options.returning.map(col => col === '*' ? col : escapeIdentifier(col))
      : [options.returning === '*' ? options.returning : escapeIdentifier(options.returning)];
    query += ` RETURNING ${returningColumns.join(', ')}`;
  }
  
  return { query, params: values };
}

/**
 * Build a parameterized UPDATE query
 * @param table - Table name
 * @param data - Object with column values to update
 * @param where - WHERE conditions
 * @param options - Additional options (returning)
 * @returns Parameterized query object
 */
export function buildUpdateQuery(
  table: string,
  data: Record<string, any>,
  where: Record<string, any>,
  options: {
    returning?: string | string[];
  } = {}
) {
  const escapedTable = escapeIdentifier(table);
  const columns = Object.keys(data);
  const values = Object.values(data);
  
  // Build SET clause
  const setClause = columns.map((col, index) => {
    const escapedColumn = escapeIdentifier(col);
    return `${escapedColumn} = $${index + 1}`;
  }).join(', ');
  
  let query = `UPDATE ${escapedTable} SET ${setClause}`;
  let paramIndex = columns.length + 1;
  
  // Build WHERE clause
  const whereConditions: string[] = [];
  const whereParams: any[] = [];
  
  for (const [key, value] of Object.entries(where)) {
    if (value !== undefined && value !== null) {
      const escapedColumn = escapeIdentifier(key);
      whereConditions.push(`${escapedColumn} = $${paramIndex++}`);
      whereParams.push(value);
    }
  }
  
  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }
  
  // Add RETURNING clause
  if (options.returning) {
    const returningColumns = Array.isArray(options.returning) 
      ? options.returning.map(col => col === '*' ? col : escapeIdentifier(col))
      : [options.returning === '*' ? options.returning : escapeIdentifier(options.returning)];
    query += ` RETURNING ${returningColumns.join(', ')}`;
  }
  
  return { 
    query, 
    params: [...values, ...whereParams] 
  };
}

/**
 * Build a parameterized DELETE query
 * @param table - Table name
 * @param where - WHERE conditions
 * @returns Parameterized query object
 */
export function buildDeleteQuery(
  table: string,
  where: Record<string, any>
) {
  const escapedTable = escapeIdentifier(table);
  let query = `DELETE FROM ${escapedTable}`;
  const params: any[] = [];
  
  // Build WHERE clause
  const whereConditions: string[] = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(where)) {
    if (value !== undefined && value !== null) {
      const escapedColumn = escapeIdentifier(key);
      whereConditions.push(`${escapedColumn} = $${paramIndex++}`);
      params.push(value);
    }
  }
  
  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  } else {
    throw new Error('DELETE query requires WHERE conditions to prevent accidental table deletion');
  }
  
  return { query, params };
}

/**
 * Validate and sanitize input data for database operations
 * @param data - Input data object
 * @param schema - Validation schema
 * @returns Sanitized data
 */
export function sanitizeInput(data: Record<string, any>, schema?: Record<string, (value: any) => any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip undefined values
    if (value === undefined) {
      continue;
    }
    
    // Apply schema validation if provided
    if (schema && schema[key]) {
      try {
        sanitized[key] = schema[key](value);
      } catch (error) {
        throw new Error(`Invalid value for ${key}: ${error}`);
      }
    } else {
      // Basic sanitization
      if (typeof value === 'string') {
        // Trim whitespace and remove potential SQL injection patterns
        sanitized[key] = value.trim().replace(/['";\\]/g, '');
      } else if (Array.isArray(value)) {
        // Recursively sanitize array elements
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? sanitizeInput(item, schema) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeInput(value, schema);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * Common validation schemas
 */
export const schemas = {
  email: (value: string) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error('Invalid email format');
    }
    return value.toLowerCase().trim();
  },
  
  phoneNumber: (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!/^\d{10}$/.test(cleaned)) {
      throw new Error('Phone number must be 10 digits');
    }
    return cleaned;
  },
  
  postalCode: (value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleaned)) {
      throw new Error('Invalid Canadian postal code format');
    }
    return cleaned;
  },
  
  wsibNumber: (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!/^\d{9}$/.test(cleaned)) {
      throw new Error('WSIB number must be 9 digits');
    }
    return cleaned;
  },
  
  nonEmptyString: (value: string) => {
    if (!value || value.trim().length === 0) {
      throw new Error('Value cannot be empty');
    }
    return value.trim();
  },
  
  positiveInteger: (value: number) => {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Value must be a positive integer');
    }
    return value;
  },
  
  nonNegativeInteger: (value: number) => {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Value must be a non-negative integer');
    }
    return value;
  }
};
