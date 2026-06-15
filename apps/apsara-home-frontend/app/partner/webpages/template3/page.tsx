import Template3 from "@/components/partner/templates/template3"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Template 3 — Bold Gradient",
  description: "Landing page template 3 preview.",
  path: "/partner/webpages/template3",
  noIndex: true,
})

export default function Template3Page() {
  return <Template3 />
}
