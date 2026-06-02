"use client"

import { useEffect, useState, useCallback } from "react"
import { PageSkeleton } from "@/components/shared/skeleton"

import { topicApi } from "@/lib/api/admin"

import type { TopicStats } from "@/lib/types"

import { PageHeader } from "@/components/shared/page-header"

import { DataTable } from "@/components/shared/data-table"

import { SearchInput } from "@/components/shared/search-input"

import { Hash, BookOpen, Layers } from "lucide-react"

import { useRouter } from "next/navigation"


export default function TopicsPage() {
  const router = useRouter()
  const [items, setItems] = useState<TopicStats[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const pageSize = 20

  const fetchData = useCallback(() => {
    setLoading(true)
    topicApi
      .list({ page, pageSize, search: search || undefined })
      .then((data) => {
        setItems(data.items || [])
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleDateString()

  return (
    <div className="space-y-6">
      <PageHeader title="Topics" description="Browse trending topics and hashtags" icon={Hash} />

      <div className="w-64">
        <SearchInput onSearch={setSearch} placeholder="Search topics..." />
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={items}
          pagination={{ page, pageSize, total }}
          onPageChange={setPage}
          onRowClick={(t) => router.push(`/topics/detail?topic=${encodeURIComponent(t.topic)}`)}
          columns={[
            {
              key: "topic",
              header: "Topic",
              render: (t: TopicStats) => (
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.topic}</span>
                </div>
              ),
            },
            {
              key: "fragments",
              header: "Fragments",
              render: (t: TopicStats) => (
                <div className="flex items-center gap-1">
                  <Layers className="h-3 w-3 text-muted-foreground" />
                  <span>{t.fragmentCount}</span>
                </div>
              ),
            },
            {
              key: "stories",
              header: "Stories",
              render: (t: TopicStats) => (
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-muted-foreground" />
                  <span>{t.storyCount}</span>
                </div>
              ),
            },
            {
              key: "latest",
              header: "Latest Activity",
              render: (t: TopicStats) => <span className="text-xs text-muted-foreground">{formatTime(t.latestActivity)}</span>,
            },
          ]}
        />
      )}
    </div>
  )
}
