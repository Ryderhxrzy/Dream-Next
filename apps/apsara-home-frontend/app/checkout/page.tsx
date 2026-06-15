import Checkout from "@/components/product/Checkout"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Checkout",
  description: "Browse the Checkout page on AF Home.",
  path: "/checkout",
  noIndex: true,
})

const CheckoutPage = () => {
  return <Checkout />
}

export default CheckoutPage
