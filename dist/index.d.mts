interface Cookie {
    name: string;
    value: string;
    domain?: string;
    expirationDate?: number;
    hostOnly?: boolean;
    httpOnly?: boolean;
    path?: string;
    sameSite?: string | null;
    secure?: boolean;
    session?: boolean;
    storeId?: string | null;
}
interface Credentials {
    cookies: Cookie[];
}
interface FamilyMember {
    userId: string;
    profile: {
        displayName: string;
        email?: string;
        photoUrl?: string;
    };
    isSupervisedMember: boolean;
}
interface FamilyMembersResponse {
    members: Array<{
        userId: string;
        profile: {
            displayName: string;
            email?: string;
            photoUrl?: string;
        };
        memberSupervisionInfo?: {
            isSupervisedMember?: boolean;
        };
    }>;
}
interface DeviceInfo {
    deviceId: string;
    name: string;
    model?: string;
    lastActivity?: string;
}
interface DailyScreenTime {
    totalSeconds: number;
    formatted: string;
    hours: number;
    minutes: number;
    seconds: number;
    appBreakdown: Record<string, number>;
}
interface AppUsageSession {
    date: {
        year: number;
        month: number;
        day: number;
    };
    usage: string;
    appId: {
        androidAppPackageName?: string;
    };
}
interface DeviceTimeLimitInfo {
    totalAllowedMinutes: number;
    usedMinutes: number;
    remainingMinutes: number;
    dailyLimitEnabled: boolean;
    dailyLimitMinutes: number;
    dailyLimitRemaining?: number;
    bedtimeWindow: TimeWindow | null;
    schooltimeWindow: TimeWindow | null;
    bedtimeActive: boolean;
    schooltimeActive: boolean;
    bonusMinutes: number;
    bonusOverrideId: string | null;
}
interface TimeWindow {
    startMs: number;
    endMs: number;
}
interface AppliedTimeLimitsResult {
    deviceLockStates: Record<string, boolean>;
    devices: Record<string, DeviceTimeLimitInfo>;
}
interface BedtimeScheduleEntry {
    day: number;
    start: [number, number];
    end: [number, number];
}
interface TimeLimitRules {
    bedtimeEnabled: boolean;
    schoolTimeEnabled: boolean;
    bedtimeSchedule: BedtimeScheduleEntry[];
    schoolTimeSchedule: BedtimeScheduleEntry[];
    bedtimeRuleId: string | null;
    schooltimeRuleId: string | null;
}

declare class Authenticator {
    private _cookies;
    private _cookieDict;
    private _cookieHeader;
    private _sapisidhash;
    private _sapisidhashCreatedAt;
    private _authUser;
    get isAuthenticated(): boolean;
    get authUser(): number;
    setCookies(cookies: Cookie[]): void;
    setAuthUser(index: number): void;
    static fromCookies(cookies: Cookie[], authUser?: number): Authenticator;
    getHeaders(): Record<string, string>;
    refreshHeaders(): void;
    private _domainPriority;
    private _getCookiesDict;
    getCookieHeader(): string;
    private _getSapisid;
    private _generateSapisidhash;
    getSapisidhash(): string;
}

