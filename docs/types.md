# Types Reference

## `Cookie`

The cookie format exported by [Cookie-Editor](https://chromewebstore.google.com/detail/hlkenndednhfkekhgcdicdfddnkalmdm).

```ts
import type { Cookie } from 'g-family-link'

interface Cookie {
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
```

---

## `FamilyMember`

Returned by `fl.getChildren()`.

| Property | Type | Description |
|----------|------|-------------|
| `userId` | `string` | Unique user ID (use this in all other methods) |
| `profile.displayName` | `string` | Child's display name |
| `profile.email` | `string?` | Child's email (if available) |
| `profile.photoUrl` | `string?` | Profile photo URL |
| `isSupervisedMember` | `boolean` | Always `true` (filtered) |

---

## `DeviceInfo`

Returned by `fl.getDevices(accountId)`.

| Property | Type | Description |
|----------|------|-------------|
| `deviceId` | `string` | Device ID (use this in lock/unlock/bonus commands) |
| `name` | `string` | Display name (e.g. "Pixel 7") |
| `model` | `string?` | Device model |
| `lastActivity` | `string?` | Last activity timestamp (millis) |

---

## `DailyScreenTime`

Returned by `fl.getDailyScreenTime(accountId)`.

| Property | Type | Description |
|----------|------|-------------|
| `totalSeconds` | `number` | Total screen time in seconds |
| `formatted` | `string` | Formatted as `HH:MM:SS` |
| `hours` | `number` | Hours component |
| `minutes` | `number` | Minutes component |
| `seconds` | `number` | Seconds component |
| `appBreakdown` | `Record<string, number>` | Per-app usage in seconds (key = package name) |

---

## `AppliedTimeLimitsResult`

Returned by `fl.getAppliedTimeLimits(accountId)`.

| Property | Type | Description |
|----------|------|-------------|
| `deviceLockStates` | `Record<string, boolean>` | Device ID → locked status |
| `devices` | `Record<string, DeviceTimeLimitInfo>` | Device ID → time limit details |

---

## `DeviceTimeLimitInfo`

Per-device time limit state (nested in `AppliedTimeLimitsResult.devices`).

| Property | Type | Description |
|----------|------|-------------|
| `totalAllowedMinutes` | `number` | Total allowed today (considers bonus) |
| `usedMinutes` | `number` | Time used today |
| `remainingMinutes` | `number` | Time remaining today |
| `dailyLimitEnabled` | `boolean` | Whether daily limit is active |
| `dailyLimitMinutes` | `number` | Configured daily limit |
| `dailyLimitRemaining` | `number?` | Remaining without bonus (for "limit reached" detection) |
| `bedtimeWindow` | `TimeWindow \| null` | Active bedtime window |
| `schooltimeWindow` | `TimeWindow \| null` | Active school time window |
| `bedtimeActive` | `boolean` | Whether bedtime is currently active |
| `schooltimeActive` | `boolean` | Whether school time is currently active |
| `bonusMinutes` | `number` | Active bonus duration (0 if none) |
| `bonusOverrideId` | `string \| null` | Bonus override UUID (for cancellation) |

> **Note:** Bonus time **replaces** the daily limit — it does not add to it.

---

## `TimeWindow`

| Property | Type | Description |
|----------|------|-------------|
| `startMs` | `number` | Window start (epoch ms) |
| `endMs` | `number` | Window end (epoch ms) |

---

## `TimeLimitRules`

Returned by `fl.getTimeLimitRules(accountId)`.

| Property | Type | Description |
|----------|------|-------------|
| `bedtimeEnabled` | `boolean` | Whether bedtime is enabled |
| `schoolTimeEnabled` | `boolean` | Whether school time is enabled |
| `bedtimeSchedule` | `BedtimeScheduleEntry[]` | Bedtime windows per day |
| `schoolTimeSchedule` | `BedtimeScheduleEntry[]` | School time windows per day |
| `bedtimeRuleId` | `string \| null` | UUID for enable/disable calls |
| `schooltimeRuleId` | `string \| null` | UUID for enable/disable calls |

---

## `BedtimeScheduleEntry`

| Property | Type | Description |
|----------|------|-------------|
| `day` | `number` | Day of week (1=Monday, 7=Sunday) |
| `start` | `[number, number]` | Start time `[hour, minute]` |
| `end` | `[number, number]` | End time `[hour, minute]` |

---

## Errors

| Class | Status | Description |
|-------|--------|-------------|
| `HttpError` | any | Base HTTP error with `.statusCode` and `.body` |
| `AuthenticationError` | 401 | Missing credentials or SAPISID cookie |
| `SessionExpiredError` | 401 | Session expired — re-export cookies |
| `NetworkError` | 0 | Network connectivity error |
| `DeviceControlError` | 400 | Invalid device control action |

```ts
import { SessionExpiredError, AuthenticationError } from 'g-family-link'

try {
  const children = await fl.getChildren()
} catch (err) {
  if (err instanceof SessionExpiredError) {
    // cookies expired — re-export from Cookie-Editor
  }
  if (err instanceof AuthenticationError) {
    // SAPISID cookie missing — check the export
  }
}
```
