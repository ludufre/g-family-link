import { FamilyLinkAPI } from './api.js'
import { Authenticator } from './authenticator.js'
import { HttpError } from './errors.js'
import type {
  Cookie,
  FamilyMember,
  FamilyMembersResponse,
  DeviceInfo,
  DailyScreenTime,
  AppUsageSession,
  AppliedTimeLimitsResult,
  DeviceTimeLimitInfo,
  TimeWindow,
  TimeLimitRules,
  BedtimeScheduleEntry,
} from './types.js'

export class FamilyLink {
  private _api: FamilyLinkAPI
  private _auth: Authenticator

  constructor(auth: Authenticator) {
    this._auth = auth
    this._api = new FamilyLinkAPI(auth)
  }

  /**
   * Create from cookies.
   *
   * @param cookies - Google cookies (exported via Cookie-Editor)
   * @param authUser - Account index when multiple Google accounts are logged in (default: 0)
   */
  static fromCookies(cookies: Cookie[], authUser = 0): FamilyLink {
    const auth = Authenticator.fromCookies(cookies, authUser)
    return new FamilyLink(auth)
  }

  /** Current account index. */
  get authUser(): number {
    return this._auth.authUser
  }

  /** Switch to a different Google account (when multiple are logged in). */
  set authUser(index: number) {
    this._auth.setAuthUser(index)
  }

  // ---------------------------------------------------------------------------
  // Family members
  // ---------------------------------------------------------------------------

