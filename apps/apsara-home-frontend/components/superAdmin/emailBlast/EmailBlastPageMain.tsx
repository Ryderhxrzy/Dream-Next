"use client"

import { motion } from "framer-motion"

import EmailBlastForm from "./EmailBlastForm"

export default function EmailBlastPageMain() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8 dark:from-slate-950 dark:to-slate-900"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
            Email Blast
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Send targeted email campaigns to members and suppliers
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <EmailBlastForm />
        </div>

        {/* Info Box */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <div className="space-y-2">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Email Blast Information
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>
                Recipients receive emails via BCC to protect email privacy
              </li>
              <li>You can send to members, suppliers, or both</li>
              <li>Emails can include subject, body text, and an image</li>
              <li>Large campaigns are sent in batches for reliability</li>
              <li>Check the preview before sending</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
