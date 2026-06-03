import axios from "axios"

const FORGE_API_URL = process.env.NEXT_PUBLIC_FORGE_API_URL || "/forge"

const forgeClient = axios.create({
  baseURL: FORGE_API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
})

// Request interceptor: attach Bearer token
forgeClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("forge_access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Mutex for token refresh to prevent race conditions
let refreshPromise: Promise<any> | null = null

// Response interceptor: unwrap envelope, handle 401
forgeClient.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === "object" && "code" in body) {
      if (body.code === 1) {
        return body.data
      }
      return Promise.reject(new Error(body.message || "Request failed"))
    }
    return response.data
  },
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("forge_refresh_token")
      const config = error.config
      if (refreshToken && !(config as any)._retry) {
        (config as any)._retry = true

        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${FORGE_API_URL}/api/admin/auth/refresh`, { refreshToken })
            .then((res) => {
              const data = res.data?.data || res.data
              localStorage.setItem("forge_access_token", data.accessToken)
              localStorage.setItem("forge_refresh_token", data.refreshToken)
              return data
            })
            .catch((err) => {
              localStorage.removeItem("forge_access_token")
              localStorage.removeItem("forge_refresh_token")
              window.location.href = "/forge/login"
              throw err
            })
            .finally(() => {
              refreshPromise = null
            })
        }

        try {
          const data = await refreshPromise
          config.headers.Authorization = `Bearer ${data.accessToken}`
          return forgeClient(config)
        } catch {
          return Promise.reject(error)
        }
      }
      localStorage.removeItem("forge_access_token")
      localStorage.removeItem("forge_refresh_token")
      window.location.href = "/forge/login"
    }
    const msg = error.response?.data?.message || error.message || "Request failed"
    const err = new Error(msg) as Error & { status?: number; isForbidden?: boolean }
    err.status = error.response?.status
    err.isForbidden = error.response?.status === 403
    return Promise.reject(err)
  },
)

export default forgeClient