declare class FamilyLink {
    private _api;
    private _auth;
    constructor(auth: Authenticator);
    /**
     * Create from cookies.
     *
     * @param cookies - Google cookies (exported via Cookie-Editor)
     * @param authUser - Account index when multiple Google accounts are logged in (default: 0)
     */
    static fromCookies(cookies: Cookie[], authUser?: number): FamilyLink;
    /** Current account index. */
    get authUser(): number;
    /** Switch to a different Google account (when multiple are logged in). */
    set authUser(index: number);
    getChildren(): Promise<FamilyMember[]>;
    getDevices(accountId: string): Promise<DeviceInfo[]>;
    getDailyScreenTime(accountId: string, date?: Date): Promise<DailyScreenTime>;
    lockDevice(accountId: string, deviceId: string): Promise<boolean>;
    unlockDevice(accountId: string, deviceId: string): Promise<boolean>;
    getAppliedTimeLimits(accountId: string): Promise<AppliedTimeLimitsResult>;
    addTimeBonus(accountId: string, deviceId: string, minutes: number): Promise<boolean>;
    cancelTimeBonus(accountId: string, overrideId: string): Promise<boolean>;
    enableBedtime(accountId: string, ruleId?: string): Promise<boolean>;
    disableBedtime(accountId: string, ruleId?: string): Promise<boolean>;
    /**
     * Set bedtime schedule for a specific day.
     *
     * @param accountId - Child's user ID
     * @param startTime - Start time in "HH:MM" format (e.g. "20:45")
     * @param endTime - End time in "HH:MM" format (e.g. "07:30")
     * @param day - Day of week, 1=Monday, 7=Sunday (defaults to today)
     */
    setBedtime(accountId: string, startTime: string, endTime: string, day?: number): Promise<boolean>;
    enableSchoolTime(accountId: string, ruleId?: string): Promise<boolean>;
    disableSchoolTime(accountId: string, ruleId?: string): Promise<boolean>;
    enableDailyLimit(accountId: string): Promise<boolean>;
    disableDailyLimit(accountId: string): Promise<boolean>;
    /**
     * Set daily screen time limit for a device.
     *
     * @param accountId - Child's user ID
     * @param deviceId - Device ID
     * @param minutes - Allowed minutes per day (e.g. 120 for 2h)
     */
    setDailyLimit(accountId: string, deviceId: string, minutes: number): Promise<boolean>;
    getTimeLimitRules(accountId: string): Promise<TimeLimitRules>;
    private _getBedtimeRuleId;
    private _getSchoolTimeRuleId;
}

interface ApiResponse<T = unknown> {
    status: number;
    json: T;
    headers: Headers;
}
declare class FamilyLinkAPI {
    private readonly auth;
    constructor(auth: Authenticator);
    private request;
    getFamilyMembers(): Promise<ApiResponse<unknown>>;
    getAppsAndUsage(accountId: string): Promise<ApiResponse<unknown>>;
    getAppliedTimeLimits(accountId: string): Promise<ApiResponse<unknown>>;
    getTimeLimit(accountId: string): Promise<ApiResponse<unknown>>;
    controlDevice(accountId: string, deviceId: string, action: 'lock' | 'unlock'): Promise<ApiResponse<unknown>>;
    addTimeBonus(accountId: string, deviceId: string, bonusMinutes: number): Promise<ApiResponse<unknown>>;
    cancelTimeBonus(accountId: string, overrideId: string): Promise<ApiResponse<unknown>>;
    enableBedtime(accountId: string, ruleId: string): Promise<ApiResponse<unknown>>;
    disableBedtime(accountId: string, ruleId: string): Promise<ApiResponse<unknown>>;
    setBedtime(accountId: string, startHour: number, startMin: number, endHour: number, endMin: number, day: number): Promise<ApiResponse<unknown>>;
    enableSchoolTime(accountId: string, ruleId: string): Promise<ApiResponse<unknown>>;
    disableSchoolTime(accountId: string, ruleId: string): Promise<ApiResponse<unknown>>;
    enableDailyLimit(accountId: string): Promise<ApiResponse<unknown>>;
    disableDailyLimit(accountId: string): Promise<ApiResponse<unknown>>;
    setDailyLimit(accountId: string, deviceId: string, dailyMinutes: number): Promise<ApiResponse<unknown>>;
}

declare class HttpError extends Error {
    readonly statusCode: number;
    readonly body: string;
    constructor(message: string, statusCode: number, body: string);
}
declare class AuthenticationError extends HttpError {
    constructor(message?: string);
}
declare class SessionExpiredError extends HttpError {
    constructor(message?: string);
}
declare class NetworkError extends HttpError {
    constructor(message?: string);
}
declare class DeviceControlError extends HttpError {
    constructor(message?: string);
}

export { type ApiResponse, type AppUsageSession, type AppliedTimeLimitsResult, AuthenticationError, Authenticator, type BedtimeScheduleEntry, type Cookie, type Credentials, type DailyScreenTime, DeviceControlError, type DeviceInfo, type DeviceTimeLimitInfo, FamilyLink, FamilyLinkAPI, type FamilyMember, type FamilyMembersResponse, HttpError, NetworkError, SessionExpiredError, type TimeLimitRules, type TimeWindow };
