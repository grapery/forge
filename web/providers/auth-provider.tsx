"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { authApi } from "@/lib/api/admin"
import type { AdminUser } from "@/lib/types"

interface AuthContextType {
  user: AdminUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("forge_access_token")
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .getProfile()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("forge_access_token")
        localStorage.removeItem("forge_refresh_token")
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const res = await authApi.login({ username, password })
    localStorage.setItem("forge_access_token", res.accessToken)
    localStorage.setItem("forge_refresh_token", res.refreshToken)
    setUser(res.user)
  }

  const logout = () => {
    localStorage.removeItem("forge_access_token")
    localStorage.removeItem("forge_refresh_token")
    setUser(null)
    window.location.href = "/login"
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
