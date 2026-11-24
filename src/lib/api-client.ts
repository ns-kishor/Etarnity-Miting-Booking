'use client'

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>
  extra?: Record<string, unknown>

  constructor(message: string, status: number, fieldErrors?: Record<string, string>, extra?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
    this.extra = extra
  }
}

export async function api<T = unknown>(
  path: string,
  options?: { method?: string; body?: unknown; signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(path, {
    method: options?.method ?? 'GET',
    headers: options?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
    cache: 'no-store',
    credentials: 'include',
  })

  let data: Record<string, unknown> = {}
  try {
    data = await res.json()
  } catch {
    // empty body
  }

  if (!res.ok) {
    throw new ApiError(
      (data.error as string) || `Request failed (${res.status})`,
      res.status,
      data.fieldErrors as Record<string, string> | undefined,
      data
    )
  }
  return data as T
}
