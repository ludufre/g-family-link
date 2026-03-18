import { BASE_URL, DAY_CODES, DEVICE_LOCK_CODE, DEVICE_UNLOCK_CODE } from './const.js'
import type { Authenticator } from './authenticator.js'
import { HttpError, SessionExpiredError } from './errors.js'

export interface ApiResponse<T = unknown> {
  status: number
  json: T
  headers: Headers
}

export class FamilyLinkAPI {
  constructor(private readonly auth: Authenticator) {}

  private async request<T = unknown>(
    url: string,
    options: {
      method?: string
      body?: unknown
      params?: [string, string][]
      headers?: Record<string, string>
    } = {},
  ): Promise<ApiResponse<T>> {
    const method = options.method ?? 'GET'
    const headers = {
      ...this.auth.getHeaders(),
      ...options.headers,
    }

    let fullUrl = url
    if (options.params?.length) {
      const search = new URLSearchParams(options.params)
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + search.toString()
    }

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: options.body != null ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    })

    if (response.status >= 200 && response.status < 300) {
      let json: T = undefined as T
      try {
        json = (await response.json()) as T
      } catch {
        // non-JSON response
      }
      return { status: response.status, json, headers: response.headers }
    }

    const text = await response.text()
    if (response.status === 401) throw new SessionExpiredError()
    throw new HttpError(`HTTP ${response.status}`, response.status, text)
  }

  // ─── Family members ─────────────────────────────────────────────────────────

  async getFamilyMembers() {
    return this.request(`${BASE_URL}/families/mine/members`, {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ─── Apps & usage ───────────────────────────────────────────────────────────

  async getAppsAndUsage(accountId: string) {
    return this.request(`${BASE_URL}/people/${accountId}/appsandusage`, {
      headers: { 'Content-Type': 'application/json' },
      params: [
        ['capabilities', 'CAPABILITY_APP_USAGE_SESSION'],
        ['capabilities', 'CAPABILITY_SUPERVISION_CAPABILITIES'],
      ],
    })
  }

  // ─── Applied time limits ────────────────────────────────────────────────────

  async getAppliedTimeLimits(accountId: string) {
    return this.request(`${BASE_URL}/people/${accountId}/appliedTimeLimits`, {
      params: [['capabilities', 'TIME_LIMIT_CLIENT_CAPABILITY_SCHOOLTIME']],
    })
  }

  // ─── Time limit rules ──────────────────────────────────────────────────────

  async getTimeLimit(accountId: string) {
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit`, {
      params: [
        ['capabilities', 'TIME_LIMIT_CLIENT_CAPABILITY_SCHOOLTIME'],
        ['timeLimitKey.type', 'SUPERVISED_DEVICES'],
      ],
    })
  }

  // ─── Device lock/unlock ─────────────────────────────────────────────────────

  async controlDevice(accountId: string, deviceId: string, action: 'lock' | 'unlock') {
    const actionCode = action === 'lock' ? DEVICE_LOCK_CODE : DEVICE_UNLOCK_CODE
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, actionCode, deviceId]],
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimitOverrides:batchCreate`, {
      method: 'POST',
      body: payload,
    })
  }

  // ─── Time bonus ─────────────────────────────────────────────────────────────

  async addTimeBonus(accountId: string, deviceId: string, bonusMinutes: number) {
    const bonusSeconds = bonusMinutes * 60
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, 10, deviceId, null, null, null, null, null, null, null, null, null, [[String(bonusSeconds), 0]]]],
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimitOverrides:batchCreate`, {
      method: 'POST',
      body: payload,
    })
  }

  async cancelTimeBonus(accountId: string, overrideId: string) {
    return this.request(
      `${BASE_URL}/people/${accountId}/timeLimitOverride/${overrideId}?$httpMethod=DELETE`,
      { method: 'POST' },
    )
  }

  // ─── Bedtime ────────────────────────────────────────────────────────────────

  async enableBedtime(accountId: string, ruleId: string) {
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, null, null], null, null, null, [null, [[ruleId, 2]]]],
      null,
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: 'PUT',
      body: payload,
      params: [['$httpMethod', 'PUT']],
    })
  }

  async disableBedtime(accountId: string, ruleId: string) {
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, null, null], null, null, null, [null, [[ruleId, 1]]]],
      null,
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: 'PUT',
      body: payload,
      params: [['$httpMethod', 'PUT']],
    })
  }

  async setBedtime(accountId: string, startHour: number, startMin: number, endHour: number, endMin: number, day: number) {
    const dayCode = DAY_CODES[day]
    if (!dayCode) throw new Error(`Invalid day: ${day}. Must be 1-7 (Monday-Sunday)`)
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, 9, null, null, null, null, null, null, null, null, null, [2, [startHour, startMin], [endHour, endMin], dayCode]]],
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimitOverrides:batchCreate`, {
      method: 'POST',
      body: payload,
    })
  }

  // ─── School time ────────────────────────────────────────────────────────────

  async enableSchoolTime(accountId: string, ruleId: string) {
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, null, null], null, null, null, [null, [[ruleId, 2]]]],
      null,
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: 'PUT',
      body: payload,
      params: [['$httpMethod', 'PUT']],
    })
  }

  async disableSchoolTime(accountId: string, ruleId: string) {
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, null, null], null, null, null, [null, [[ruleId, 1]]]],
      null,
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: 'PUT',
      body: payload,
      params: [['$httpMethod', 'PUT']],
    })
  }

  // ─── Daily limit ────────────────────────────────────────────────────────────

  async enableDailyLimit(accountId: string) {
    const payload = JSON.stringify([
      null,
      accountId,
      [null, [[2, null, null, null]]],
      null,
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: 'PUT',
      body: payload,
      params: [['$httpMethod', 'PUT']],
    })
  }

  async disableDailyLimit(accountId: string) {
    const payload = JSON.stringify([
      null,
      accountId,
      [null, [[1, null, null, null]]],
      null,
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: 'PUT',
      body: payload,
      params: [['$httpMethod', 'PUT']],
    })
  }

  async setDailyLimit(accountId: string, deviceId: string, dailyMinutes: number) {
    const day = new Date().getDay() // 0=Sun, 1=Mon...
    const isoDay = day === 0 ? 7 : day // convert to ISO 1=Mon, 7=Sun
    const dayCode = DAY_CODES[isoDay]
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, 8, deviceId, null, null, null, null, null, null, null, [2, dailyMinutes, dayCode]]],
      [1],
    ])
    return this.request(`${BASE_URL}/people/${accountId}/timeLimitOverrides:batchCreate`, {
      method: 'POST',
      body: payload,
    })
  }
}
