import CheckoutSuccessPage from "@/components/product/CheckoutSuccess"
import { buildPageMetadata } from "@/app/seo"

export const metadata = buildPageMetadata({
  title: "Checkout Success",
  description: "Browse the Checkout Success page on AF Home.",
  path: "/checkout/success",
  noIndex: true,
})

const CheckoutPage = () => {
  return (
    <div>
      <CheckoutSuccessPage />
    </div>
  )
}

export default CheckoutPage
