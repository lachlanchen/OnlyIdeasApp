export type UpdatePlatform = 'web' | 'ios' | 'android' | 'macos' | 'windows'
export type Release = { version: string; build: string }
export type UpdateCandidate = { key: string; version?: string }
export const PUBLIC_RELEASES_URL = 'https://agent.onlyideas.art/updates.json'
export const STORE_URLS = {
  ios: 'https://apps.apple.com/app/id6816392935',
  macos: 'https://apps.apple.com/app/id6816392935?platform=mac',
  android: 'https://play.google.com/store/apps/details?id=art.onlyideas.app',
  windows: 'https://lazying.art/downloads/windows/#onlyideas',
} as const
export const SNOOZE_MS = 24 * 60 * 60 * 1000

/** Numeric comparison, including 1.10 > 1.9 and 1.2 == 1.2.0. */
export function compareVersion(a: string, b: string): number {
  if (![a, b].every((value) => /^\d{1,8}(\.\d{1,8}){0,3}$/.test(value))) throw new Error('Invalid version')
  const left = a.split('.').map(Number), right = b.split('.').map(Number)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff) return Math.sign(diff)
  }
  return 0
}

/** Only explicit public releases enter this feed. URLs never come from it. */
export function nativeUpdate(feed: unknown, platform: Exclude<UpdatePlatform, 'web'>, installed: Release): UpdateCandidate | null {
  if (!feed || typeof feed !== 'object' || !('schema' in feed) || feed.schema !== 1 || !(platform in feed)) throw new Error('Invalid release feed')
  const release = (feed as Record<string, unknown>)[platform]
  if (release === null) return null // Not publicly released on this platform yet.
  if (!release || typeof release !== 'object' || !('version' in release) || typeof release.version !== 'string' || !('build' in release) || typeof release.build !== 'string') throw new Error('Invalid release')
  const newerVersion = compareVersion(release.version, installed.version)
  const newerBuild = compareVersion(release.build, installed.build)
  return newerVersion > 0 || (newerVersion === 0 && newerBuild > 0)
    ? { key: `${platform}:${release.version}:${release.build}`, version: release.version } : null
}

export function isSnoozed(value: unknown, key: string, now = Date.now()): boolean {
  if (!value || typeof value !== 'object' || !('key' in value) || !('at' in value)) return false
  return value.key === key && typeof value.at === 'number' && value.at <= now && now - value.at < SNOOZE_MS
}
