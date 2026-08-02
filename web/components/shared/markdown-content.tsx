"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

export function MarkdownContent({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  if (!content) return null
  return (
    <div className={cn("ops-md text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-3 mb-2 text-base font-semibold tracking-tight first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-3 mb-1.5 text-[15px] font-semibold tracking-tight first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-2.5 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
          h4: ({ children }) => <h4 className="mt-2 mb-1 text-sm font-medium first:mt-0">{children}</h4>,
          p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-1 first:mt-0">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-1 first:mt-0">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5 marker:text-muted-foreground">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="my-3 border-border" />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
              {children}
            </a>
          ),
          code: ({ className: codeClass, children }) => {
            const isBlock = typeof codeClass === "string" && codeClass.includes("language-")
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-md bg-background border border-border px-2.5 py-2 text-[11px] font-mono text-muted-foreground whitespace-pre">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded bg-background/80 border border-border px-1 py-0.5 text-[11px] font-mono text-foreground">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-md first:mt-0 last:mb-0">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground first:mt-0">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto first:mt-0">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-background/60">{children}</thead>,
          th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
