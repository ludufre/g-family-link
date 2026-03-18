#!/usr/bin/env node
import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { FamilyLink } from './family-link.js'
import { HttpError } from './errors.js'
import { loadCookies, saveCookies, clearCookies, hasSavedCookies } from './config.js'
import type { Cookie } from './types.js'

const program = new Command()

program
  .name('g-family-link')
  .description('Google Family Link API client (time control)')
  .version('1.0.0')
  .option('--auth-user <n>', 'Google account index (when multiple accounts are logged in)', '0')

function getClient(): FamilyLink {
  const cookies = loadCookies()
  if (!cookies || cookies.length === 0) {
    console.error('Not authenticated. Run "gfl load-cookies <file>" first.')
    process.exit(1)
  }
  const authUser = parseInt(program.opts().authUser ?? '0')
  return FamilyLink.fromCookies(cookies, authUser)
}

// ─── Authentication ─────────────────────────────────────────────────────────

program
  .command('load-cookies <file>')
  .description('Load cookies from a JSON file (exported from Cookie-Editor)')
  .action((file: string) => {
    try {
      const raw = readFileSync(file, 'utf-8')
      const cookies = JSON.parse(raw) as Cookie[]
      saveCookies(cookies)
      console.log(`Loaded ${cookies.length} cookies.`)
    } catch (err) {
      console.error('Failed to load cookies:', err)
      process.exit(1)
    }
  })

program
  .command('logout')
  .description('Clear saved credentials')
  .action(() => {
    clearCookies()
    console.log('Credentials cleared.')
  })

program
  .command('status')
  .description('Check authentication status')
  .action(() => {
    console.log(hasSavedCookies() ? 'Authenticated' : 'Not authenticated')
  })

// ─── Family members ─────────────────────────────────────────────────────────

program
  .command('children')
  .description('List supervised children')
  .action(async () => {
    const client = getClient()
    const children = await client.getChildren()
    if (children.length === 0) {
      const authUser = parseInt(program.opts().authUser ?? '0')
      console.log('No supervised children found on this account.')
      console.log(`Try a different account with: gfl --auth-user ${authUser + 1} children`)
      return
    }
    for (const child of children) {
      console.log(`  ${child.profile.displayName} (${child.userId})`)
    }
  })

// ─── Devices ────────────────────────────────────────────────────────────────

program
  .command('devices <accountId>')
  .description('List devices for a child')
  .action(async (accountId: string) => {
    const client = getClient()
    const devices = await client.getDevices(accountId)
    if (devices.length === 0) {
      console.log('No devices found.')
      return
    }
    for (const d of devices) {
      console.log(`  ${d.name} (${d.deviceId}) - ${d.model ?? 'unknown model'}`)
    }
  })

// ─── Screen time ────────────────────────────────────────────────────────────

program
  .command('screen-time <accountId>')
  .description('Get today\'s screen time')
  .action(async (accountId: string) => {
    const client = getClient()
    const st = await client.getDailyScreenTime(accountId)
    console.log(`Total: ${st.formatted}`)
    if (Object.keys(st.appBreakdown).length > 0) {
      console.log('Apps:')
      const sorted = Object.entries(st.appBreakdown).sort((a, b) => b[1] - a[1])
      for (const [app, secs] of sorted) {
        const m = Math.floor(secs / 60)
        console.log(`  ${app}: ${m}m`)
      }
    }
  })

// ─── Device lock/unlock ─────────────────────────────────────────────────────

program
  .command('lock <accountId> <deviceId>')
  .description('Lock a device')
  .action(async (accountId: string, deviceId: string) => {
    const client = getClient()
    const ok = await client.lockDevice(accountId, deviceId)
    console.log(ok ? 'Device locked.' : 'Failed to lock device.')
  })

program
  .command('unlock <accountId> <deviceId>')
  .description('Unlock a device')
  .action(async (accountId: string, deviceId: string) => {
    const client = getClient()
    const ok = await client.unlockDevice(accountId, deviceId)
    console.log(ok ? 'Device unlocked.' : 'Failed to unlock device.')
  })

// ─── Applied time limits ────────────────────────────────────────────────────

program
  .command('time-limits <accountId>')
  .description('Get applied time limits for all devices')
  .action(async (accountId: string) => {
    const client = getClient()
    const result = await client.getAppliedTimeLimits(accountId)

    console.log('Lock states:')
    for (const [id, locked] of Object.entries(result.deviceLockStates)) {
      console.log(`  ${id}: ${locked ? 'LOCKED' : 'UNLOCKED'}`)
    }

    console.log('\nDevices:')
    for (const [id, info] of Object.entries(result.devices)) {
      console.log(`  ${id}:`)
      console.log(`    Used: ${info.usedMinutes}m`)
      if (info.dailyLimitEnabled) {
        console.log(`    Daily limit: ${info.dailyLimitMinutes}m (remaining: ${info.remainingMinutes}m)`)
      }
      if (info.bonusMinutes > 0) {
        console.log(`    Bonus: ${info.bonusMinutes}m (override: ${info.bonusOverrideId})`)
      }
      if (info.bedtimeActive) console.log('    Bedtime: ACTIVE')
      if (info.schooltimeActive) console.log('    School time: ACTIVE')
    }
  })

// ─── Time bonus ─────────────────────────────────────────────────────────────

program
  .command('add-bonus <accountId> <deviceId> <minutes>')
  .description('Add time bonus (e.g. 30 for 30min)')
  .action(async (accountId: string, deviceId: string, minutes: string) => {
    const client = getClient()
    const ok = await client.addTimeBonus(accountId, deviceId, parseInt(minutes))
    console.log(ok ? `Added ${minutes}m bonus.` : 'Failed to add bonus.')
  })

