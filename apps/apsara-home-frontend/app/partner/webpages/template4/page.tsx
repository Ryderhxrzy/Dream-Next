import Template4 from "@/components/partner/templates/template4"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Template 4 — SaaS Business",
  description: "Landing page template 4 preview.",
  path: "/partner/webpages/template4",
  noIndex: true,
})

export default function Template4Page() {
  return <Template4 />
}
