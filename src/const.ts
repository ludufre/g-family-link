export const BASE_URL = 'https://kidsmanagement-pa.clients6.google.com/kidsmanagement/v1'
export const ORIGIN = 'https://familylink.google.com'
export const API_KEY = 'AIzaSyAQb1gupaJhY3CXQy2xmTwJMcjmot3M2hw'
export const SESSION_MAX_AGE = 1800 // 30 minutes

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const DAY_CODES: Record<number, string> = {
  1: 'CAEQAQ', // Monday
  2: 'CAEQAg', // Tuesday
  3: 'CAEQAw', // Wednesday
  4: 'CAEQBA', // Thursday
  5: 'CAEQBQ', // Friday
  6: 'CAEQBg', // Saturday
  7: 'CAEQBw', // Sunday
}

export const DEVICE_LOCK_CODE = 1
export const DEVICE_UNLOCK_CODE = 4
