import { request } from './native'
export type User = { id: string; name: string; login: string }
export type Session = { user: User | null; development: boolean; capabilities: { login: boolean; pdf: boolean; assistant: boolean; publishing: boolean }; languages: Record<string, string>; maxPages: number }
export type Section = { id: string; title: string; text: string }
export type Paper = { sharing?:string;provenance?:{licenseUrl?:string;changes?:string}; discipline?:string; subdiscipline?:string; year?:string; journal?:string; doi?:string; id: string; title: string; authors: string; category: string; language: string; license: string; source: string; visibility: string; revision: string; createdAt: string; mmd?: string; sections?: Section[]; sectionCount?: number; words?: number; sample?: boolean; isOwner?: boolean; assets: { path: string; bytes?: number }[] }
export type Comment = { id: string; author: string; login: string; text: string; quote: string; sectionId: string | null; paragraphId?:string; createdAt: string; canDelete: boolean; pending?: boolean }
export type Job = { title?:string;source?:string;canUpload?:boolean;sharing?:string; id: string; kind: string; state: string; message: string; created: number; paperId?: string; artifactId?: string; creditCost?:number }
export type Artifact = { segmentId?:string; id: string; kind: string; language: string; text: string; model: string; sectionId?: string }
export class APIError extends Error { constructor(message: string, public status: number,public details:Record<string,unknown>={}) { super(message) } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await request(`/api${path}`, options)
  const data = await res.json().catch(() => ({ error: 'Connection interrupted. Please try again.' }))
  if (!res.ok) throw new APIError(data.error || 'Could not complete this request.', res.status,data)
  return data
}
export const post = <T,>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) })
export type Attachment = {id:string;name:string;mime?:string;bytes?:number;state:string;message?:string;paperId?:string;jobId?:string}
