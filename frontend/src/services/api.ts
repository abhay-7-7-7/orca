const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, config)

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`API Error ${response.status}: ${errorText}`)
  }

  return response.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body })
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`API Error ${response.status}: ${errorText}`)
  }

  return response.json()
}

export { BASE_URL }
