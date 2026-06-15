"use client"

import { useMemo, useState } from "react"
import { useGetActivityLogsQuery } from "@/store/api/activityLogsApi"
import { motion } from "framer-motion"

import Loading from "@/components/Loading"

import ActivityLogsStats from "./ActivityLogsStats"
import ActivityLogsTable from "./ActivityLogsTable"
import ActivityLogsToolbar from "./ActivityLogsToolbar"

const ActivityLogsPageMain = () => {
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [page, setPage] = useState(1)
  const { data: logsData, isLoading } = useGetActivityLogsQuery({
    page,
    perPage: 50,
    activity_type: actionFilter === "all" ? undefined : (actionFilter as any),
    search: search.trim() || undefined,
  })

  const logs = logsData?.data || []

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase()
    return logs.filter((log) => {
      if (
        q &&
        !log.customer?.name.toLowerCase().includes(q) &&
        !log.customer?.email.toLowerCase().includes(q) &&
        !log.description?.toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [logs, search])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Members Activity Logs
          </h1>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            Track all member actions - logins, purchases, encashment, and more
          </p>
        </div>
      </motion.div>

      <ActivityLogsStats logs={logs} />

      <ActivityLogsToolbar
        search={search}
        actionFilter={actionFilter}
        total={filtered.length}
        onSearch={setSearch}
        onActionFilter={setActionFilter}
        isLoading={isLoading}
      />

      <ActivityLogsTable logs={filtered} />
    </div>
  )
}

export default ActivityLogsPageMain
