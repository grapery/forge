import { cn } from "@/lib/utils"

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800",
  admin: "bg-orange-100 text-orange-800",
  operator: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  operator: "Operator",
  viewer: "Viewer",
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  disabled: "bg-red-100 text-red-800",
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", roleColors[role] || "bg-gray-100 text-gray-800")}>
      {roleLabels[role] || role}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusColors[status] || "bg-gray-100 text-gray-800")}>
      {status === "active" ? "Active" : "Disabled"}
    </span>
  )
}
