import DashboardLayout from "@/components/superAdmin/DashboardLayout"

function SkeletonTable() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="h-4 w-28 rounded-lg bg-slate-100" />
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-slate-100" />
              <div className="h-2.5 w-20 rounded bg-slate-100" />
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-100" />
            <div className="h-7 w-16 rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LoadingMembersPage() {
  return (
    <DashboardLayout>
      <div id="af-loading-screen" className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-white"
            />
          ))}
        </div>

        <div className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-white" />
        <SkeletonTable />
      </div>
    </DashboardLayout>
  )
}
