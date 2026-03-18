import { createHash } from 'node:crypto'
import { ORIGIN, SESSION_MAX_AGE, USER_AGENT, API_KEY } from './const.js'
import { AuthenticationError } from './errors.js'
import type { Cookie } from './types.js'

export class Authenticator {
  private _cookies: Cookie[] = []
  private _cookieDict: Record<string, string> | null = null
  private _cookieHeader: string | null = null
  private _sapisidhash: string | null = null
  private _sapisidhashCreatedAt = 0
  private _authUser = 0

  get isAuthenticated(): boolean {
    return this._cookies.length > 0
  }

  get authUser(): number {
    return this._authUser
  }

  setCookies(cookies: Cookie[]): void {
    this._cookies = cookies
    this._cookieDict = null
    this._cookieHeader = null
    this._sapisidhash = null
    this._sapisidhashCreatedAt = 0
  }

  setAuthUser(index: number): void {
    this._authUser = index
  }

  static fromCookies(cookies: Cookie[], authUser = 0): Authenticator {
    const auth = new Authenticator()
    auth.setCookies(cookies)
    auth._authUser = authUser
    return auth
  }

  getHeaders(): Record<string, string> {
    if (!this.isAuthenticated) {
      throw new AuthenticationError('Not authenticated')
    }
    return {
      'User-Agent': USER_AGENT,
      'Origin': ORIGIN,
      'Content-Type': 'application/json+protobuf',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-AuthUser': String(this._authUser),
      'Authorization': `SAPISIDHASH ${this.getSapisidhash()}`,
      'Cookie': this.getCookieHeader(),
    }
  }

  refreshHeaders(): void {
    this._sapisidhash = null
    this._sapisidhashCreatedAt = 0
  }

  private _domainPriority(domain: string): number {
    const d = domain.toLowerCase().replace(/^\./, '')
    if (d === 'google.com') return 0
    if (d.startsWith('google.com.') || d.startsWith('google.co.')) return 2
    return 1
  }

  private _getCookiesDict(): Record<string, string> {
    if (this._cookieDict) return this._cookieDict

    const dict: Record<string, string> = {}
    const domains: Record<string, string> = {}

    for (const cookie of this._cookies) {
      const name = cookie.name
      const value = cookie.value.replace(/^"|"$/g, '')
      const domain = cookie.domain ?? ''

      if (!name || !value) continue

      if (name in dict) {
        const existing = domains[name] ?? ''
        if (this._domainPriority(domain) < this._domainPriority(existing)) {
          dict[name] = value
          domains[name] = domain
        }
      } else {
        dict[name] = value
        domains[name] = domain
      }
    }

    this._cookieDict = dict
    return dict
  }

  getCookieHeader(): string {
    if (this._cookieHeader) return this._cookieHeader
    const dict = this._getCookiesDict()
    this._cookieHeader = Object.entries(dict)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
    return this._cookieHeader
  }

  private _getSapisid(): string {
    const dict = this._getCookiesDict()
    const sapisid = dict['SAPISID']
    if (!sapisid) throw new AuthenticationError('SAPISID cookie not found in authentication data')
    return sapisid
  }

  private _generateSapisidhash(): string {
    const sapisid = this._getSapisid()
    const timestamp = Math.floor(Date.now() / 1000)
    const toHash = `${timestamp} ${sapisid} ${ORIGIN}`
    const hash = createHash('sha1').update(toHash).digest('hex')
    return `${timestamp}_${hash}`
  }

  getSapisidhash(): string {
    const now = Date.now() / 1000
    if (!this._sapisidhash || (now - this._sapisidhashCreatedAt) > SESSION_MAX_AGE) {
      this._sapisidhash = this._generateSapisidhash()
      this._sapisidhashCreatedAt = now
    }
    return this._sapisidhash
  }
}
