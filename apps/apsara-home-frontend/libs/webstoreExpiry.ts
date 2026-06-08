export function computeEndDateRaw(
  startRaw?: string | null,
  billing?: string | null,
  plan?: string | null,
  term?: string | null,
  overallStatus?: string | null,
  receiptItems?: Array<{
    type?: string | null
    approvalStatus?: string | null
    approvedAt?: string | null
  }> | null,
  planTermMonths?: number | null,
): Date | null {
  if (!startRaw) return null
  const startDate = new Date(startRaw)
  if (Number.isNaN(startDate.getTime())) return null

  const endDate = new Date(startDate)
  const normalizedBilling = String(billing ?? '').toLowerCase()

  if (normalizedBilling === 'monthly') {
    const requestApproved = String(overallStatus ?? '').toLowerCase() === 'approved'
    const continuationMonths = Array.isArray(receiptItems)
      ? receiptItems.filter((r) =>
          r?.type === 'webstore_payment_continuation'
          && (r?.approvalStatus === 'approved' || Boolean(r?.approvedAt)),
        ).length
      : 0
    endDate.setMonth(endDate.getMonth() + (requestApproved ? 1 : 0) + continuationMonths)
    return endDate
  }

  // plan_term_months takes priority if present
  if (planTermMonths && planTermMonths > 0) {
    endDate.setMonth(endDate.getMonth() + planTermMonths)
    return endDate
  }

  const raw = String(term ?? '').toLowerCase()
  const dayMatch = raw.match(/(\d+)\s*day/)
  const monthMatch = raw.match(/(\d+)\s*month/)
  const normalizedPlan = String(plan ?? '').toLowerCase()

  let months = 0
  let days = 0
  if (dayMatch) {
    days = Number(dayMatch[1])
  } else if (monthMatch) {
    months = Number(monthMatch[1])
  } else if (normalizedPlan === 'quarterly') {
    months = 3
  } else if (normalizedPlan === 'semi_annual' || normalizedPlan === 'semi-annual') {
    months = 6
  } else if (normalizedPlan === 'annual') {
    months = 12
  } else if (normalizedPlan === 'test') {
    days = 2
  }

  // For full/one-time billing: find the latest approved continuation receipt.
  // If its approved_at is newer than the initial end date, use it as the renewal base.
  const latestContinuationApprovedAt = Array.isArray(receiptItems)
    ? receiptItems.reduce<Date | null>((latest, r) => {
        if (r?.type !== 'webstore_payment_continuation') return latest
        if (r?.approvalStatus !== 'approved' && !r?.approvedAt) return latest
        const t = r?.approvedAt ? new Date(r.approvedAt) : null
        if (!t || Number.isNaN(t.getTime())) return latest
        return !latest || t > latest ? t : latest
      }, null)
    : null

  if (days > 0) {
    const initialEnd = new Date(startDate)
    initialEnd.setDate(initialEnd.getDate() + days)
    if (latestContinuationApprovedAt) {
      const renewalEnd = new Date(latestContinuationApprovedAt)
      renewalEnd.setDate(renewalEnd.getDate() + days)
      if (renewalEnd > initialEnd) return renewalEnd
    }
    return initialEnd
  }
  if (months <= 0) return null
  const initialEnd = new Date(startDate)
  initialEnd.setMonth(initialEnd.getMonth() + months)
  if (latestContinuationApprovedAt) {
    const renewalEnd = new Date(latestContinuationApprovedAt)
    renewalEnd.setMonth(renewalEnd.getMonth() + months)
    if (renewalEnd > initialEnd) return renewalEnd
  }
  return initialEnd
}

export function isWebstoreRequestExpired(item: {
  status?: string | null
  approved_at?: string | null
  billing_option?: string | null
  plan?: string | null
  plan_term?: string | null
  plan_term_months?: number | null
  receipt_items?: Array<{
    type?: string | null
    approval_status?: string | null
    approved_at?: string | null
  }> | null
}): boolean {
  if (String(item.status ?? '').toLowerCase() !== 'approved') return false
  const mappedReceipts = (item.receipt_items ?? []).map((r) => ({
    type: r.type ?? null,
    approvalStatus: r.approval_status ?? null,
    approvedAt: r.approved_at ?? null,
  }))
  const endDate = computeEndDateRaw(
    item.approved_at,
    item.billing_option,
    item.plan,
    item.plan_term,
    item.status,
    mappedReceipts,
    item.plan_term_months,
  )
  if (!endDate) return false
  return endDate < new Date()
}
