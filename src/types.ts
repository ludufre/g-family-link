// ─── Cookie / Auth ───────────────────────────────────────────────────────────

export interface Cookie {
  name: string
  value: string
  domain?: string
  expirationDate?: number
  hostOnly?: boolean
  httpOnly?: boolean
  path?: string
  sameSite?: string | null
  secure?: boolean
  session?: boolean
  storeId?: string | null
}

export interface Credentials {
  cookies: Cookie[]
}

// ─── Family ─────────────────────────────────────────────────────────────────

export interface FamilyMember {
  userId: string
  profile: {
    displayName: string
    email?: string
    photoUrl?: string
  }
  isSupervisedMember: boolean
}

export interface FamilyMembersResponse {
  members: Array<{
    userId: string
    profile: {
      displayName: string
      email?: string
      photoUrl?: string
    }
    memberSupervisionInfo?: {
      isSupervisedMember?: boolean
    }
  }>
}

// ─── Device ─────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  deviceId: string
  name: string
  model?: string
  lastActivity?: string
}

// ─── Screen time ────────────────────────────────────────────────────────────

export interface DailyScreenTime {
  totalSeconds: number
  formatted: string
  hours: number
  minutes: number
  seconds: number
  appBreakdown: Record<string, number>
}

export interface AppUsageSession {
  date: { year: number; month: number; day: number }
  usage: string // e.g. "1809.5s"
  appId: { androidAppPackageName?: string }
}

// ─── Applied time limits ────────────────────────────────────────────────────

export interface DeviceTimeLimitInfo {
  totalAllowedMinutes: number
  usedMinutes: number
  remainingMinutes: number
  dailyLimitEnabled: boolean
  dailyLimitMinutes: number
  dailyLimitRemaining?: number
  bedtimeWindow: TimeWindow | null
  schooltimeWindow: TimeWindow | null
  bedtimeActive: boolean
  schooltimeActive: boolean
  bonusMinutes: number
  bonusOverrideId: string | null
}

export interface TimeWindow {
  startMs: number
  endMs: number
}

export interface AppliedTimeLimitsResult {
  deviceLockStates: Record<string, boolean>
  devices: Record<string, DeviceTimeLimitInfo>
}

// ─── Time limit rules ───────────────────────────────────────────────────────

export interface BedtimeScheduleEntry {
  day: number
  start: [number, number] // [hour, minute]
  end: [number, number]   // [hour, minute]
}

export interface TimeLimitRules {
  bedtimeEnabled: boolean
  schoolTimeEnabled: boolean
  bedtimeSchedule: BedtimeScheduleEntry[]
  schoolTimeSchedule: BedtimeScheduleEntry[]
  bedtimeRuleId: string | null
  schooltimeRuleId: string | null
}
