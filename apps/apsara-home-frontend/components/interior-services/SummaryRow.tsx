"use client"

const SummaryRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex items-start justify-between border-b border-indigo-50 py-3 last:border-0">
      <span className="text-[0.68rem] tracking-[0.12em] text-slate-400 uppercase">
        {label}
      </span>
      <span className="max-w-[60%] text-right text-[0.82rem] text-slate-700">
        {value || "—"}
      </span>
    </div>
  )
}

export default SummaryRow
