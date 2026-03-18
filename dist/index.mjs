// src/const.ts
var BASE_URL = "https://kidsmanagement-pa.clients6.google.com/kidsmanagement/v1";
var ORIGIN = "https://familylink.google.com";
var API_KEY = "AIzaSyAQb1gupaJhY3CXQy2xmTwJMcjmot3M2hw";
var SESSION_MAX_AGE = 1800;
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var DAY_CODES = {
  1: "CAEQAQ",
  // Monday
  2: "CAEQAg",
  // Tuesday
  3: "CAEQAw",
  // Wednesday
  4: "CAEQBA",
  // Thursday
  5: "CAEQBQ",
  // Friday
  6: "CAEQBg",
  // Saturday
  7: "CAEQBw"
  // Sunday
};
var DEVICE_LOCK_CODE = 1;
var DEVICE_UNLOCK_CODE = 4;

// src/errors.ts
var HttpError = class extends Error {
  constructor(message, statusCode, body) {
    super(message);
    this.statusCode = statusCode;
    this.body = body;
    this.name = "HttpError";
  }
};
var AuthenticationError = class extends HttpError {
  constructor(message = "Authentication failed") {
    super(message, 401, "");
    this.name = "AuthenticationError";
  }
};
var SessionExpiredError = class extends HttpError {
  constructor(message = "Session expired, please re-authenticate") {
    super(message, 401, "");
    this.name = "SessionExpiredError";
  }
};
var NetworkError = class extends HttpError {
  constructor(message = "Network error") {
    super(message, 0, "");
    this.name = "NetworkError";
  }
};
var DeviceControlError = class extends HttpError {
  constructor(message = "Device control failed") {
    super(message, 400, "");
    this.name = "DeviceControlError";
  }
};