  async getChildren(): Promise<FamilyMember[]> {
    let res
    try {
      res = await this._api.getFamilyMembers()
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return []
      }
      throw err
    }
    const data = res.json as FamilyMembersResponse
    return (data.members ?? [])
      .filter((m) => m.memberSupervisionInfo?.isSupervisedMember)
      .map((m) => ({
        userId: m.userId,
        profile: {
          displayName: m.profile.displayName,
          email: m.profile.email,
          photoUrl: m.profile.photoUrl,
        },
        isSupervisedMember: true,
      }))
  }

  // ---------------------------------------------------------------------------
  // Devices
  // ---------------------------------------------------------------------------

  async getDevices(accountId: string): Promise<DeviceInfo[]> {
    const data = (await this._api.getAppsAndUsage(accountId)).json as Record<string, unknown>
    const deviceInfos = (data.deviceInfo ?? []) as Array<Record<string, unknown>>
    return deviceInfos.map((d) => {
      const display = (d.displayInfo ?? {}) as Record<string, string>
      return {
        deviceId: d.deviceId as string,
        name: display.friendlyName ?? 'Unknown Device',
        model: display.model,
        lastActivity: display.lastActivityTimeMillis,
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Screen time usage
  // ---------------------------------------------------------------------------

  async getDailyScreenTime(accountId: string, date?: Date): Promise<DailyScreenTime> {
    const target = date ?? new Date()
    const data = (await this._api.getAppsAndUsage(accountId)).json as Record<string, unknown>
    const sessions = (data.appUsageSessions ?? []) as AppUsageSession[]

    let totalSeconds = 0
    const appBreakdown: Record<string, number> = {}

    for (const session of sessions) {
      const sd = session.date
      if (sd?.year === target.getFullYear() && sd?.month === target.getMonth() + 1 && sd?.day === target.getDate()) {
        const usage = parseFloat((session.usage ?? '0s').replace('s', ''))
        if (!isNaN(usage)) {
          totalSeconds += usage
          const pkg = session.appId?.androidAppPackageName ?? 'unknown'
          appBreakdown[pkg] = (appBreakdown[pkg] ?? 0) + usage
        }
      }
    }

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const pad = (n: number) => String(n).padStart(2, '0')

    return {
      totalSeconds,
      formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      hours,
      minutes,
      seconds,
      appBreakdown,
    }
  }

  // ---------------------------------------------------------------------------
  // Device lock / unlock
  // ---------------------------------------------------------------------------

  async lockDevice(accountId: string, deviceId: string): Promise<boolean> {
    const res = await this._api.controlDevice(accountId, deviceId, 'lock')
    return res.status === 200
  }

  async unlockDevice(accountId: string, deviceId: string): Promise<boolean> {
    const res = await this._api.controlDevice(accountId, deviceId, 'unlock')
    return res.status === 200
  }

  // ---------------------------------------------------------------------------
  // Applied time limits (current state)
  // ---------------------------------------------------------------------------

  async getAppliedTimeLimits(accountId: string): Promise<AppliedTimeLimitsResult> {
    const res = await this._api.getAppliedTimeLimits(accountId)
    const data = res.json as unknown[]
    return parseAppliedTimeLimits(data)
  }

  // ---------------------------------------------------------------------------
  // Time bonus
  // ---------------------------------------------------------------------------

  async addTimeBonus(accountId: string, deviceId: string, minutes: number): Promise<boolean> {
    const res = await this._api.addTimeBonus(accountId, deviceId, minutes)
    return res.status === 200
  }

  async cancelTimeBonus(accountId: string, overrideId: string): Promise<boolean> {
    const res = await this._api.cancelTimeBonus(accountId, overrideId)
    return res.status === 200
  }

  // ---------------------------------------------------------------------------
  // Bedtime
  // ---------------------------------------------------------------------------

  async enableBedtime(accountId: string, ruleId?: string): Promise<boolean> {
    const id = ruleId ?? (await this._getBedtimeRuleId(accountId))
    if (!id) throw new Error('Could not find bedtime rule ID')
    const res = await this._api.enableBedtime(accountId, id)
    return res.status === 200
  }

  async disableBedtime(accountId: string, ruleId?: string): Promise<boolean> {
    const id = ruleId ?? (await this._getBedtimeRuleId(accountId))
    if (!id) throw new Error('Could not find bedtime rule ID')
    const res = await this._api.disableBedtime(accountId, id)
    return res.status === 200
  }

  /**
   * Set bedtime schedule for a specific day.
   *
   * @param accountId - Child's user ID
   * @param startTime - Start time in "HH:MM" format (e.g. "20:45")
   * @param endTime - End time in "HH:MM" format (e.g. "07:30")
   * @param day - Day of week, 1=Monday, 7=Sunday (defaults to today)
   */
  async setBedtime(accountId: string, startTime: string, endTime: string, day?: number): Promise<boolean> {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const d = day ?? isoWeekday()
    const res = await this._api.setBedtime(accountId, sh, sm, eh, em, d)
    return res.status === 200
  }

  // ---------------------------------------------------------------------------
  // School time
  // ---------------------------------------------------------------------------

  async enableSchoolTime(accountId: string, ruleId?: string): Promise<boolean> {
    const id = ruleId ?? (await this._getSchoolTimeRuleId(accountId))
    if (!id) throw new Error('Could not find school time rule ID')
    const res = await this._api.enableSchoolTime(accountId, id)
    return res.status === 200
  }

  async disableSchoolTime(accountId: string, ruleId?: string): Promise<boolean> {
    const id = ruleId ?? (await this._getSchoolTimeRuleId(accountId))
    if (!id) throw new Error('Could not find school time rule ID')
    const res = await this._api.disableSchoolTime(accountId, id)
    return res.status === 200
  }

  // ---------------------------------------------------------------------------
  // Daily limit
  // ---------------------------------------------------------------------------

  async enableDailyLimit(accountId: string): Promise<boolean> {
    const res = await this._api.enableDailyLimit(accountId)
    return res.status === 200
  }

  async disableDailyLimit(accountId: string): Promise<boolean> {
    const res = await this._api.disableDailyLimit(accountId)
    return res.status === 200
  }

  /**
   * Set daily screen time limit for a device.
   *
   * @param accountId - Child's user ID
   * @param deviceId - Device ID
   * @param minutes - Allowed minutes per day (e.g. 120 for 2h)
   */
  async setDailyLimit(accountId: string, deviceId: string, minutes: number): Promise<boolean> {
    const res = await this._api.setDailyLimit(accountId, deviceId, minutes)
    return res.status === 200
  }

  // ---------------------------------------------------------------------------
  // Time limit rules (schedules)
  // ---------------------------------------------------------------------------

  async getTimeLimitRules(accountId: string): Promise<TimeLimitRules> {
    const res = await this._api.getTimeLimit(accountId)
    const data = res.json as unknown[]
    return parseTimeLimitRules(data)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async _getBedtimeRuleId(accountId: string): Promise<string | null> {
    const rules = await this.getTimeLimitRules(accountId)
    return rules.bedtimeRuleId
  }

  private async _getSchoolTimeRuleId(accountId: string): Promise<string | null> {
    const rules = await this.getTimeLimitRules(accountId)
    return rules.schooltimeRuleId
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoWeekday(): number {
  const day = new Date().getDay() // 0=Sun
  return day === 0 ? 7 : day
}

function parseAppliedTimeLimits(data: unknown[]): AppliedTimeLimitsResult {
  const deviceLockStates: Record<string, boolean> = {}
  const devices: Record<string, DeviceTimeLimitInfo> = {}

  if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
    return { deviceLockStates, devices }
  }

  const currentDay = isoWeekday()

  for (const deviceData of data[1] as unknown[][]) {
    if (!Array.isArray(deviceData) || deviceData.length < 25) continue

    // Extract device ID
    let deviceId: string | null = null
    const first = deviceData[0]
    if (Array.isArray(first) && first.length > 3) {
      deviceId = first[3] as string
    } else if (deviceData.length > 25 && deviceData[25]) {
      deviceId = deviceData[25] as string
    }
    if (!deviceId) continue

    // Parse lock state
    let isLocked = false
    if (Array.isArray(first) && first.length > 2) {
      isLocked = first[2] === 1
    }
    deviceLockStates[deviceId] = isLocked

    const info: DeviceTimeLimitInfo = {
      totalAllowedMinutes: 0,
      usedMinutes: 0,
      remainingMinutes: 0,
      dailyLimitEnabled: false,
      dailyLimitMinutes: 0,
      bedtimeWindow: null,
      schooltimeWindow: null,
      bedtimeActive: false,
      schooltimeActive: false,
      bonusMinutes: 0,
      bonusOverrideId: null,
    }

    // Parse bonus override (type 10)
    if (Array.isArray(first) && first.length > 13) {
      const overrideType = first[2]
      if (overrideType === 10) {
        info.bonusOverrideId = first[0] as string
        const bonusMeta = first[13]
        if (Array.isArray(bonusMeta) && Array.isArray(bonusMeta[0]) && bonusMeta[0].length > 0) {
          const bonusSecondsStr = bonusMeta[0][0]
          if (typeof bonusSecondsStr === 'string' && /^\d+$/.test(bonusSecondsStr)) {
            info.bonusMinutes = Math.floor(parseInt(bonusSecondsStr) / 60)
          }
        }
      }
    }

    // Parse used time from position 20
    if (deviceData.length > 20) {
      const usedStr = deviceData[20]
      if (typeof usedStr === 'string' && /^\d+$/.test(usedStr)) {
        info.usedMinutes = Math.floor(parseInt(usedStr) / 60000)
      }
    }

    // Parse tuples (daily limits, bedtime/schooltime windows)
    for (let idx = 0; idx < deviceData.length; idx++) {
      const item = deviceData[idx]
      if (!Array.isArray(item) || item.length < 4) continue
      if (typeof item[0] !== 'string') continue

      const firstElem = item[0] as string
      const isCaeq = firstElem.startsWith('CAEQ')
      const isCamq = firstElem.startsWith('CAMQ')
      const isUuid = firstElem.length === 36 && (firstElem.match(/-/g) ?? []).length === 4

      if (!isCaeq && !isCamq && !isUuid) continue

      if (item.length === 6) {
        // Daily limit tuple
        const day = item[1] as number
        const stateFlag = item[2] as number
        const minutes = item[3] as number

        if (typeof day === 'number' && typeof stateFlag === 'number' && typeof minutes === 'number') {
          if (day === currentDay) {
            info.dailyLimitEnabled = idx < 10 && stateFlag === 2
            info.dailyLimitMinutes = minutes
          }
        }
      } else if (item.length === 8) {
        // Time window (bedtime or schooltime)
        const day = item[1] as number
        const stateFlag = item[2] as number
        const startTime = item[3]
        const endTime = item[4]

        const isBedtime = isCaeq || (isUuid && !info.bedtimeWindow)
        const isSchooltime = isCamq || (isUuid && !isBedtime)

        if (
          typeof day === 'number' && day === currentDay &&
          typeof stateFlag === 'number' && stateFlag === 2 &&
          Array.isArray(startTime) && startTime.length === 2 &&
          Array.isArray(endTime) && endTime.length === 2
        ) {
          const now = new Date()
          const startDt = new Date(now)
          startDt.setHours(startTime[0], startTime[1], 0, 0)
          const endDt = new Date(now)
          endDt.setHours(endTime[0], endTime[1], 0, 0)

          let windowActive: boolean
          if (endTime[0] < startTime[0] || (endTime[0] === startTime[0] && endTime[1] < startTime[1])) {
            windowActive = now >= startDt || now < endDt
          } else {
            windowActive = now >= startDt && now < endDt
          }

          const windowData: TimeWindow = {
            startMs: startDt.getTime(),
            endMs: endDt.getTime(),
          }

          if (isBedtime) {
            info.bedtimeWindow = windowData
            info.bedtimeActive = windowActive
          } else if (isSchooltime) {
            info.schooltimeWindow = windowData
            info.schooltimeActive = windowActive
          }
        }
      }
    }

    // Calculate remaining
    if (info.dailyLimitEnabled && info.dailyLimitMinutes > 0) {
      info.dailyLimitRemaining = Math.max(0, info.dailyLimitMinutes - info.usedMinutes)

      if (info.bonusMinutes > 0) {
        info.totalAllowedMinutes = info.bonusMinutes
        info.remainingMinutes = info.bonusMinutes
      } else {
        info.totalAllowedMinutes = info.dailyLimitMinutes
        info.remainingMinutes = Math.max(0, info.dailyLimitMinutes - info.usedMinutes)
      }
    }

    devices[deviceId] = info
  }

  return { deviceLockStates, devices }
}

function parseTimeLimitRules(data: unknown[]): TimeLimitRules {
  const result: TimeLimitRules = {
    bedtimeEnabled: false,
    schoolTimeEnabled: false,
    bedtimeSchedule: [],
    schoolTimeSchedule: [],
    bedtimeRuleId: null,
    schooltimeRuleId: null,
  }

  if (!Array.isArray(data) || data.length < 2) return result

  const inner = data[1] as unknown[]
  if (!Array.isArray(inner)) return result

  // Bedtime schedules from index 0
  if (Array.isArray(inner[0])) {
    const bedtimeConfig = inner[0] as unknown[]
    if (Array.isArray(bedtimeConfig[0])) {
      const scheduleData = bedtimeConfig[0] as unknown[]
      if (Array.isArray(scheduleData[1])) {
        for (const scheduleList of scheduleData[1] as unknown[][]) {
          if (!Array.isArray(scheduleList)) continue
          for (const item of scheduleList) {
            if (Array.isArray(item) && item.length >= 4 && typeof item[0] === 'string' && (item[0] as string).startsWith('CAEQ')) {
              const entry: BedtimeScheduleEntry = {
                day: item[1] as number,
                start: item[2] as [number, number],
                end: item[3] as [number, number],
              }
              result.bedtimeSchedule.push(entry)
            }
          }
        }
      }
    }
  }

  // School time schedules from index 1
  if (Array.isArray(inner[1])) {
    const dailyLimitConfig = inner[1] as unknown[]
    if (Array.isArray(dailyLimitConfig[0])) {
      const configData = dailyLimitConfig[0] as unknown[]
      if (configData.length > 2 && Array.isArray(configData[2])) {
        for (const item of configData[2] as unknown[]) {
          if (Array.isArray(item) && item.length >= 4 && typeof item[0] === 'string' && (item[0] as string).startsWith('CAMQ')) {
            const entry: BedtimeScheduleEntry = {
              day: item[1] as number,
              start: item[2] as [number, number],
              end: item[3] as [number, number],
            }
            result.schoolTimeSchedule.push(entry)
          }
        }
      }
    }
  }

  // Revisions (ON/OFF state and rule IDs) - search backwards
  for (let idx = inner.length - 1; idx >= 0; idx--) {
    const element = inner[idx]
    if (!Array.isArray(element)) continue

    const revisions = (element as unknown[][]).filter(
      (item) =>
        Array.isArray(item) &&
        item.length === 4 &&
        Array.isArray(item[3]) &&
        typeof item[0] === 'string' &&
        (item[0] as string).length > 30 &&
        typeof item[1] === 'number' &&
        (item[1] === 1 || item[1] === 2) &&
        typeof item[2] === 'number' &&
        (item[2] === 1 || item[2] === 2),
    )

    if (revisions.length > 0) {
      for (const rev of revisions) {
        const ruleId = rev[0] as string
        const typeFlag = rev[1] as number
        const stateFlag = rev[2] as number
        if (typeFlag === 1) {
          result.bedtimeEnabled = stateFlag === 2
          result.bedtimeRuleId = ruleId
        } else if (typeFlag === 2) {
          result.schoolTimeEnabled = stateFlag === 2
          result.schooltimeRuleId = ruleId
        }
      }
      break
    }
  }

  return result
}
