"use client"

import { useState } from "react"
import { Anvil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const t = useTranslations("login")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(username, password)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorLoginFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4">
      <Card className="w-full max-w-sm border-border shadow-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-secondary">
            <Anvil className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <CardTitle className="text-xl font-medium">{t("title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("labelUsername")}</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("labelPassword")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("buttonSigningIn") : t("buttonSignIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