// src/api.ts
var FamilyLinkAPI = class {
  constructor(auth) {
    this.auth = auth;
  }
  async request(url, options = {}) {
    const method = options.method ?? "GET";
    const headers = {
      ...this.auth.getHeaders(),
      ...options.headers
    };
    let fullUrl = url;
    if (options.params?.length) {
      const search = new URLSearchParams(options.params);
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + search.toString();
    }
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: options.body != null ? typeof options.body === "string" ? options.body : JSON.stringify(options.body) : void 0
    });
    if (response.status >= 200 && response.status < 300) {
      let json = void 0;
      try {
        json = await response.json();
      } catch {
      }
      return { status: response.status, json, headers: response.headers };
    }
    const text = await response.text();
    if (response.status === 401) throw new SessionExpiredError();
    throw new HttpError(`HTTP ${response.status}`, response.status, text);
  }
  // ─── Family members ─────────────────────────────────────────────────────────
  async getFamilyMembers() {
    return this.request(`${BASE_URL}/families/mine/members`, {
      headers: { "Content-Type": "application/json" }
    });
  }
  // ─── Apps & usage ───────────────────────────────────────────────────────────
  async getAppsAndUsage(accountId) {
    return this.request(`${BASE_URL}/people/${accountId}/appsandusage`, {
      headers: { "Content-Type": "application/json" },
      params: [
        ["capabilities", "CAPABILITY_APP_USAGE_SESSION"],
        ["capabilities", "CAPABILITY_SUPERVISION_CAPABILITIES"]
      ]
    });
  }
  // ─── Applied time limits ────────────────────────────────────────────────────
  async getAppliedTimeLimits(accountId) {
    return this.request(`${BASE_URL}/people/${accountId}/appliedTimeLimits`, {
      params: [["capabilities", "TIME_LIMIT_CLIENT_CAPABILITY_SCHOOLTIME"]]
    });
  }
  // ─── Time limit rules ──────────────────────────────────────────────────────
  async getTimeLimit(accountId) {
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit`, {
      params: [
        ["capabilities", "TIME_LIMIT_CLIENT_CAPABILITY_SCHOOLTIME"],
        ["timeLimitKey.type", "SUPERVISED_DEVICES"]
      ]
    });
  }
  // ─── Device lock/unlock ─────────────────────────────────────────────────────
  async controlDevice(accountId, deviceId, action) {
    const actionCode = action === "lock" ? DEVICE_LOCK_CODE : DEVICE_UNLOCK_CODE;
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, actionCode, deviceId]],
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimitOverrides:batchCreate`, {
      method: "POST",
      body: payload
    });
  }
  // ─── Time bonus ─────────────────────────────────────────────────────────────
  async addTimeBonus(accountId, deviceId, bonusMinutes) {
    const bonusSeconds = bonusMinutes * 60;
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, 10, deviceId, null, null, null, null, null, null, null, null, null, [[String(bonusSeconds), 0]]]],
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimitOverrides:batchCreate`, {
      method: "POST",
      body: payload
    });
  }
  async cancelTimeBonus(accountId, overrideId) {
    return this.request(
      `${BASE_URL}/people/${accountId}/timeLimitOverride/${overrideId}?$httpMethod=DELETE`,
      { method: "POST" }
    );
  }
  // ─── Bedtime ────────────────────────────────────────────────────────────────
  async enableBedtime(accountId, ruleId) {
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, null, null], null, null, null, [null, [[ruleId, 2]]]],
      null,
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: "PUT",
      body: payload,
      params: [["$httpMethod", "PUT"]]
    });
  }
  async disableBedtime(accountId, ruleId) {
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, null, null], null, null, null, [null, [[ruleId, 1]]]],
      null,
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: "PUT",
      body: payload,
      params: [["$httpMethod", "PUT"]]
    });
  }
  async setBedtime(accountId, startHour, startMin, endHour, endMin, day) {
    const dayCode = DAY_CODES[day];
    if (!dayCode) throw new Error(`Invalid day: ${day}. Must be 1-7 (Monday-Sunday)`);
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, 9, null, null, null, null, null, null, null, null, null, [2, [startHour, startMin], [endHour, endMin], dayCode]]],
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimitOverrides:batchCreate`, {
      method: "POST",
      body: payload
    });
  }
  // ─── School time ────────────────────────────────────────────────────────────
  async enableSchoolTime(accountId, ruleId) {
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, null, null], null, null, null, [null, [[ruleId, 2]]]],
      null,
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: "PUT",
      body: payload,
      params: [["$httpMethod", "PUT"]]
    });
  }
  async disableSchoolTime(accountId, ruleId) {
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, null, null], null, null, null, [null, [[ruleId, 1]]]],
      null,
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: "PUT",
      body: payload,
      params: [["$httpMethod", "PUT"]]
    });
  }
  // ─── Daily limit ────────────────────────────────────────────────────────────
  async enableDailyLimit(accountId) {
    const payload = JSON.stringify([
      null,
      accountId,
      [null, [[2, null, null, null]]],
      null,
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: "PUT",
      body: payload,
      params: [["$httpMethod", "PUT"]]
    });
  }
  async disableDailyLimit(accountId) {
    const payload = JSON.stringify([
      null,
      accountId,
      [null, [[1, null, null, null]]],
      null,
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimit:update`, {
      method: "PUT",
      body: payload,
      params: [["$httpMethod", "PUT"]]
    });
  }
  async setDailyLimit(accountId, deviceId, dailyMinutes) {
    const day = (/* @__PURE__ */ new Date()).getDay();
    const isoDay = day === 0 ? 7 : day;
    const dayCode = DAY_CODES[isoDay];
    const payload = JSON.stringify([
      null,
      accountId,
      [[null, null, 8, deviceId, null, null, null, null, null, null, null, [2, dailyMinutes, dayCode]]],
      [1]
    ]);
    return this.request(`${BASE_URL}/people/${accountId}/timeLimitOverrides:batchCreate`, {
      method: "POST",
      body: payload
    });
  }
};

// src/authenticator.ts
import { createHash } from "crypto";
var Authenticator = class _Authenticator {
  _cookies = [];
  _cookieDict = null;
  _cookieHeader = null;
  _sapisidhash = null;
  _sapisidhashCreatedAt = 0;
  _authUser = 0;
  get isAuthenticated() {
    return this._cookies.length > 0;
  }
  get authUser() {
    return this._authUser;
  }
  setCookies(cookies) {
    this._cookies = cookies;
    this._cookieDict = null;
    this._cookieHeader = null;
    this._sapisidhash = null;
    this._sapisidhashCreatedAt = 0;
  }
  setAuthUser(index) {
    this._authUser = index;
  }
  static fromCookies(cookies, authUser = 0) {
    const auth = new _Authenticator();
    auth.setCookies(cookies);
    auth._authUser = authUser;
    return auth;
  }
  getHeaders() {
    if (!this.isAuthenticated) {
      throw new AuthenticationError("Not authenticated");
    }
    return {
      "User-Agent": USER_AGENT,
      "Origin": ORIGIN,
      "Content-Type": "application/json+protobuf",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-AuthUser": String(this._authUser),
      "Authorization": `SAPISIDHASH ${this.getSapisidhash()}`,
      "Cookie": this.getCookieHeader()
    };
  }
  refreshHeaders() {
    this._sapisidhash = null;
    this._sapisidhashCreatedAt = 0;
  }
  _domainPriority(domain) {
    const d = domain.toLowerCase().replace(/^\./, "");
    if (d === "google.com") return 0;
    if (d.startsWith("google.com.") || d.startsWith("google.co.")) return 2;
    return 1;
  }
  _getCookiesDict() {
    if (this._cookieDict) return this._cookieDict;
    const dict = {};
    const domains = {};
    for (const cookie of this._cookies) {
      const name = cookie.name;
      const value = cookie.value.replace(/^"|"$/g, "");
      const domain = cookie.domain ?? "";
      if (!name || !value) continue;
      if (name in dict) {
        const existing = domains[name] ?? "";
        if (this._domainPriority(domain) < this._domainPriority(existing)) {
          dict[name] = value;
          domains[name] = domain;
        }
      } else {
        dict[name] = value;
        domains[name] = domain;
      }
    }
    this._cookieDict = dict;
    return dict;
  }
  getCookieHeader() {
    if (this._cookieHeader) return this._cookieHeader;
    const dict = this._getCookiesDict();
    this._cookieHeader = Object.entries(dict).map(([k, v]) => `${k}=${v}`).join("; ");
    return this._cookieHeader;
  }
  _getSapisid() {
    const dict = this._getCookiesDict();
    const sapisid = dict["SAPISID"];
    if (!sapisid) throw new AuthenticationError("SAPISID cookie not found in authentication data");
    return sapisid;
  }
  _generateSapisidhash() {
    const sapisid = this._getSapisid();
    const timestamp = Math.floor(Date.now() / 1e3);
    const toHash = `${timestamp} ${sapisid} ${ORIGIN}`;
    const hash = createHash("sha1").update(toHash).digest("hex");
    return `${timestamp}_${hash}`;
  }
  getSapisidhash() {
    const now = Date.now() / 1e3;
    if (!this._sapisidhash || now - this._sapisidhashCreatedAt > SESSION_MAX_AGE) {
      this._sapisidhash = this._generateSapisidhash();
      this._sapisidhashCreatedAt = now;
    }
    return this._sapisidhash;
  }
};

// src/family-link.ts
var FamilyLink = class _FamilyLink {
  _api;
  _auth;
  constructor(auth) {
    this._auth = auth;
    this._api = new FamilyLinkAPI(auth);
  }
  /**
   * Create from cookies.
   *
   * @param cookies - Google cookies (exported via Cookie-Editor)
   * @param authUser - Account index when multiple Google accounts are logged in (default: 0)
   */
  static fromCookies(cookies, authUser = 0) {
    const auth = Authenticator.fromCookies(cookies, authUser);
    return new _FamilyLink(auth);
  }
  /** Current account index. */
  get authUser() {
    return this._auth.authUser;
  }
  /** Switch to a different Google account (when multiple are logged in). */
  set authUser(index) {
    this._auth.setAuthUser(index);
  }
  // ---------------------------------------------------------------------------
  // Family members
  // ---------------------------------------------------------------------------
  async getChildren() {
    let res;
    try {
      res = await this._api.getFamilyMembers();
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return [];
      }
      throw err;
    }
    const data = res.json;
    return (data.members ?? []).filter((m) => m.memberSupervisionInfo?.isSupervisedMember).map((m) => ({
      userId: m.userId,
      profile: {
        displayName: m.profile.displayName,
        email: m.profile.email,
        photoUrl: m.profile.photoUrl
      },
      isSupervisedMember: true
    }));
  }
  // ---------------------------------------------------------------------------
  // Devices
  // ---------------------------------------------------------------------------
  async getDevices(accountId) {
    const data = (await this._api.getAppsAndUsage(accountId)).json;
    const deviceInfos = data.deviceInfo ?? [];
    return deviceInfos.map((d) => {
      const display = d.displayInfo ?? {};
      return {
        deviceId: d.deviceId,
        name: display.friendlyName ?? "Unknown Device",
        model: display.model,
        lastActivity: display.lastActivityTimeMillis
      };
    });
  }
  // ---------------------------------------------------------------------------
  // Screen time usage
  // ---------------------------------------------------------------------------
  async getDailyScreenTime(accountId, date) {
    const target = date ?? /* @__PURE__ */ new Date();
    const data = (await this._api.getAppsAndUsage(accountId)).json;
    const sessions = data.appUsageSessions ?? [];
    let totalSeconds = 0;
    const appBreakdown = {};
    for (const session of sessions) {
      const sd = session.date;
      if (sd?.year === target.getFullYear() && sd?.month === target.getMonth() + 1 && sd?.day === target.getDate()) {
        const usage = parseFloat((session.usage ?? "0s").replace("s", ""));
        if (!isNaN(usage)) {
          totalSeconds += usage;
          const pkg = session.appId?.androidAppPackageName ?? "unknown";
          appBreakdown[pkg] = (appBreakdown[pkg] ?? 0) + usage;
        }
      }
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const pad = (n) => String(n).padStart(2, "0");
    return {
      totalSeconds,
      formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      hours,
      minutes,
      seconds,
      appBreakdown
    };
  }
  // ---------------------------------------------------------------------------
  // Device lock / unlock
  // ---------------------------------------------------------------------------
  async lockDevice(accountId, deviceId) {
    const res = await this._api.controlDevice(accountId, deviceId, "lock");
    return res.status === 200;
  }
  async unlockDevice(accountId, deviceId) {
    const res = await this._api.controlDevice(accountId, deviceId, "unlock");
    return res.status === 200;
  }
  // ---------------------------------------------------------------------------
  // Applied time limits (current state)
  // ---------------------------------------------------------------------------
  async getAppliedTimeLimits(accountId) {
    const res = await this._api.getAppliedTimeLimits(accountId);
    const data = res.json;
    return parseAppliedTimeLimits(data);
  }
  // ---------------------------------------------------------------------------
  // Time bonus
  // ---------------------------------------------------------------------------
  async addTimeBonus(accountId, deviceId, minutes) {
    const res = await this._api.addTimeBonus(accountId, deviceId, minutes);
    return res.status === 200;
  }
  async cancelTimeBonus(accountId, overrideId) {
    const res = await this._api.cancelTimeBonus(accountId, overrideId);
    return res.status === 200;
  }
  // ---------------------------------------------------------------------------
  // Bedtime
  // ---------------------------------------------------------------------------
  async enableBedtime(accountId, ruleId) {
    const id = ruleId ?? await this._getBedtimeRuleId(accountId);
    if (!id) throw new Error("Could not find bedtime rule ID");
    const res = await this._api.enableBedtime(accountId, id);
    return res.status === 200;
  }
  async disableBedtime(accountId, ruleId) {
    const id = ruleId ?? await this._getBedtimeRuleId(accountId);
    if (!id) throw new Error("Could not find bedtime rule ID");
    const res = await this._api.disableBedtime(accountId, id);
    return res.status === 200;
  }
  /**
   * Set bedtime schedule for a specific day.
   *
   * @param accountId - Child's user ID
   * @param startTime - Start time in "HH:MM" format (e.g. "20:45")
   * @param endTime - End time in "HH:MM" format (e.g. "07:30")
   * @param day - Day of week, 1=Monday, 7=Sunday (defaults to today)
   */
  async setBedtime(accountId, startTime, endTime, day) {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const d = day ?? isoWeekday();
    const res = await this._api.setBedtime(accountId, sh, sm, eh, em, d);
    return res.status === 200;
  }
  // ---------------------------------------------------------------------------
  // School time
  // ---------------------------------------------------------------------------
  async enableSchoolTime(accountId, ruleId) {
    const id = ruleId ?? await this._getSchoolTimeRuleId(accountId);
    if (!id) throw new Error("Could not find school time rule ID");
    const res = await this._api.enableSchoolTime(accountId, id);
    return res.status === 200;
  }
  async disableSchoolTime(accountId, ruleId) {
    const id = ruleId ?? await this._getSchoolTimeRuleId(accountId);
    if (!id) throw new Error("Could not find school time rule ID");
    const res = await this._api.disableSchoolTime(accountId, id);
    return res.status === 200;
  }
  // ---------------------------------------------------------------------------
  // Daily limit
  // ---------------------------------------------------------------------------
  async enableDailyLimit(accountId) {
    const res = await this._api.enableDailyLimit(accountId);
    return res.status === 200;
  }
  async disableDailyLimit(accountId) {
    const res = await this._api.disableDailyLimit(accountId);
    return res.status === 200;
  }
  /**
   * Set daily screen time limit for a device.
   *
   * @param accountId - Child's user ID
   * @param deviceId - Device ID
   * @param minutes - Allowed minutes per day (e.g. 120 for 2h)
   */
  async setDailyLimit(accountId, deviceId, minutes) {
    const res = await this._api.setDailyLimit(accountId, deviceId, minutes);
    return res.status === 200;
  }
  // ---------------------------------------------------------------------------
  // Time limit rules (schedules)
  // ---------------------------------------------------------------------------
  async getTimeLimitRules(accountId) {
    const res = await this._api.getTimeLimit(accountId);
    const data = res.json;
    return parseTimeLimitRules(data);
  }
  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------
  async _getBedtimeRuleId(accountId) {
    const rules = await this.getTimeLimitRules(accountId);
    return rules.bedtimeRuleId;
  }
  async _getSchoolTimeRuleId(accountId) {
    const rules = await this.getTimeLimitRules(accountId);
    return rules.schooltimeRuleId;
  }
};
function isoWeekday() {
  const day = (/* @__PURE__ */ new Date()).getDay();
  return day === 0 ? 7 : day;
}
function parseAppliedTimeLimits(data) {
  const deviceLockStates = {};
  const devices = {};
  if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
    return { deviceLockStates, devices };
  }
  const currentDay = isoWeekday();
  for (const deviceData of data[1]) {
    if (!Array.isArray(deviceData) || deviceData.length < 25) continue;
    let deviceId = null;
    const first = deviceData[0];
    if (Array.isArray(first) && first.length > 3) {
      deviceId = first[3];
    } else if (deviceData.length > 25 && deviceData[25]) {
      deviceId = deviceData[25];
    }
    if (!deviceId) continue;
    let isLocked = false;
    if (Array.isArray(first) && first.length > 2) {
      isLocked = first[2] === 1;
    }
    deviceLockStates[deviceId] = isLocked;
    const info = {
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
      bonusOverrideId: null
    };
    if (Array.isArray(first) && first.length > 13) {
      const overrideType = first[2];
      if (overrideType === 10) {
        info.bonusOverrideId = first[0];
        const bonusMeta = first[13];
        if (Array.isArray(bonusMeta) && Array.isArray(bonusMeta[0]) && bonusMeta[0].length > 0) {
          const bonusSecondsStr = bonusMeta[0][0];
          if (typeof bonusSecondsStr === "string" && /^\d+$/.test(bonusSecondsStr)) {
            info.bonusMinutes = Math.floor(parseInt(bonusSecondsStr) / 60);
          }
        }
      }
    }
    if (deviceData.length > 20) {
      const usedStr = deviceData[20];
      if (typeof usedStr === "string" && /^\d+$/.test(usedStr)) {
        info.usedMinutes = Math.floor(parseInt(usedStr) / 6e4);
      }
    }
    for (let idx = 0; idx < deviceData.length; idx++) {
      const item = deviceData[idx];
      if (!Array.isArray(item) || item.length < 4) continue;
      if (typeof item[0] !== "string") continue;
      const firstElem = item[0];
      const isCaeq = firstElem.startsWith("CAEQ");
      const isCamq = firstElem.startsWith("CAMQ");
      const isUuid = firstElem.length === 36 && (firstElem.match(/-/g) ?? []).length === 4;
      if (!isCaeq && !isCamq && !isUuid) continue;
      if (item.length === 6) {
        const day = item[1];
        const stateFlag = item[2];
        const minutes = item[3];
        if (typeof day === "number" && typeof stateFlag === "number" && typeof minutes === "number") {
          if (day === currentDay) {
            info.dailyLimitEnabled = idx < 10 && stateFlag === 2;
            info.dailyLimitMinutes = minutes;
          }
        }
      } else if (item.length === 8) {
        const day = item[1];
        const stateFlag = item[2];
        const startTime = item[3];
        const endTime = item[4];
        const isBedtime = isCaeq || isUuid && !info.bedtimeWindow;
        const isSchooltime = isCamq || isUuid && !isBedtime;
        if (typeof day === "number" && day === currentDay && typeof stateFlag === "number" && stateFlag === 2 && Array.isArray(startTime) && startTime.length === 2 && Array.isArray(endTime) && endTime.length === 2) {
          const now = /* @__PURE__ */ new Date();
          const startDt = new Date(now);
          startDt.setHours(startTime[0], startTime[1], 0, 0);
          const endDt = new Date(now);
          endDt.setHours(endTime[0], endTime[1], 0, 0);
          let windowActive;
          if (endTime[0] < startTime[0] || endTime[0] === startTime[0] && endTime[1] < startTime[1]) {
            windowActive = now >= startDt || now < endDt;
          } else {
            windowActive = now >= startDt && now < endDt;
          }
          const windowData = {
            startMs: startDt.getTime(),
            endMs: endDt.getTime()
          };
          if (isBedtime) {
            info.bedtimeWindow = windowData;
            info.bedtimeActive = windowActive;
          } else if (isSchooltime) {
            info.schooltimeWindow = windowData;
            info.schooltimeActive = windowActive;
          }
        }
      }
    }
    if (info.dailyLimitEnabled && info.dailyLimitMinutes > 0) {
      info.dailyLimitRemaining = Math.max(0, info.dailyLimitMinutes - info.usedMinutes);
      if (info.bonusMinutes > 0) {
        info.totalAllowedMinutes = info.bonusMinutes;
        info.remainingMinutes = info.bonusMinutes;
      } else {
        info.totalAllowedMinutes = info.dailyLimitMinutes;
        info.remainingMinutes = Math.max(0, info.dailyLimitMinutes - info.usedMinutes);
      }
    }
    devices[deviceId] = info;
  }
  return { deviceLockStates, devices };
}
function parseTimeLimitRules(data) {
  const result = {
    bedtimeEnabled: false,
    schoolTimeEnabled: false,
    bedtimeSchedule: [],
    schoolTimeSchedule: [],
    bedtimeRuleId: null,
    schooltimeRuleId: null
  };
  if (!Array.isArray(data) || data.length < 2) return result;
  const inner = data[1];
  if (!Array.isArray(inner)) return result;
  if (Array.isArray(inner[0])) {
    const bedtimeConfig = inner[0];
    if (Array.isArray(bedtimeConfig[0])) {
      const scheduleData = bedtimeConfig[0];
      if (Array.isArray(scheduleData[1])) {
        for (const scheduleList of scheduleData[1]) {
          if (!Array.isArray(scheduleList)) continue;
          for (const item of scheduleList) {
            if (Array.isArray(item) && item.length >= 4 && typeof item[0] === "string" && item[0].startsWith("CAEQ")) {
              const entry = {
                day: item[1],
                start: item[2],
                end: item[3]
              };
              result.bedtimeSchedule.push(entry);
            }
          }
        }
      }
    }
  }
  if (Array.isArray(inner[1])) {
    const dailyLimitConfig = inner[1];
    if (Array.isArray(dailyLimitConfig[0])) {
      const configData = dailyLimitConfig[0];
      if (configData.length > 2 && Array.isArray(configData[2])) {
        for (const item of configData[2]) {
          if (Array.isArray(item) && item.length >= 4 && typeof item[0] === "string" && item[0].startsWith("CAMQ")) {
            const entry = {
              day: item[1],
              start: item[2],
              end: item[3]
            };
            result.schoolTimeSchedule.push(entry);
          }
        }
      }
    }
  }
  for (let idx = inner.length - 1; idx >= 0; idx--) {
    const element = inner[idx];
    if (!Array.isArray(element)) continue;
    const revisions = element.filter(
      (item) => Array.isArray(item) && item.length === 4 && Array.isArray(item[3]) && typeof item[0] === "string" && item[0].length > 30 && typeof item[1] === "number" && (item[1] === 1 || item[1] === 2) && typeof item[2] === "number" && (item[2] === 1 || item[2] === 2)
    );
    if (revisions.length > 0) {
      for (const rev of revisions) {
        const ruleId = rev[0];
        const typeFlag = rev[1];
        const stateFlag = rev[2];
        if (typeFlag === 1) {
          result.bedtimeEnabled = stateFlag === 2;
          result.bedtimeRuleId = ruleId;
        } else if (typeFlag === 2) {
          result.schoolTimeEnabled = stateFlag === 2;
          result.schooltimeRuleId = ruleId;
        }
      }
      break;
    }
  }
  return result;
}
export {
  AuthenticationError,
  Authenticator,
  DeviceControlError,
  FamilyLink,
  FamilyLinkAPI,
  HttpError,
  NetworkError,
  SessionExpiredError
};
