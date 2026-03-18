import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Cookie } from './types.js'

const CONFIG_DIR = join(homedir(), '.config', 'g-family-link')
const COOKIES_FILE = join(CONFIG_DIR, 'cookies.json')

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }
}

export function loadCookies(): Cookie[] | null {
  try {
    if (!existsSync(COOKIES_FILE)) return null
    const raw = readFileSync(COOKIES_FILE, 'utf-8')
    return JSON.parse(raw) as Cookie[]
  } catch {
    return null
  }
}

export function saveCookies(cookies: Cookie[]): void {
  ensureDir()
  writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2), { mode: 0o600 })
}

export function clearCookies(): void {
  try {
    if (existsSync(COOKIES_FILE)) unlinkSync(COOKIES_FILE)
  } catch {
    // ignore
  }
}

export function hasSavedCookies(): boolean {
  try {
    const cookies = loadCookies()
    return cookies != null && cookies.length > 0
  } catch {
    return false
  }
}
