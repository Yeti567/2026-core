/**
 * Safe Object Access Utilities
 * 
 * Provides type-safe, secure methods for accessing object properties dynamically.
 * Prevents prototype pollution attacks by validating keys before access.
 */

// Dangerous prototype properties that should never be accessed dynamically
const FORBIDDEN_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

/**
 * Checks if a key is safe to use for object property access.
 * Prevents prototype pollution by blocking dangerous property names.
 */
export function isSafeKey(key: unknown): key is string | number {
  if (typeof key === 'number') return true;
  if (typeof key !== 'string') return false;
  return !FORBIDDEN_KEYS.has(key);
}

/**
 * Safely get a property from an object using a dynamic key.
 * Returns undefined if the key is dangerous or doesn't exist.
 * 
 * @example
 * const value = safeGet(obj, userInput); // Safe from prototype pollution
 */
export function safeGet<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K];
export function safeGet<T extends object>(
  obj: T,
  key: string | number
): unknown;
export function safeGet<T extends object>(
  obj: T,
  key: string | number
): unknown {
  if (!isSafeKey(key)) return undefined;
  if (obj == null) return undefined;
   
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key as keyof T] : undefined;
}

/**
 * Safely set a property on an object using a dynamic key.
 * Does nothing if the key is dangerous.
 * 
 * @example
 * safeSet(obj, userInput, value); // Safe from prototype pollution
 */
export function safeSet<T extends object>(
  obj: T,
  key: string | number,
  value: unknown
): void {
  if (!isSafeKey(key)) return;
  if (obj == null) return;
  // eslint-disable-next-line security/detect-object-injection
  (obj as Record<string | number, unknown>)[key] = value;
}

/**
 * Safely check if an object has a property using a dynamic key.
 * Returns false if the key is dangerous.
 * 
 * @example
 * if (safeHas(obj, userInput)) { ... } // Safe from prototype pollution
 */
export function safeHas<T extends object>(
  obj: T,
  key: string | number
): boolean {
  if (!isSafeKey(key)) return false;
  if (obj == null) return false;
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Safely delete a property from an object using a dynamic key.
 * Does nothing if the key is dangerous.
 * 
 * @example
 * safeDelete(obj, userInput); // Safe from prototype pollution
 */
export function safeDelete<T extends object>(
  obj: T,
  key: string | number
): boolean {
  if (!isSafeKey(key)) return false;
  if (obj == null) return false;
  // eslint-disable-next-line security/detect-object-injection
  return delete (obj as Record<string | number, unknown>)[key];
}

/**
 * Creates a type-safe record accessor for a specific type.
 * Useful for typed dictionaries.
 * 
 * @example
 * const scores: Record<string, number> = { alice: 100 };
 * const accessor = createRecordAccessor<number>(scores);
 * const aliceScore = accessor.get('alice'); // 100
 */
export function createRecordAccessor<V>(record: Record<string, V>) {
  return {
    get(key: string): V | undefined {
      return safeGet(record, key) as V | undefined;
    },
    set(key: string, value: V): void {
      safeSet(record, key, value);
    },
    has(key: string): boolean {
      return safeHas(record, key);
    },
    delete(key: string): boolean {
      return safeDelete(record, key);
    },
  };
}

/**
 * Safely access a nested property path on an object.
 * Returns undefined if any part of the path is dangerous or doesn't exist.
 * 
 * @example
 * const value = safeGetPath(obj, ['user', 'profile', 'name']);
 */
export function safeGetPath<T = unknown>(
  obj: unknown,
  path: (string | number)[]
): T | undefined {
  let current: unknown = obj;
  
  for (const key of path) {
    if (!isSafeKey(key)) return undefined;
    if (current == null || typeof current !== 'object') return undefined;
    // eslint-disable-next-line security/detect-object-injection
    current = (current as Record<string | number, unknown>)[key];
  }
  
  return current as T;
}

/**
 * Map over object entries safely.
 * Only iterates over own enumerable properties.
 * 
 * @example
 * const result = safeMapEntries(obj, ([key, value]) => [key, value * 2]);
 */
export function safeMapEntries<T extends object, R>(
  obj: T,
  mapper: (entry: [string, unknown], index: number) => R
): R[] {
  if (obj == null) return [];
  return Object.entries(obj).map(mapper);
}

/**
 * Safely reduce over object entries.
 * Only iterates over own enumerable properties.
 * 
 * @example
 * const sum = safeReduceEntries(scores, (acc, [, value]) => acc + value, 0);
 */
export function safeReduceEntries<T extends object, R>(
  obj: T,
  reducer: (accumulator: R, entry: [string, unknown], index: number) => R,
  initialValue: R
): R {
  if (obj == null) return initialValue;
  return Object.entries(obj).reduce(reducer, initialValue);
}

/**
 * Creates a safe Map from an object.
 * Useful when you need frequent dynamic access.
 * 
 * @example
 * const map = objectToMap({ a: 1, b: 2 });
 * const value = map.get('a'); // 1
 */
export function objectToMap<V>(obj: Record<string, V>): Map<string, V> {
  const map = new Map<string, V>();
  if (obj == null) return map;
  for (const [key, value] of Object.entries(obj)) {
    map.set(key, value);
  }
  return map;
}