program
  .command('cancel-bonus <accountId> <overrideId>')
  .description('Cancel an active time bonus')
  .action(async (accountId: string, overrideId: string) => {
    const client = getClient()
    const ok = await client.cancelTimeBonus(accountId, overrideId)
    console.log(ok ? 'Bonus cancelled.' : 'Failed to cancel bonus.')
  })

// ─── Bedtime ────────────────────────────────────────────────────────────────

program
  .command('enable-bedtime <accountId>')
  .description('Enable bedtime restrictions')
  .option('--rule-id <id>', 'Bedtime rule ID (auto-detected if not provided)')
  .action(async (accountId: string, opts: { ruleId?: string }) => {
    const client = getClient()
    const ok = await client.enableBedtime(accountId, opts.ruleId)
    console.log(ok ? 'Bedtime enabled.' : 'Failed to enable bedtime.')
  })

program
  .command('disable-bedtime <accountId>')
  .description('Disable bedtime restrictions')
  .option('--rule-id <id>', 'Bedtime rule ID (auto-detected if not provided)')
  .action(async (accountId: string, opts: { ruleId?: string }) => {
    const client = getClient()
    const ok = await client.disableBedtime(accountId, opts.ruleId)
    console.log(ok ? 'Bedtime disabled.' : 'Failed to disable bedtime.')
  })

program
  .command('set-bedtime <accountId> <start> <end>')
  .description('Set bedtime schedule (e.g. "20:45" "07:30")')
  .option('--day <n>', 'Day of week, 1=Mon, 7=Sun (default: today)')
  .action(async (accountId: string, start: string, end: string, opts: { day?: string }) => {
    const client = getClient()
    const day = opts.day ? parseInt(opts.day) : undefined
    const ok = await client.setBedtime(accountId, start, end, day)
    console.log(ok ? 'Bedtime schedule set.' : 'Failed to set bedtime.')
  })

// ─── School time ────────────────────────────────────────────────────────────

program
  .command('enable-school-time <accountId>')
  .description('Enable school time restrictions')
  .option('--rule-id <id>', 'School time rule ID (auto-detected if not provided)')
  .action(async (accountId: string, opts: { ruleId?: string }) => {
    const client = getClient()
    const ok = await client.enableSchoolTime(accountId, opts.ruleId)
    console.log(ok ? 'School time enabled.' : 'Failed to enable school time.')
  })

program
  .command('disable-school-time <accountId>')
  .description('Disable school time restrictions')
  .option('--rule-id <id>', 'School time rule ID (auto-detected if not provided)')
  .action(async (accountId: string, opts: { ruleId?: string }) => {
    const client = getClient()
    const ok = await client.disableSchoolTime(accountId, opts.ruleId)
    console.log(ok ? 'School time disabled.' : 'Failed to disable school time.')
  })

// ─── Daily limit ────────────────────────────────────────────────────────────

program
  .command('enable-daily-limit <accountId>')
  .description('Enable daily time limit')
  .action(async (accountId: string) => {
    const client = getClient()
    const ok = await client.enableDailyLimit(accountId)
    console.log(ok ? 'Daily limit enabled.' : 'Failed to enable daily limit.')
  })

program
  .command('disable-daily-limit <accountId>')
  .description('Disable daily time limit')
  .action(async (accountId: string) => {
    const client = getClient()
    const ok = await client.disableDailyLimit(accountId)
    console.log(ok ? 'Daily limit disabled.' : 'Failed to disable daily limit.')
  })

program
  .command('set-daily-limit <accountId> <deviceId> <minutes>')
  .description('Set daily time limit in minutes')
  .action(async (accountId: string, deviceId: string, minutes: string) => {
    const client = getClient()
    const ok = await client.setDailyLimit(accountId, deviceId, parseInt(minutes))
    console.log(ok ? `Daily limit set to ${minutes}m.` : 'Failed to set daily limit.')
  })

// ─── Time limit rules ──────────────────────────────────────────────────────

program
  .command('rules <accountId>')
  .description('Get time limit rules (bedtime/school time schedules)')
  .action(async (accountId: string) => {
    const client = getClient()
    const rules = await client.getTimeLimitRules(accountId)
    console.log(`Bedtime: ${rules.bedtimeEnabled ? 'ON' : 'OFF'} (rule: ${rules.bedtimeRuleId ?? 'N/A'})`)
    if (rules.bedtimeSchedule.length > 0) {
      const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      for (const s of rules.bedtimeSchedule) {
        const pad = (n: number) => String(n).padStart(2, '0')
        console.log(`  ${dayNames[s.day]}: ${pad(s.start[0])}:${pad(s.start[1])} - ${pad(s.end[0])}:${pad(s.end[1])}`)
      }
    }
    console.log(`School time: ${rules.schoolTimeEnabled ? 'ON' : 'OFF'} (rule: ${rules.schooltimeRuleId ?? 'N/A'})`)
    if (rules.schoolTimeSchedule.length > 0) {
      const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      for (const s of rules.schoolTimeSchedule) {
        const pad = (n: number) => String(n).padStart(2, '0')
        console.log(`  ${dayNames[s.day]}: ${pad(s.start[0])}:${pad(s.start[1])} - ${pad(s.end[0])}:${pad(s.end[1])}`)
      }
    }
  })

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof HttpError) {
    console.error(`HTTP ${err.statusCode}: ${err.body}`)
  } else {
    console.error(err instanceof Error ? err.message : err)
  }
  process.exit(1)
})
