export type User = { id: string; name: string; login: string }
export type Session = { user: User | null; development: boolean; capabilities: { login: boolean; pdf: boolean; assistant: boolean; publishing: boolean }; languages: Record<string, string>; maxPages: number }
export type Section = { id: string; title: string; text: string }
export type Paper = { id: string; title: string; authors: string; category: string; language: string; license: string; source: string; visibility: string; revision: string; createdAt: string; mmd?: string; sections?: Section[]; sectionCount?: number; words?: number; sample?: boolean; isOwner?: boolean; assets: { path: string; bytes?: number }[] }
export type Comment = { id: string; author: string; login: string; text: string; quote: string; sectionId: string | null; createdAt: string; canDelete: boolean }
export type Job = { id: string; kind: string; state: string; message: string; created: number; paperId?: string; artifactId?: string }
export type Artifact = { id: string; kind: string; language: string; text: string; model: string; sectionId?: string }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', ...options, headers: { ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, signal: AbortSignal.timeout(60_000) })
  const data = await res.json().catch(() => ({ error: 'Connection interrupted. Please try again.' }))
  if (!res.ok) throw new Error(data.error || 'Could not complete this request.')
  return data
}
export const post = <T,>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) })
