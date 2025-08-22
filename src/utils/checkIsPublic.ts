export function checkIsPublic(obj: any): boolean {
  // Enhanced null safety with detailed logging
  if (!obj) {
    console.warn('[WARN] checkIsPublic: Attempted to access isPublic on a null/undefined object')
    return false
  }
  
  if (typeof obj !== 'object') {
    console.warn('[WARN] checkIsPublic: Attempted to access isPublic on non-object:', typeof obj)
    return false
  }
  
  // Check if isPublic property exists and handle null/undefined
  if (obj.isPublic === null || obj.isPublic === undefined) {
    console.warn('[WARN] checkIsPublic: isPublic property is null/undefined, defaulting to false')
    return false
  }
  
  const result = Boolean(obj.isPublic)
  console.log('[DEBUG] checkIsPublic: Resolved isPublic to:', result)
  return result
}

// Additional utility function for safe object property access
export function safeGetProperty<T>(obj: any, key: string, defaultValue: T): T {
  if (!obj || typeof obj !== 'object') {
    console.warn(`[WARN] safeGetProperty: Cannot access ${key} on invalid object, using default`)
    return defaultValue
  }
  
  const value = obj[key]
  if (value === null || value === undefined) {
    console.warn(`[WARN] safeGetProperty: Property ${key} is null/undefined, using default`)
    return defaultValue
  }
  
  return value as T
}
