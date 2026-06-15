import ExpensesPageMain from "@/components/superAdmin/expenses/ExpensesPageMain"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Admin Expenses",
  description: "Browse the Admin Expenses page on AF Home.",
  path: "/admin/expenses",
  noIndex: true,
})

export default function AdminExpensesPage() {
  return <ExpensesPageMain />
}
