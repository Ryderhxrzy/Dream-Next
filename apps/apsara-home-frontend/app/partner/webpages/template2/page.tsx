import { buildPageMetadata } from "@/app/seo"
import Template2 from "@/components/partner/templates/template2"

export const metadata = buildPageMetadata({
  title: "Template 2 — Light & Clean",
  description: "Landing page template 2 preview.",
  path: "/partner/webpages/template2",
  noIndex: true,
})

export default function Template2Page() {
  return <Template2 />
}
