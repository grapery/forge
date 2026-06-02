"use client"

import { useEffect, useState } from "react"
import { PageSkeleton } from "@/components/shared/skeleton"

import { useRouter, useSearchParams } from "next/navigation"

import { feedbackApi } from "@/lib/api/admin"

import type { Feedback } from "@/lib/types"

import { Button } from "@/components/ui/button"

import { Label } from "@/components/ui/label"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


const statusLabel: Record<string, string> = {
  received: "Received",
  processing: "Processing",
  resolved: "Resolved",
  closed: "Closed",
}

const statusColor: Record<string, string> = {
  received: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
}

export default function FeedbackDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id") || ""

  const [fb, setFb] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [response, setResponse] = useState("")
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) { router.push("/feedback"); return }
    feedbackApi
      .get(id)
      .then((data) => {
        setFb(data)
        setResponse(data.response || "")
        setStatus(data.status)
      })
      .catch(() => router.push("/feedback"))
      .finally(() => setLoading(false))
  }, [id, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await feedbackApi.update(id, { status, response })
      setFb(updated)
    } catch {
      // error handled by interceptor
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (!fb) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback Detail</h1>
          <p className="text-muted-foreground">ID: {fb.id}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/feedback")}>
          Back to List
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm font-medium">{fb.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[fb.status]}`}>
                  {statusLabel[fb.status] || fb.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="text-sm font-mono">{fb.userId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm">{new Date(fb.createdAt * 1000).toLocaleString()}</p>
              </div>
            </div>

            {fb.contactInfo && (
              <div>
                <p className="text-xs text-muted-foreground">Contact Info</p>
                <p className="text-sm">{fb.contactInfo}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-1">Content</p>
              <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{fb.content}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="received">Received</option>
                <option value="processing">Processing</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="response">Response</Label>
              <textarea
                id="response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={6}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Write your response to the user..."
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Response"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
