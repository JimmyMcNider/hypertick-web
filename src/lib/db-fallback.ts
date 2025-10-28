/**
 * Database fallback utility for development
 * Provides graceful fallback when database is unavailable
 */

let dbConnectionStatus: 'unknown' | 'connected' | 'failed' = 'unknown';
let lastCheck = 0;
const CHECK_INTERVAL = 30000; // 30 seconds

export function shouldAttemptDb(): boolean {
  // In fallback mode, skip database entirely
  if (process.env.ENABLE_FALLBACK_MODE === 'true') {
    return false;
  }

  const now = Date.now();
  
  // If we recently failed, don't retry immediately
  if (dbConnectionStatus === 'failed' && now - lastCheck < CHECK_INTERVAL) {
    return false;
  }

  return true;
}

export function markDbStatus(status: 'connected' | 'failed') {
  dbConnectionStatus = status;
  lastCheck = Date.now();
  
  if (status === 'failed') {
    console.log('📊 Database unavailable - using fallback mode for next 30s');
  }
}

export function createFallbackResponse<T>(defaultData: T, message?: string) {
  return {
    ...defaultData,
    fallback: true,
    message: message || 'Running in fallback mode'
  };
}

// Common fallback data
export const fallbackData = {
  students: [],
  classes: [{
    id: 'demo-class',
    name: 'Demo Class',
    semester: 'Development',
    section: 'A',
    _count: { enrollments: 0 }
  }],
  sessions: [],
  notifications: [],
  lessons: []
};