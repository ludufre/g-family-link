# Library API

## `FamilyLink`

Main entry point. Load cookies, then call methods directly.

```ts
import { FamilyLink } from 'g-family-link'
import { readFileSync } from 'fs'

const cookies = JSON.parse(readFileSync('cookies.json', 'utf-8'))
const fl = FamilyLink.fromCookies(cookies)
```

### Factory method

| Method | Description |
|--------|-------------|
| `FamilyLink.fromCookies(cookies, authUser?)` | Create from cookies with optional account index |

### `authUser` parameter

When multiple Google accounts are logged in, the cookies give access to all of them. Use `authUser` to select which account has Family Link:

```ts
const fl = FamilyLink.fromCookies(cookies, 0)  // first account (default)
const fl = FamilyLink.fromCookies(cookies, 3)  // fourth account
```

---

### Children

```ts
const children = await fl.getChildren()  // FamilyMember[]
// [{ userId: '...', profile: { displayName: 'Pedro' }, isSupervisedMember: true }]

const childId = children[0].userId
```

Returns `[]` if the account has no Family Link access (wrong `authUser`).

### Devices

```ts
const devices = await fl.getDevices(childId)  // DeviceInfo[]
// [{ deviceId: '...', name: 'Pixel 7', model: 'Pixel 7' }]
```

### Screen time

```ts
const st = await fl.getDailyScreenTime(childId)  // DailyScreenTime

// { totalSeconds: 3600, formatted: '01:00:00', hours: 1, minutes: 0, seconds: 0,
//   appBreakdown: { 'com.youtube.android': 2400, 'com.instagram.android': 1200 } }

// Specific date
const st = await fl.getDailyScreenTime(childId, new Date('2025-01-15'))
```

### Lock / Unlock device

```ts
await fl.lockDevice(childId, deviceId)    // true if successful
await fl.unlockDevice(childId, deviceId)  // true if successful
```

### Applied time limits

Get the current state of all time restrictions for a child's devices.

```ts
const limits = await fl.getAppliedTimeLimits(childId)  // AppliedTimeLimitsResult

// Lock states
limits.deviceLockStates['device-id']  // true = locked

// Per-device info
const dev = limits.devices['device-id']
dev.usedMinutes          // 45
dev.remainingMinutes     // 75
dev.dailyLimitEnabled    // true
dev.dailyLimitMinutes    // 120
dev.bonusMinutes         // 30 (0 if no bonus)
dev.bonusOverrideId      // 'uuid-...' (null if no bonus)
dev.bedtimeActive        // false
dev.schooltimeActive     // false
```

### Time bonus

```ts
// Add 30 minutes bonus
await fl.addTimeBonus(childId, deviceId, 30)

// Cancel active bonus (use overrideId from getAppliedTimeLimits)
await fl.cancelTimeBonus(childId, overrideId)
```

### Bedtime

```ts
await fl.enableBedtime(childId)
await fl.disableBedtime(childId)

// Set schedule: 20:45 to 07:30, for Monday (1=Mon, 7=Sun)
await fl.setBedtime(childId, '20:45', '07:30', 1)

// Omit day to use today
await fl.setBedtime(childId, '21:00', '07:00')

// Pass rule ID explicitly (otherwise auto-detected)
await fl.enableBedtime(childId, ruleId)
```

### School time

```ts
await fl.enableSchoolTime(childId)
await fl.disableSchoolTime(childId)
```

### Daily limit

```ts
await fl.enableDailyLimit(childId)
await fl.disableDailyLimit(childId)

// Set to 120 minutes for a specific device
await fl.setDailyLimit(childId, deviceId, 120)
```

### Time limit rules

Get configured schedules (bedtime windows, school time windows, and their ON/OFF state).

```ts
const rules = await fl.getTimeLimitRules(childId)  // TimeLimitRules

rules.bedtimeEnabled       // true
rules.schoolTimeEnabled    // false
rules.bedtimeRuleId        // 'uuid-...'
rules.schooltimeRuleId     // 'uuid-...'

rules.bedtimeSchedule      // [{ day: 1, start: [20, 45], end: [7, 30] }, ...]
rules.schoolTimeSchedule   // [{ day: 1, start: [8, 0], end: [15, 0] }, ...]
```

---

## Low-level API (`FamilyLinkAPI`)

For direct HTTP access without the higher-level abstractions:

```ts
import { Authenticator, FamilyLinkAPI } from 'g-family-link'

const auth = Authenticator.fromCookies(cookies, 3)
const api = new FamilyLinkAPI(auth)

const { json, status, headers } = await api.getFamilyMembers()
```

| Method | Description |
|--------|-------------|
| `getFamilyMembers()` | Family roster (`GET /families/mine/members`) |
| `getAppsAndUsage(accountId)` | Apps, devices, and usage sessions (`GET /people/{id}/appsandusage`) |
| `getAppliedTimeLimits(accountId)` | Current time limits state (`GET /people/{id}/appliedTimeLimits`) |
| `getTimeLimit(accountId)` | Time limit rules/schedules (`GET /people/{id}/timeLimit`) |
| `controlDevice(accountId, deviceId, action)` | Lock/unlock device (`POST /people/{id}/timeLimitOverrides:batchCreate`) |
| `addTimeBonus(accountId, deviceId, minutes)` | Add time bonus (`POST /people/{id}/timeLimitOverrides:batchCreate`) |
| `cancelTimeBonus(accountId, overrideId)` | Cancel bonus (`POST /people/{id}/timeLimitOverride/{id}?$httpMethod=DELETE`) |
| `enableBedtime(accountId, ruleId)` | Enable bedtime (`PUT /people/{id}/timeLimit:update`) |
| `disableBedtime(accountId, ruleId)` | Disable bedtime (`PUT /people/{id}/timeLimit:update`) |
| `setBedtime(accountId, startH, startM, endH, endM, day)` | Set bedtime schedule (`POST /people/{id}/timeLimitOverrides:batchCreate`) |
| `enableSchoolTime(accountId, ruleId)` | Enable school time (`PUT /people/{id}/timeLimit:update`) |
| `disableSchoolTime(accountId, ruleId)` | Disable school time (`PUT /people/{id}/timeLimit:update`) |
| `enableDailyLimit(accountId)` | Enable daily limit (`PUT /people/{id}/timeLimit:update`) |
| `disableDailyLimit(accountId)` | Disable daily limit (`PUT /people/{id}/timeLimit:update`) |
| `setDailyLimit(accountId, deviceId, minutes)` | Set daily limit (`POST /people/{id}/timeLimitOverrides:batchCreate`) |

All methods return `Promise<ApiResponse<T>>` where:

```ts
interface ApiResponse<T> {
  status: number   // HTTP status code
  json: T          // parsed response body (protobuf-like JSON arrays)
  headers: Headers // response headers
}
```
