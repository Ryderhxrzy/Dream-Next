"use client"

import { useState } from "react"
import UsernameChangeRequestsPage from "./UsernameChangeRequestsPage"
import WebstoreRequestsPage from "./WebstoreRequestsPage"
import ServiceInquiriesAdminPage from "./ServiceInquiriesAdminPage"

type InquiryTab = "username" | "webstore" | "services"

const TABS: { key: InquiryTab; label: string }[] = [
  { key: "username", label: "Username Change Requests" },
  { key: "webstore", label: "Webstore Requests" },
  { key: "services", label: "Service Inquiries" },
]

export default function AdminInquiryPage() {
  const [tab, setTab] = useState<InquiryTab>("username")

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                tab === key
                  ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "username" && <UsernameChangeRequestsPage />}
      {tab === "webstore" && <WebstoreRequestsPage />}
      {tab === "services" && <ServiceInquiriesAdminPage />}
    </div>
  )
}
