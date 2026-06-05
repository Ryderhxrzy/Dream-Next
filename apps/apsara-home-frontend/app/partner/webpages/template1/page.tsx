import { buildPageMetadata } from '@/app/seo'
import Template1 from '@/components/partner/templates/template1'

export const metadata = buildPageMetadata({
  title: 'Template 1 — Modern Dark',
  description: 'Landing page template 1 preview.',
  path: '/partner/webpages/template1',
  noIndex: true,
})

export default function Template1Page() {
  return <Template1 />
}
