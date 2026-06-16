"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  useQaBoardRealtime,
  type QaStatusUpdate,
} from "@/hooks/useQaBoardRealtime"

type TestStatus = "pending" | "pass" | "bug" | "skip"
type FilterCategory = "all" | "frontend" | "backend"

interface TestCase {
  id: string
  title: string
  expected: string
  sectionId: string
  sectionTitle: string
  group: string
  category: "frontend" | "backend"
}

interface TestSection {
  id: string
  title: string
  group: string
  category: "frontend" | "backend"
  tests: { id: string; title: string; expected: string }[]
}

interface StatusMeta {
  updated_by?: string | null
  updated_at?: string | null
}

// Ordered list of high-level groups — these become the dividing headers on the board.
const GROUP_ORDER = [
  "Authentication",
  "Catalog & Product",
  "Cart & Checkout",
  "Orders & Tracking",
  "Profile & KYC",
  "Rewards & MLM",
  "Admin Panel",
  "Supplier Portal",
  "Partner / Storefront",
  "Support & Content",
  "Auth API",
  "Product API",
  "Cart & Checkout API",
  "Orders & Shipping API",
  "Member & MLM API",
  "Supplier & Partner API",
  "Webhooks & Integrations",
  "Security & Rate Limiting",
  "Mobile / Responsive",
] as const

const SECTIONS: TestSection[] = [
  // ════════════════════════ AUTHENTICATION ════════════════════════
  {
    id: "login",
    title: "1.1 Login (Login/Sign-up tabs)",
    group: "Authentication",
    category: "frontend",
    tests: [
      {
        id: "F-AUTH-01",
        title: "Valid email & password login",
        expected: "Redirected home, Sanctum token stored in session",
      },
      {
        id: "F-AUTH-02",
        title: "Invalid password shows error",
        expected: '"Invalid credentials" message',
      },
      {
        id: "F-AUTH-03",
        title: "Non-existent account shows error",
        expected: '"Account not found" message',
      },
      {
        id: "F-AUTH-04",
        title: "Empty fields — inline validation",
        expected: "Both fields show errors",
      },
      {
        id: "F-AUTH-05",
        title: "Unverified email blocked",
        expected: "Prompted to verify email / OTP",
      },
      {
        id: "F-AUTH-06",
        title: "Show/hide password toggle",
        expected: "Password text toggles visible/hidden",
      },
      {
        id: "F-AUTH-07",
        title: "Switch Login ↔ Sign-up tabs",
        expected: "Tab UI swaps forms without reload",
      },
      {
        id: "F-AUTH-08",
        title: "Google OAuth login",
        expected: "Google consent → returns logged in / links account",
      },
      {
        id: "F-AUTH-09",
        title: "Facebook OAuth login",
        expected: "Facebook consent → returns logged in",
      },
      {
        id: "F-AUTH-10",
        title: "OAuth not-connected redirect",
        expected: "Routed to google/facebook-not-connected when unlinked",
      },
      {
        id: "F-AUTH-11",
        title: "Login loading state on submit",
        expected: "Spinner shown, button disabled",
      },
      {
        id: "F-AUTH-12",
        title: "Turnstile bot-check on login",
        expected: "Cloudflare Turnstile validates before submit",
      },
      {
        id: "F-AUTH-13",
        title: "Forgot password link navigates",
        expected: "Navigates to /forgot-password",
      },
    ],
  },
  {
    id: "register",
    title: "1.2 Sign Up",
    group: "Authentication",
    category: "frontend",
    tests: [
      {
        id: "F-REG-01",
        title: "Successful registration",
        expected: "OTP sent, routed to verification",
      },
      {
        id: "F-REG-02",
        title: "Duplicate email blocked",
        expected: '"Email already in use"',
      },
      {
        id: "F-REG-03",
        title: "Duplicate username blocked",
        expected: '"Username already taken"',
      },
      {
        id: "F-REG-04",
        title: "Real-time email availability",
        expected: "Live check-email feedback while typing",
      },
      {
        id: "F-REG-05",
        title: "Real-time username availability",
        expected: "Live check-username feedback",
      },
      {
        id: "F-REG-06",
        title: "Invalid referral code",
        expected: '"Invalid referral code" (check-referral)',
      },
      {
        id: "F-REG-07",
        title: "Valid referral code accepted",
        expected: "Code accepted, sponsor/upline shown",
      },
      {
        id: "F-REG-08",
        title: "Password mismatch validation",
        expected: '"Passwords do not match" error',
      },
      {
        id: "F-REG-09",
        title: "Weak password blocked",
        expected: "Password rule error shown",
      },
      {
        id: "F-REG-10",
        title: "Empty required fields",
        expected: "All required fields show errors",
      },
    ],
  },
  {
    id: "otp",
    title: "1.3 OTP Verification",
    group: "Authentication",
    category: "frontend",
    tests: [
      {
        id: "F-OTP-01",
        title: "Valid OTP entry",
        expected: "Account verified, redirect to app",
      },
      {
        id: "F-OTP-02",
        title: "Wrong OTP shows error",
        expected: '"Invalid OTP. Try again."',
      },
      {
        id: "F-OTP-03",
        title: "Expired OTP shows error",
        expected: '"OTP has expired"',
      },
      {
        id: "F-OTP-04",
        title: "Resend OTP works",
        expected: "New OTP sent, countdown resets",
      },
      {
        id: "F-OTP-05",
        title: "Resend cooldown enforced",
        expected: "Button disabled during cooldown",
      },
      {
        id: "F-OTP-06",
        title: "Auto-focus & paste OTP",
        expected: "First input focused; paste fills all digits",
      },
      {
        id: "F-OTP-07",
        title: "SMS OTP send & verify",
        expected: "SMS OTP received and accepted",
      },
    ],
  },
  {
    id: "password",
    title: "1.4 Forgot & Reset Password",
    group: "Authentication",
    category: "frontend",
    tests: [
      {
        id: "F-PWD-01",
        title: "Forgot password — valid email",
        expected: '"Reset link/OTP sent" message',
      },
      {
        id: "F-PWD-02",
        title: "Forgot password — unknown email",
        expected: "No info leak; generic success",
      },
      {
        id: "F-PWD-03",
        title: "Verify reset OTP",
        expected: "OTP accepted, proceed to reset",
      },
      {
        id: "F-PWD-04",
        title: "Reset — valid token",
        expected: "Password updated, redirect to login",
      },
      {
        id: "F-PWD-05",
        title: "Reset — expired token",
        expected: '"Link has expired" error',
      },
      {
        id: "F-PWD-06",
        title: "Reset — password mismatch",
        expected: "Inline validation error",
      },
      {
        id: "F-PWD-07",
        title: "Forced password change on login",
        expected: "User prompted before accessing app",
      },
    ],
  },
  {
    id: "mfa",
    title: "1.5 2FA · Passkey · QR Login",
    group: "Authentication",
    category: "frontend",
    tests: [
      {
        id: "F-MFA-01",
        title: "Enable TOTP in profile (setup)",
        expected: "QR/secret shown, code verifies, TOTP enabled",
      },
      {
        id: "F-MFA-02",
        title: "Disable TOTP in profile",
        expected: "TOTP disabled after confirm",
      },
      {
        id: "F-MFA-03",
        title: "Login MFA prompt when enabled",
        expected: "Prompted for code before access",
      },
      {
        id: "F-MFA-04",
        title: "Login MFA wrong code",
        expected: "Error shown, access denied",
      },
      {
        id: "F-MFA-05",
        title: "Resend login 2FA OTP",
        expected: "New OTP sent within cooldown",
      },
      {
        id: "F-MFA-06",
        title: "MFA approval via email link",
        expected: "/mfa-approval approve/deny controls sign-in",
      },
      {
        id: "F-MFA-07",
        title: "Passkey registration",
        expected: "WebAuthn prompt, passkey saved",
      },
      {
        id: "F-MFA-08",
        title: "Passkey login",
        expected: "Browser prompts WebAuthn, logs in",
      },
      {
        id: "F-MFA-09",
        title: "QR login from desktop",
        expected: "QR generated; mobile scan completes login; web polls status",
      },
    ],
  },

  // ════════════════════════ CATALOG & PRODUCT ════════════════════════
  {
    id: "shop",
    title: "2.1 Shop & Browse",
    group: "Catalog & Product",
    category: "frontend",
    tests: [
      {
        id: "F-SHOP-01",
        title: "Shop page builder sections render",
        expected: "Data-driven shop sections load (no broken blocks)",
      },
      {
        id: "F-SHOP-02",
        title: "Browse by category /category/[slug]",
        expected: "Only category products shown",
      },
      {
        id: "F-SHOP-03",
        title: "Browse by room (/by-room)",
        expected: "Room-specific products shown, nested slugs work",
      },
      {
        id: "F-SHOP-04",
        title: "Browse by brand (/by-brand)",
        expected: "Brand-filtered products + brand profile",
      },
      {
        id: "F-SHOP-05",
        title: "New arrivals & bestseller badges",
        expected: "Badges shown on qualifying products",
      },
      {
        id: "F-SHOP-06",
        title: "Pagination / load more",
        expected: "More products load without dupes",
      },
    ],
  },
  {
    id: "search",
    title: "2.2 Search",
    group: "Catalog & Product",
    category: "frontend",
    tests: [
      {
        id: "F-SRCH-01",
        title: "Search by keyword (/search)",
        expected: "Relevant results appear",
      },
      {
        id: "F-SRCH-02",
        title: "Live search suggestions",
        expected: "Suggestions appear as you type",
      },
      {
        id: "F-SRCH-03",
        title: "Search with no results",
        expected: '"No products found" message',
      },
      {
        id: "F-SRCH-04",
        title: "Recent searches saved",
        expected: "Recent searches listed; deletable",
      },
      {
        id: "F-SRCH-05",
        title: "Recommendations shown",
        expected: "Recommended products surface",
      },
    ],
  },
  {
    id: "product",
    title: "2.3 Product Detail",
    group: "Catalog & Product",
    category: "frontend",
    tests: [
      {
        id: "F-PROD-01",
        title: "Product detail loads (/product/[slug])",
        expected: "Correct name, price, images",
      },
      {
        id: "F-PROD-02",
        title: "Image gallery thumbnail/swipe",
        expected: "Main image changes on select",
      },
      {
        id: "F-PROD-03",
        title: "Variant selection (color/style/size/SKU)",
        expected: "Price & stock update per variant",
      },
      {
        id: "F-PROD-04",
        title: "Out of stock product",
        expected: '"Out of Stock", Add to Cart disabled',
      },
      {
        id: "F-PROD-05",
        title: "Reviews & Q&A section",
        expected: "Ratings, comments, questions shown",
      },
      {
        id: "F-PROD-06",
        title: "Brand card metrics",
        expected: "Rating, products, chat perf, joined date shown",
      },
      {
        id: "F-PROD-07",
        title: "Related / Complete the Look",
        expected: "Bundle / related items render",
      },
      {
        id: "F-PROD-08",
        title: "Sticky Add to Cart",
        expected: "Sticky CTA visible on scroll, adds item",
      },
      {
        id: "F-PROD-09",
        title: "Share product",
        expected: "Share sheet / copy link works",
      },
      {
        id: "F-PROD-10",
        title: "Live viewer heartbeat",
        expected: "Viewer count tracked without errors",
      },
    ],
  },
  {
    id: "wishlist",
    title: "2.4 Wishlist",
    group: "Catalog & Product",
    category: "frontend",
    tests: [
      {
        id: "F-WL-01",
        title: "Add to wishlist",
        expected: "Heart fills, item added",
      },
      {
        id: "F-WL-02",
        title: "Remove from wishlist",
        expected: "Item removed, heart unfills",
      },
      {
        id: "F-WL-03",
        title: "Wishlist page lists items",
        expected: "All saved items shown",
      },
      {
        id: "F-WL-04",
        title: "Guest wishlist",
        expected: "Wishlist persists for guest; merges on login",
      },
    ],
  },

  // ════════════════════════ CART & CHECKOUT ════════════════════════
  {
    id: "cart",
    title: "3.1 Cart",
    group: "Cart & Checkout",
    category: "frontend",
    tests: [
      {
        id: "F-CART-01",
        title: "View cart with items",
        expected: "Items with qty, variant & price listed",
      },
      {
        id: "F-CART-02",
        title: "Increase item quantity",
        expected: "Qty updates, subtotal recalculates",
      },
      {
        id: "F-CART-03",
        title: "Decrease — cannot go below 1",
        expected: "Min qty enforced at 1",
      },
      {
        id: "F-CART-04",
        title: "Change variant in cart",
        expected: "Item variant updates, price adjusts",
      },
      {
        id: "F-CART-05",
        title: "Remove item from cart",
        expected: "Item removed, total updates",
      },
      {
        id: "F-CART-06",
        title: "Empty cart state",
        expected: '"Your cart is empty" message',
      },
      {
        id: "F-CART-07",
        title: "Cart badge updates on add",
        expected: "Header cart count increments",
      },
    ],
  },
  {
    id: "checkout",
    title: "3.2 Checkout",
    group: "Cart & Checkout",
    category: "frontend",
    tests: [
      {
        id: "F-CHK-01",
        title: "Customer info / PH address",
        expected: "Region→province→city→barangay cascade saves",
      },
      {
        id: "F-CHK-02",
        title: "Missing checkout fields",
        expected: "Field-level validation errors",
      },
      {
        id: "F-CHK-03",
        title: "Shipping fee displayed",
        expected: "Correct rate shown before confirm",
      },
      {
        id: "F-CHK-04",
        title: "Apply valid voucher",
        expected: "Discount applied to total",
      },
      {
        id: "F-CHK-05",
        title: "Invalid voucher rejected",
        expected: '"Invalid or expired voucher"',
      },
      {
        id: "F-CHK-06",
        title: "e-GC balance deduction",
        expected: "e-GC applied, remaining balance correct",
      },
      {
        id: "F-CHK-07",
        title: "Order summary totals",
        expected: "Subtotal + shipping − discount = total; PV shown",
      },
    ],
  },
  {
    id: "payment",
    title: "3.3 Payment (PayMongo)",
    group: "Cart & Checkout",
    category: "frontend",
    tests: [
      {
        id: "F-PAY-01",
        title: "GCash payment — success",
        expected: "Redirect to /checkout/success, order paid",
      },
      {
        id: "F-PAY-02",
        title: "Maya payment — success",
        expected: "Payment completes, success page",
      },
      {
        id: "F-PAY-03",
        title: "Online Banking (BDO) payment",
        expected: "Bank provider flow completes",
      },
      {
        id: "F-PAY-04",
        title: "Card (3DS) payment — success",
        expected: "3DS challenge passes, order paid",
      },
      {
        id: "F-PAY-05",
        title: "Payment failed/cancelled",
        expected: "Redirect to /checkout/failed",
      },
    ],
  },

  // ════════════════════════ ORDERS & TRACKING ════════════════════════
  {
    id: "orders",
    title: "4.1 Orders",
    group: "Orders & Tracking",
    category: "frontend",
    tests: [
      {
        id: "F-ORD-01",
        title: "Orders list with status filter",
        expected: "All orders, filter by status works",
      },
      {
        id: "F-ORD-02",
        title: "Status badges color-coded",
        expected: "pending/processing/packed/shipped/delivered styled",
      },
      {
        id: "F-ORD-03",
        title: "Order detail view",
        expected: "Items, totals, address accurate",
      },
      {
        id: "F-ORD-04",
        title: "Empty orders state",
        expected: '"No orders yet" for new accounts',
      },
      {
        id: "F-ORD-05",
        title: "Confirm order receipt",
        expected: "Order marked received",
      },
      {
        id: "F-ORD-06",
        title: "Request refund",
        expected: "Refund request submitted, status updates",
      },
    ],
  },
  {
    id: "track",
    title: "4.2 Guest Order Tracking",
    group: "Orders & Tracking",
    category: "frontend",
    tests: [
      {
        id: "F-TRK-01",
        title: "Track order by number + email",
        expected: "Correct order status returned",
      },
      {
        id: "F-TRK-02",
        title: "Tracking timeline shown",
        expected: "Shipping events listed in order",
      },
      {
        id: "F-TRK-03",
        title: "Invalid order number",
        expected: '"Order not found" message',
      },
    ],
  },

  // ════════════════════════ PROFILE & KYC ════════════════════════
  {
    id: "profile",
    title: "5.1 Profile",
    group: "Profile & KYC",
    category: "frontend",
    tests: [
      {
        id: "F-PROF-01",
        title: "View profile page",
        expected: "Name, email, tier, wallets shown",
      },
      {
        id: "F-PROF-02",
        title: "Edit profile info saves",
        expected: "Changes saved, success toast",
      },
      {
        id: "F-PROF-03",
        title: "Avatar upload + crop",
        expected: "Crop modal works, avatar updates in nav",
      },
      {
        id: "F-PROF-04",
        title: "Change password from profile",
        expected: "Password changed, session stays",
      },
      {
        id: "F-PROF-05",
        title: "Wrong old password rejected",
        expected: '"Current password is incorrect"',
      },
    ],
  },
  {
    id: "tier",
    title: "5.2 Tier & Level-Up",
    group: "Profile & KYC",
    category: "frontend",
    tests: [
      {
        id: "F-TIER-01",
        title: "Tier badge shown (5 tiers)",
        expected: "Current tier Home Starter→Lifestyle Elite",
      },
      {
        id: "F-TIER-02",
        title: "Level-up progress page",
        expected: "PV & referral requirements + progress shown",
      },
      {
        id: "F-TIER-03",
        title: "Tier requirements accurate",
        expected: "Thresholds match backend config",
      },
    ],
  },
  {
    id: "kyc",
    title: "5.3 KYC / Verification",
    group: "Profile & KYC",
    category: "frontend",
    tests: [
      {
        id: "F-KYC-01",
        title: "KYC submission (/verification/submit)",
        expected: "Docs upload, status → Pending Review",
      },
      {
        id: "F-KYC-02",
        title: "Missing document validation",
        expected: "Error on missing required files",
      },
      {
        id: "F-KYC-03",
        title: "KYC status check",
        expected: "pending/approved/rejected shown correctly",
      },
    ],
  },
  {
    id: "security",
    title: "5.4 Account Security",
    group: "Profile & KYC",
    category: "frontend",
    tests: [
      {
        id: "F-SEC-01",
        title: "Active sessions list",
        expected: "All sessions with device/time shown",
      },
      {
        id: "F-SEC-02",
        title: "Revoke a session",
        expected: "Session revoked, that token invalid",
      },
      {
        id: "F-SEC-03",
        title: "Linked accounts (Google/FB)",
        expected: "Link/unlink reflects correctly",
      },
      {
        id: "F-SEC-04",
        title: "Username change via OTP",
        expected: "OTP sent, change submitted for review",
      },
      {
        id: "F-SEC-05",
        title: "Activity / login history",
        expected: "Logins, purchases, wallet history shown",
      },
    ],
  },

  // ════════════════════════ REWARDS & MLM ════════════════════════
  {
    id: "wallet",
    title: "6.1 Wallet",
    group: "Rewards & MLM",
    category: "frontend",
    tests: [
      {
        id: "F-RWD-01",
        title: "Rewards wallet balance",
        expected: "Cashback/commission balance shown",
      },
      {
        id: "F-RWD-02",
        title: "PV wallet",
        expected: "Point Value balance & history shown",
      },
      {
        id: "F-RWD-03",
        title: "e-GC balance",
        expected: "e-Gift Card balance shown, usable at checkout",
      },
      {
        id: "F-RWD-04",
        title: "Wallet transaction history",
        expected: "Credits & debits with dates",
      },
    ],
  },
  {
    id: "network",
    title: "6.2 Referral & Network",
    group: "Rewards & MLM",
    category: "frontend",
    tests: [
      {
        id: "F-NET-01",
        title: "Referral tree (unilevel)",
        expected: "Downline tree renders, pagination works",
      },
      {
        id: "F-NET-02",
        title: "Referral link copy",
        expected: "Unique URL copies to clipboard",
      },
      {
        id: "F-NET-03",
        title: "Referral landing /ref/[code]",
        expected: "Public page pre-fills referral on signup",
      },
      {
        id: "F-NET-04",
        title: "Network earnings view",
        expected: "Commission from downline shown",
      },
      {
        id: "F-NET-05",
        title: "Ranking leaderboard (/ranking)",
        expected: "Top members & tiers shown",
      },
    ],
  },
  {
    id: "encash",
    title: "6.3 Encashment",
    group: "Rewards & MLM",
    category: "frontend",
    tests: [
      {
        id: "F-ENC-01",
        title: "Add payout method",
        expected: "Bank/e-wallet payout saved",
      },
      {
        id: "F-ENC-02",
        title: "Submit encashment request",
        expected: "Request created, status Pending",
      },
      {
        id: "F-ENC-03",
        title: "Insufficient balance",
        expected: '"Insufficient balance" error',
      },
      {
        id: "F-ENC-04",
        title: "Request history & statuses",
        expected: "pending/approved/released/rejected shown",
      },
      {
        id: "F-ENC-05",
        title: "Create affiliate voucher",
        expected: "Voucher generated from wallet",
      },
      {
        id: "F-ENC-06",
        title: "KYC required before payout",
        expected: "Verification prompted if not yet verified",
      },
    ],
  },

  // ════════════════════════ ADMIN PANEL ════════════════════════
  {
    id: "admin-auth",
    title: "7.1 Admin Auth & Dashboard",
    group: "Admin Panel",
    category: "frontend",
    tests: [
      {
        id: "F-ADM-01",
        title: "Admin login (/admin/login)",
        expected: "Valid admin logs in, session created",
      },
      {
        id: "F-ADM-02",
        title: "Admin 2FA OTP",
        expected: "OTP prompt before access when required",
      },
      {
        id: "F-ADM-03",
        title: "Non-admin access blocked",
        expected: "Customer redirected / 403 on /admin/*",
      },
      {
        id: "F-ADM-04",
        title: "Dashboard metrics & charts",
        expected: "Orders, revenue, members charts populate",
      },
      {
        id: "F-ADM-05",
        title: "Banned admin blocked",
        expected: '"Account suspended" on login',
      },
    ],
  },
  {
    id: "admin-products",
    title: "7.2 Admin — Products",
    group: "Admin Panel",
    category: "frontend",
    tests: [
      {
        id: "F-ADP-01",
        title: "Create product",
        expected: "Product appears in catalog",
      },
      {
        id: "F-ADP-02",
        title: "Edit product details",
        expected: "Updates reflected on storefront",
      },
      { id: "F-ADP-03", title: "Delete product", expected: "Product removed" },
      {
        id: "F-ADP-04",
        title: "Brands & categories CRUD",
        expected: "Brand/category create/edit/delete works",
      },
      {
        id: "F-ADP-05",
        title: "Inventory / stock update",
        expected: "Stock changes reflect on product",
      },
      {
        id: "F-ADP-06",
        title: "Reviews moderation",
        expected: "Delete/approve review works",
      },
      {
        id: "F-ADP-07",
        title: "CSV import + image import",
        expected: "Bulk products imported per tutorial",
      },
      {
        id: "F-ADP-08",
        title: "Bulk price update preview/apply",
        expected: "Preview correct, apply updates prices",
      },
      {
        id: "F-ADP-09",
        title: "ZQ supplier preview & import",
        expected: "ZQ products previewed, imported to local",
      },
    ],
  },
  {
    id: "admin-orders",
    title: "7.3 Admin — Orders & Shipping",
    group: "Admin Panel",
    category: "frontend",
    tests: [
      {
        id: "F-ADO-01",
        title: "Orders list + status filter",
        expected: "Filtered orders shown",
      },
      {
        id: "F-ADO-02",
        title: "Approve / reject order",
        expected: "Status updates, customer notified",
      },
      {
        id: "F-ADO-03",
        title: "Update order / shipment status",
        expected: "Status + fulfillment mode updates",
      },
      {
        id: "F-ADO-04",
        title: "Book JNT shipment",
        expected: "Tracking number returned, label/waybill",
      },
      {
        id: "F-ADO-05",
        title: "Book XDE shipment + waybill",
        expected: "XDE booking + waybill/EPOD accessible",
      },
      {
        id: "F-ADO-06",
        title: "Push order to ZQ supplier",
        expected: "Order pushed, ZQ detail/tracking syncs",
      },
    ],
  },
  {
    id: "admin-members",
    title: "7.4 Admin — Members & KYC",
    group: "Admin Panel",
    category: "frontend",
    tests: [
      {
        id: "F-ADM-06",
        title: "Member search",
        expected: "Correct member by name/email",
      },
      {
        id: "F-ADM-07",
        title: "Approve / reject KYC",
        expected: "Status changes, member notified",
      },
      {
        id: "F-ADM-08",
        title: "Tiers management",
        expected: "Tier create/edit/assign works",
      },
      {
        id: "F-ADM-09",
        title: "Referral tree / network view",
        expected: "Admin sees member downline",
      },
      {
        id: "F-ADM-10",
        title: "Assign sponsor / temp password",
        expected: "Sponsor reassigned; temp password generated",
      },
      {
        id: "F-ADM-11",
        title: "Top earners & exports",
        expected: "Leaderboard + email/data export work",
      },
    ],
  },
  {
    id: "admin-finance",
    title: "7.5 Admin — Finance & Encashment",
    group: "Admin Panel",
    category: "frontend",
    tests: [
      {
        id: "F-ADF-01",
        title: "Approve encashment",
        expected: "Status approved, queued for release",
      },
      {
        id: "F-ADF-02",
        title: "Reject encashment",
        expected: "Rejected, balance restored, notified",
      },
      {
        id: "F-ADF-03",
        title: "Release / disburse payout",
        expected: "Wallet debited, marked released",
      },
      {
        id: "F-ADF-04",
        title: "Gift card (e-GC) issuance",
        expected: "e-GC issued & tracked",
      },
      {
        id: "F-ADF-05",
        title: "Payments / e-wallet overview",
        expected: "Transactions & balances shown",
      },
      {
        id: "F-ADF-06",
        title: "Accounting / reconciliation",
        expected: "Reconcile, invoices, reports load",
      },
    ],
  },
  {
    id: "admin-content",
    title: "7.6 Admin — Content & Comms",
    group: "Admin Panel",
    category: "frontend",
    tests: [
      {
        id: "F-ADC-01",
        title: "Email blast send",
        expected: "Campaign sent to recipient list",
      },
      {
        id: "F-ADC-02",
        title: "SMS blast send",
        expected: "SMS sent to recipients",
      },
      {
        id: "F-ADC-03",
        title: "Chat / conversation management",
        expected: "Assign agent, reply, close works",
      },
      {
        id: "F-ADC-04",
        title: "Webpages / CMS edit",
        expected: "Web page content publishes to storefront",
      },
      {
        id: "F-ADC-05",
        title: "Interior requests + inquiries",
        expected: "Requests viewable, updatable",
      },
    ],
  },

  // ════════════════════════ SUPPLIER PORTAL ════════════════════════
  {
    id: "sup-auth",
    title: "8.1 Supplier Auth",
    group: "Supplier Portal",
    category: "frontend",
    tests: [
      {
        id: "F-SUP-01",
        title: "Supplier login (/supplier/login)",
        expected: "Valid supplier user logs in",
      },
      {
        id: "F-SUP-02",
        title: "Supplier forgot/reset password",
        expected: "Reset email → password updated",
      },
      {
        id: "F-SUP-03",
        title: "Supplier 2FA OTP",
        expected: "OTP prompt + resend works",
      },
      {
        id: "F-SUP-04",
        title: "Supplier invite accept",
        expected: "Invited user onboards via token",
      },
    ],
  },
  {
    id: "sup-catalog",
    title: "8.2 Supplier Catalog & Pricing",
    group: "Supplier Portal",
    category: "frontend",
    tests: [
      {
        id: "F-SUP-05",
        title: "Supplier products list",
        expected: "Supplier-scoped products shown",
      },
      {
        id: "F-SUP-06",
        title: "ZQ fetch preview & sync",
        expected: "ZQ products previewed, synced to cache",
      },
      {
        id: "F-SUP-07",
        title: "ZQ category mappings",
        expected: "External→local category mapping saves",
      },
      {
        id: "F-SUP-08",
        title: "Edit variant pricing",
        expected: "Per-variant price updates (EditZqPricingModal)",
      },
      {
        id: "F-SUP-09",
        title: "Bulk pricing update",
        expected: "Bulk price change applies correctly",
      },
      {
        id: "F-SUP-10",
        title: "Inventory by SKU",
        expected: "ZQ inventory reflects per SKU",
      },
    ],
  },
  {
    id: "sup-ops",
    title: "8.3 Supplier Orders & Ops",
    group: "Supplier Portal",
    category: "frontend",
    tests: [
      {
        id: "F-SUP-11",
        title: "Supplier orders list",
        expected: "Fulfillment orders shown",
      },
      {
        id: "F-SUP-12",
        title: "Update fulfillment & tracking",
        expected: "Status + tracking number saved",
      },
      {
        id: "F-SUP-13",
        title: "Approve & push to ZQ",
        expected: "Order approved, pushed to ZQ",
      },
      {
        id: "F-SUP-14",
        title: "Warehouse CRUD",
        expected: "Create/edit/delete warehouse works",
      },
      {
        id: "F-SUP-15",
        title: "Team users management",
        expected: "Add/edit/remove supplier users",
      },
      {
        id: "F-SUP-16",
        title: "Reports",
        expected: "Sales/inventory reports load",
      },
    ],
  },
  {
    id: "sup-chat",
    title: "8.4 Supplier Chat & Notifs",
    group: "Supplier Portal",
    category: "frontend",
    tests: [
      {
        id: "F-SUP-17",
        title: "Supplier ↔ admin chat",
        expected: "Send/receive, react, delete message",
      },
      {
        id: "F-SUP-18",
        title: "Presence heartbeat",
        expected: "Online presence updates",
      },
      {
        id: "F-SUP-19",
        title: "Push notification to customers",
        expected: "Notification sent, history recorded",
      },
    ],
  },

  // ════════════════════════ PARTNER / STOREFRONT ════════════════════════
  {
    id: "partner",
    title: "9.1 Partner Portal",
    group: "Partner / Storefront",
    category: "frontend",
    tests: [
      {
        id: "F-PTR-01",
        title: "Partner login (/partner/login)",
        expected: "Partner user logs in",
      },
      {
        id: "F-PTR-02",
        title: "Partner webpages management",
        expected: "Storefront pages editable",
      },
      {
        id: "F-PTR-03",
        title: "Partner storefront renders (/[partner])",
        expected: "Slug storefront loads correctly",
      },
    ],
  },
  {
    id: "partner-renew",
    title: "9.2 Storefront Renewal & Requests",
    group: "Partner / Storefront",
    category: "frontend",
    tests: [
      {
        id: "F-PTR-04",
        title: "Storefront renewal flow (NEW)",
        expected: "/partner/webpages/renewal renews expired storefront",
      },
      {
        id: "F-PTR-05",
        title: "Webstore request submit",
        expected: "Request created with details",
      },
      {
        id: "F-PTR-06",
        title: "Upload payment receipt",
        expected: "Receipt uploaded, pending review",
      },
      {
        id: "F-PTR-07",
        title: "Renewal payment session",
        expected: "PayMongo session completes, request paid",
      },
      {
        id: "F-PTR-08",
        title: "Sync partner account",
        expected: "Approved request syncs partner access",
      },
    ],
  },

  // ════════════════════════ SUPPORT & CONTENT ════════════════════════
  {
    id: "chat",
    title: "10.1 Chat & AI Support",
    group: "Support & Content",
    category: "frontend",
    tests: [
      {
        id: "F-CHT-01",
        title: "AI support chat",
        expected: "AI responds to queries (ai-support)",
      },
      {
        id: "F-CHT-02",
        title: "Live chat with CSR",
        expected: "Customer can open/close conversation",
      },
      {
        id: "F-CHT-03",
        title: "Unread badge",
        expected: "Unread count shows on header",
      },
      {
        id: "F-CHT-04",
        title: "Realtime message delivery",
        expected: "Pusher delivers new messages live",
      },
    ],
  },
  {
    id: "content",
    title: "10.2 Content Pages",
    group: "Support & Content",
    category: "frontend",
    tests: [
      {
        id: "F-CON-01",
        title: "Blog list & detail",
        expected: "/blog and /blog/[slug] render",
      },
      {
        id: "F-CON-02",
        title: "Assembly guides browse/search",
        expected: "PDFs listed by folder, searchable",
      },
      {
        id: "F-CON-03",
        title: "Interior services request",
        expected: "Request submitted from /interior-services",
      },
      {
        id: "F-CON-04",
        title: "Branches & FAQ pages",
        expected: "Branch list + FAQ render",
      },
      {
        id: "F-CON-05",
        title: "Legal pages",
        expected: "privacy/terms/cookie/income-disclaimer load",
      },
    ],
  },

  // ════════════════════════ BACKEND — AUTH API ════════════════════════
  {
    id: "b-auth",
    title: "11.1 Auth API",
    group: "Auth API",
    category: "backend",
    tests: [
      {
        id: "B-AUTH-01",
        title: "POST /auth/login — valid",
        expected: "200 token + user object",
      },
      {
        id: "B-AUTH-02",
        title: "POST /auth/login — wrong password",
        expected: "401/422 Unauthorized",
      },
      {
        id: "B-AUTH-03",
        title: "Login throttle (member-login 3/min)",
        expected: "429 after limit per IP+identifier",
      },
      {
        id: "B-AUTH-04",
        title: "POST /auth/register — valid (Turnstile)",
        expected: "201 user created, OTP sent",
      },
      {
        id: "B-AUTH-05",
        title: "POST /auth/mobile/register",
        expected: "201 without bot-check",
      },
      {
        id: "B-AUTH-06",
        title: "Register — duplicate email/username",
        expected: "422 field errors",
      },
      {
        id: "B-AUTH-07",
        title: "GET check-email / check-username",
        expected: "{available: true/false}",
      },
      {
        id: "B-AUTH-08",
        title: "GET check-referral",
        expected: "Valid/invalid referral resolved",
      },
      {
        id: "B-AUTH-09",
        title: "verify-otp / resend-otp",
        expected: "OTP verified; resend throttled (5/min)",
      },
      {
        id: "B-AUTH-10",
        title: "send-sms-otp / verify-sms-otp",
        expected: "SMS OTP issued & verified",
      },
      {
        id: "B-AUTH-11",
        title: "Login MFA status / respond / resend",
        expected: "2FA gate enforced on login",
      },
      {
        id: "B-AUTH-12",
        title: "forgot / verify-reset-otp / reset",
        expected: "Reset flow; no info leak on unknown email",
      },
      {
        id: "B-AUTH-13",
        title: "POST /auth/logout",
        expected: "200 token revoked",
      },
      {
        id: "B-AUTH-14",
        title: "Protected route after logout",
        expected: "401 Unauthenticated",
      },
      {
        id: "B-AUTH-15",
        title: "Passkey register options/verify",
        expected: "200 challenge + registration",
      },
      {
        id: "B-AUTH-16",
        title: "Passkey login options/verify",
        expected: "200 token on valid assertion",
      },
      {
        id: "B-AUTH-17",
        title: "TOTP setup / enable / disable",
        expected: "Secret issued, toggled correctly",
      },
      {
        id: "B-AUTH-18",
        title: "QR generate / status / complete",
        expected: "QR session lifecycle works",
      },
      {
        id: "B-AUTH-19",
        title: "Link / unlink social provider",
        expected: "Linked accounts updated",
      },
      {
        id: "B-AUTH-20",
        title: "Sessions list / revoke",
        expected: "Session listed; revoke invalidates token",
      },
      {
        id: "B-AUTH-21",
        title: "Username-change OTP / submit",
        expected: "Request created for admin review",
      },
    ],
  },
  // ════════════════════════ BACKEND — PRODUCT API ════════════════════════
  {
    id: "b-products",
    title: "12.1 Product & Category API",
    group: "Product API",
    category: "backend",
    tests: [
      {
        id: "B-PROD-01",
        title: "GET /products — list + filters",
        expected: "200 paginated; category/price filters work",
      },
      {
        id: "B-PROD-02",
        title: "GET /products/{id} & /summary",
        expected: "200 full detail / summary",
      },
      {
        id: "B-PROD-03",
        title: "GET /products/slug/{slug}",
        expected: "200 correct product",
      },
      {
        id: "B-PROD-04",
        title: "GET /products/{id}/reviews & /brand",
        expected: "200 reviews + brand",
      },
      {
        id: "B-PROD-05",
        title: "GET /products/cards",
        expected: "200 card-format list",
      },
      {
        id: "B-PROD-06",
        title: "GET /products/99999 — not found",
        expected: "404 Not Found",
      },
      {
        id: "B-PROD-07",
        title: "GET /categories, /rooms, /product-brands",
        expected: "200 taxonomy lists",
      },
      {
        id: "B-PROD-08",
        title: "GET /search, /search/live, /recommendations",
        expected: "200 relevant results",
      },
      {
        id: "B-PROD-09",
        title: "GET /meilisearch/search",
        expected: "200 indexed results",
      },
      {
        id: "B-PROD-10",
        title: "GET /products/zq/cached",
        expected: "200 cached ZQ products",
      },
      {
        id: "B-PROD-11",
        title: "Admin POST/PUT/DELETE /admin/products",
        expected: "CRUD success",
      },
      {
        id: "B-PROD-12",
        title: "Customer on /admin/products",
        expected: "403 Forbidden",
      },
    ],
  },
  // ════════════════════════ BACKEND — CART & CHECKOUT API ════════════════════════
  {
    id: "b-cart",
    title: "13.1 Cart, Wishlist & Payment API",
    group: "Cart & Checkout API",
    category: "backend",
    tests: [
      {
        id: "B-CART-01",
        title: "POST /cart/add & /cart/bulk-add",
        expected: "200 cart updated",
      },
      {
        id: "B-CART-02",
        title: "Add out-of-stock / exceed stock",
        expected: "422 stock error",
      },
      {
        id: "B-CART-03",
        title: "GET /cart; PUT /cart/{id}; variant",
        expected: "200 qty/variant updated",
      },
      {
        id: "B-CART-04",
        title: "DELETE /cart/{id}; DELETE /cart",
        expected: "200 item removed / cleared",
      },
      {
        id: "B-CART-05",
        title: "Wishlist add/remove/get/count",
        expected: "200; duplicate idempotent",
      },
      { id: "B-CART-06", title: "Cart unauthenticated", expected: "401" },
      {
        id: "B-PAY-01",
        title: "POST /payments/checkout-session",
        expected: "200 PayMongo session URL (throttle 20/min)",
      },
      {
        id: "B-PAY-02",
        title: "GET checkout-session/{id}",
        expected: "200 session status",
      },
      {
        id: "B-PAY-03",
        title: "validate-voucher valid/invalid",
        expected: "200 discount / 422 invalid",
      },
      {
        id: "B-PAY-04",
        title: "Checkout — empty cart / unauth",
        expected: "422 empty / 401 unauth",
      },
      {
        id: "B-PAY-05",
        title: "Mobile payments create/status",
        expected: "200 mobile payment lifecycle",
      },
    ],
  },
  // ════════════════════════ BACKEND — ORDERS & SHIPPING API ════════════════════════
  {
    id: "b-orders",
    title: "14.1 Orders & Shipping API",
    group: "Orders & Shipping API",
    category: "backend",
    tests: [
      {
        id: "B-ORD-01",
        title: "GET /orders/history & /counts",
        expected: "200 orders + status counts",
      },
      {
        id: "B-ORD-02",
        title: "POST /orders/{id}/confirm & /refund",
        expected: "200 confirmed / refund requested",
      },
      {
        id: "B-ORD-03",
        title: "GET /orders/track (guest)",
        expected: "200 tracking by order+email",
      },
      {
        id: "B-ORD-04",
        title: "IDOR — another user order",
        expected: "403 Forbidden",
      },
      {
        id: "B-ORD-05",
        title: "Admin orders list/counts/status",
        expected: "200; status update works",
      },
      {
        id: "B-ORD-06",
        title: "Admin approve/reject/fulfillment",
        expected: "200 transitions valid",
      },
      {
        id: "B-SHP-01",
        title: "JNT book / track",
        expected: "200 booking + tracking events",
      },
      {
        id: "B-SHP-02",
        title: "XDE book / track / waybill / epod",
        expected: "200 booking, waybill & POD",
      },
      {
        id: "B-SHP-03",
        title: "XDE cancel + reasons/ports",
        expected: "200 cancel with valid reason",
      },
      {
        id: "B-SHP-04",
        title: "Shipping rates CRUD + public",
        expected: "Admin CRUD; public rate read",
      },
      {
        id: "B-SHP-05",
        title: "ZQ push / detail / tracking",
        expected: "200 order pushed & synced",
      },
    ],
  },
  // ════════════════════════ BACKEND — MEMBER & MLM API ════════════════════════
  {
    id: "b-mlm",
    title: "15.1 Member, Commission & Encashment API",
    group: "Member & MLM API",
    category: "backend",
    tests: [
      {
        id: "B-MEM-01",
        title: "GET /account/snapshot",
        expected: "200 tier, PV, wallet summary",
      },
      {
        id: "B-MEM-02",
        title: "GET /referral-tree",
        expected: "200 downline tree",
      },
      {
        id: "B-MEM-03",
        title: "PV credited after purchase",
        expected: "PV added to ledger",
      },
      {
        id: "B-MEM-04",
        title: "Cashback credited (e-GC)",
        expected: "Cashback to wallet on purchase",
      },
      {
        id: "B-MEM-05",
        title: "Unilevel commission to upline",
        expected: "Upline wallet credited on downline buy",
      },
      {
        id: "B-MEM-06",
        title: "Tier promotion on threshold",
        expected: "Tier auto-upgraded",
      },
      {
        id: "B-MEM-07",
        title: "public community-stats / top-members",
        expected: "200 public stats (throttled)",
      },
      {
        id: "B-ENC-01",
        title: "GET /encashment/wallet",
        expected: "200 balance, ledger, vouchers, unilevel",
      },
      {
        id: "B-ENC-02",
        title: "POST /encashment/requests",
        expected: "201 request created",
      },
      {
        id: "B-ENC-03",
        title: "Insufficient / below-min",
        expected: "422 validation error",
      },
      {
        id: "B-ENC-04",
        title: "Payout methods add/remove",
        expected: "200 managed",
      },
      {
        id: "B-ENC-05",
        title: "Admin approve/reject/release",
        expected: "200; wallet debited on release",
      },
      {
        id: "B-ENC-06",
        title: "Member tiers CRUD (admin)",
        expected: "200 tier management",
      },
      {
        id: "B-ENC-07",
        title: "Admin members stats/assign-sponsor",
        expected: "200; sponsor reassigned",
      },
    ],
  },
  // ════════════════════════ BACKEND — SUPPLIER & PARTNER API ════════════════════════
  {
    id: "b-supplier",
    title: "16.1 Supplier & Partner API",
    group: "Supplier & Partner API",
    category: "backend",
    tests: [
      {
        id: "B-SUP-01",
        title: "Supplier login / forgot / reset",
        expected: "200 with throttle:auth",
      },
      {
        id: "B-SUP-02",
        title: "supplier.actor guard",
        expected: "Non-supplier → 403",
      },
      {
        id: "B-SUP-03",
        title: "Supplier warehouse CRUD",
        expected: "200 scoped to supplier",
      },
      {
        id: "B-SUP-04",
        title: "Supplier orders fulfillment/tracking",
        expected: "200 updates",
      },
      {
        id: "B-SUP-05",
        title: "Supplier ZQ pricing (variant/bulk)",
        expected: "200 pricing saved",
      },
      {
        id: "B-SUP-06",
        title: "Supplier chat send/react/delete",
        expected: "200 message ops",
      },
      {
        id: "B-SUP-07",
        title: "Supplier push notifications",
        expected: "200 send + history",
      },
      {
        id: "B-PTR-01",
        title: "Admin suppliers CRUD + stats",
        expected: "200 supplier management",
      },
      {
        id: "B-PTR-02",
        title: "Admin supplier-users / partner-users",
        expected: "200 user CRUD (role-gated)",
      },
      {
        id: "B-PTR-03",
        title: "Webstore-requests submit/receipt/pay",
        expected: "201 request + payment session",
      },
      {
        id: "B-PTR-04",
        title: "Admin partner webstore-requests",
        expected: "200 approve/reject + receipt review",
      },
    ],
  },
  // ════════════════════════ BACKEND — WEBHOOKS & INTEGRATIONS ════════════════════════
  {
    id: "b-webhooks",
    title: "17.1 Webhooks & Integrations",
    group: "Webhooks & Integrations",
    category: "backend",
    tests: [
      {
        id: "B-WH-01",
        title: "PayMongo success webhook",
        expected: "200 order marked paid",
      },
      {
        id: "B-WH-02",
        title: "PayMongo failed webhook",
        expected: "200 order marked failed",
      },
      {
        id: "B-WH-03",
        title: "PayMongo invalid signature",
        expected: "400/401 signature rejected",
      },
      {
        id: "B-WH-04",
        title: "Webhook idempotency",
        expected: "Duplicate webhook → no double records",
      },
      {
        id: "B-WH-05",
        title: "JNT trackback / order-status (prod+sandbox)",
        expected: "200 shipping status updated",
      },
      {
        id: "B-WH-06",
        title: "FCM / Expo / OneSignal register+send",
        expected: "200 push delivered",
      },
      {
        id: "B-WH-07",
        title: "Pusher / broadcasting auth",
        expected: "200 authorized channels only",
      },
      {
        id: "B-WH-08",
        title: "Gemini / AI support endpoints",
        expected: "200 AI response (throttled)",
      },
      {
        id: "B-WH-09",
        title: "Meilisearch admin sync",
        expected: "200 products synced/cleared (admin only)",
      },
    ],
  },
  // ════════════════════════ BACKEND — SECURITY & RATE LIMITING ════════════════════════
  {
    id: "b-security",
    title: "18.1 Security & Rate Limiting",
    group: "Security & Rate Limiting",
    category: "backend",
    tests: [
      {
        id: "B-SECU-01",
        title: "SQL injection on login",
        expected: "422/safe — no data leak",
      },
      {
        id: "B-SECU-02",
        title: "XSS payload in profile name",
        expected: "Output escaped/sanitized",
      },
      {
        id: "B-SECU-03",
        title: "Tampered / expired Sanctum token",
        expected: "401 Unauthenticated",
      },
      {
        id: "B-SECU-04",
        title: "customer.actor / admin.actor / supplier.actor",
        expected: "Wrong actor → 403",
      },
      {
        id: "B-SECU-05",
        title: "admin.role enforcement",
        expected: "Role without permission → 403",
      },
      {
        id: "B-SECU-06",
        title: "IDOR — order & wallet of another user",
        expected: "403 Forbidden",
      },
      {
        id: "B-SECU-07",
        title: "Rate-limit buckets enforced",
        expected: "429 on auth/otp/checkout/public limits",
      },
      {
        id: "B-SECU-08",
        title: "admin.token.validation (revoked)",
        expected: "Revoked admin token → 401",
      },
      {
        id: "B-SECU-09",
        title: "Turnstile bypass attempt",
        expected: '422 "CAPTCHA failed"',
      },
      {
        id: "B-SECU-10",
        title: "Password stored as hash",
        expected: "DB shows hash, not plaintext",
      },
      {
        id: "B-SECU-11",
        title: "No secrets in API response",
        expected: "No password/tokens leaked in payload",
      },
      {
        id: "B-SECU-12",
        title: "CORS + SecurityHeaders + AbuseGuard",
        expected: "Unknown origin blocked; headers present",
      },
    ],
  },

  // ════════════════════════ MOBILE / RESPONSIVE ════════════════════════
  {
    id: "mobile-auth",
    title: "19.1 Mobile — Auth Pages",
    group: "Mobile / Responsive",
    category: "frontend",
    tests: [
      {
        id: "M-AUTH-01",
        title: "[iPhone SE 375px] Login fits",
        expected: "No horizontal scroll, all fields visible",
      },
      {
        id: "M-AUTH-02",
        title: "[iPhone 14 390px] Login fits",
        expected: "CTA fully visible, no overflow",
      },
      {
        id: "M-AUTH-03",
        title: "[Samsung S21 360px] Login fits",
        expected: "All inputs/button accessible",
      },
      {
        id: "M-AUTH-04",
        title: "Keyboard pushes content up",
        expected: "Active input stays visible",
      },
      {
        id: "M-AUTH-05",
        title: "OTP numeric keyboard + autofocus",
        expected: "Numeric pad opens, digits autofocus",
      },
      {
        id: "M-AUTH-06",
        title: "Tap targets ≥ 44×44px",
        expected: "Buttons/links easy to tap",
      },
    ],
  },
  {
    id: "mobile-nav",
    title: "19.2 Mobile — Navigation",
    group: "Mobile / Responsive",
    category: "frontend",
    tests: [
      {
        id: "M-NAV-01",
        title: "Hamburger menu open/close",
        expected: "Menu slides smoothly",
      },
      {
        id: "M-NAV-02",
        title: "Nav closes after link tap",
        expected: "Menu auto-closes on navigate",
      },
      {
        id: "M-NAV-03",
        title: "Cart icon + badge visible",
        expected: "Cart count visible on mobile header",
      },
      {
        id: "M-NAV-04",
        title: "[Tablet 768px] tablet layout",
        expected: "Sidebar/tablet grid switches in",
      },
      {
        id: "M-NAV-05",
        title: "Safe-area insets (notch/home bar)",
        expected: "Content not hidden behind notch",
      },
    ],
  },
  {
    id: "mobile-shop",
    title: "19.3 Mobile — Product & Checkout",
    group: "Mobile / Responsive",
    category: "frontend",
    tests: [
      {
        id: "M-PROD-01",
        title: "2-col grid on phone / 3-col tablet",
        expected: "Grid adapts, no overflow",
      },
      {
        id: "M-PROD-02",
        title: "Product gallery swipeable",
        expected: "Swipe changes image",
      },
      {
        id: "M-PROD-03",
        title: "Variant buttons tappable",
        expected: "Size/color easy to tap",
      },
      {
        id: "M-CART-01",
        title: "Cart page fits screen",
        expected: "Items, totals, CTA visible",
      },
      {
        id: "M-CART-02",
        title: "PayMongo page on mobile",
        expected: "Card/GCash fields usable",
      },
      {
        id: "M-CART-03",
        title: "Success/failed pages readable",
        expected: "Confirmation readable on small screen",
      },
    ],
  },
  {
    id: "mobile-misc",
    title: "19.4 Mobile — Profile, Chat & PWA",
    group: "Mobile / Responsive",
    category: "frontend",
    tests: [
      {
        id: "M-PROF-01",
        title: "Profile & orders scroll",
        expected: "No layout break on scroll",
      },
      {
        id: "M-PROF-02",
        title: "KYC document upload",
        expected: "Camera/file picker opens",
      },
      {
        id: "M-CHAT-01",
        title: "Chat input above keyboard",
        expected: "Input not hidden when keyboard opens",
      },
      {
        id: "M-PWA-01",
        title: "Add to Home Screen / install",
        expected: "PWA install prompt works",
      },
      {
        id: "M-PWA-02",
        title: "Standalone mode",
        expected: "No browser bar, full-screen app",
      },
      {
        id: "M-PWA-03",
        title: "OAuth on iOS/Android",
        expected: "Google/FB OAuth completes on mobile browsers",
      },
      {
        id: "M-PWA-04",
        title: "Inputs ≥16px (no iOS auto-zoom)",
        expected: "No zoom-in on focus",
      },
    ],
  },
]

const ALL_TESTS: TestCase[] = SECTIONS.flatMap((s) =>
  s.tests.map((t) => ({
    ...t,
    sectionId: s.id,
    sectionTitle: s.title,
    group: s.group,
    category: s.category,
  }))
)

const COLUMNS: {
  id: TestStatus
  label: string
  color: string
  bg: string
  border: string
  dot: string
}[] = [
  {
    id: "pending",
    label: "Pending",
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800/60",
    border: "border-gray-200 dark:border-gray-700",
    dot: "bg-gray-400",
  },
  {
    id: "pass",
    label: "Pass",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  {
    id: "bug",
    label: "Bug",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  {
    id: "skip",
    label: "Skip",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
]

function StatusDropdown({
  status,
  onChange,
  onEditing,
}: {
  status: TestStatus
  onChange: (s: TestStatus) => void
  onEditing?: (active: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const col = COLUMNS.find((c) => c.id === status)!

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Let the board know this card is being touched while the picker is open.
  useEffect(() => {
    onEditing?.(open)
  }, [open, onEditing])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-all ${col.bg} ${col.color} ${col.border}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${col.dot}`} />
        {col.label}
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 w-32 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {COLUMNS.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onChange(c.id)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${c.id === status ? "bg-gray-50 dark:bg-gray-800" : ""}`}
            >
              <span className={`h-2 w-2 rounded-full ${c.dot}`} />
              <span className={c.color}>{c.label}</span>
              {c.id === status && (
                <svg
                  className="ml-auto h-3 w-3 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NoteEditor({
  note,
  status,
  onSave,
  onEditing,
}: {
  note: string
  status: TestStatus
  onSave: (note: string) => void
  onEditing?: (active: boolean) => void
}) {
  const isBug = status === "bug"
  const [draft, setDraft] = useState(note)
  // Auto-open for bugs or when a comment already exists; otherwise stay collapsed.
  const [open, setOpen] = useState(isBug || note.trim() !== "")

  useEffect(() => {
    setDraft(note)
  }, [note])
  useEffect(() => {
    if (isBug) setOpen(true)
  }, [isBug])

  const dirty = draft.trim() !== note.trim()

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-[10px] text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
      >
        + Add comment
      </button>
    )
  }

  return (
    <div className="mt-2.5">
      <div className="mb-1 flex items-center gap-1">
        <span
          className={`text-[9px] font-semibold tracking-wider uppercase ${isBug ? "text-red-500 dark:text-red-400" : "text-gray-400"}`}
        >
          {isBug ? "🐞 Bug notes" : "💬 Comment"}
        </span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => onEditing?.(true)}
        onBlur={() => onEditing?.(false)}
        rows={isBug ? 3 : 2}
        placeholder={
          isBug
            ? "What is the bug? How to reproduce? (steps, expected vs actual)…"
            : "Add a comment…"
        }
        className={`w-full resize-y rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed transition-colors focus:ring-2 focus:outline-none ${
          isBug
            ? "border-red-200 bg-red-50/60 placeholder-red-300 focus:ring-red-300 dark:border-red-800/60 dark:bg-red-900/10 dark:placeholder-red-700/70 dark:focus:ring-red-700"
            : "border-gray-200 bg-gray-50 placeholder-gray-400 focus:ring-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:focus:ring-gray-600"
        }`}
      />
      {dirty && (
        <div className="mt-1.5 flex items-center gap-2">
          <button
            onClick={() => onSave(draft.trim())}
            className="rounded-md bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-gray-900"
          >
            Save note
          </button>
          <button
            onClick={() => setDraft(note)}
            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

function TestCard({
  test,
  status,
  note,
  meta,
  editors,
  onChange,
  onSaveNote,
  onEditing,
}: {
  test: TestCase
  status: TestStatus
  note?: string
  meta?: StatusMeta
  editors?: string[]
  onChange: (s: TestStatus) => void
  onSaveNote: (note: string) => void
  onEditing?: (active: boolean) => void
}) {
  const isBug = status === "bug"
  const beingEdited = (editors?.length ?? 0) > 0
  return (
    <div
      className={`rounded-xl border bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900 ${
        beingEdited
          ? "border-sky-300 ring-2 ring-sky-200 dark:border-sky-700 dark:ring-sky-900/50"
          : isBug
            ? "border-red-200 dark:border-red-900/50"
            : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {beingEdited && (
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
          </span>
          <span className="truncate">
            {editors!.join(", ")} {editors!.length > 1 ? "are" : "is"} editing…
          </span>
        </div>
      )}
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="mt-0.5 shrink-0 font-mono text-[10px] text-gray-400 dark:text-gray-600">
          {test.id}
        </span>
        <StatusDropdown
          status={status}
          onChange={onChange}
          onEditing={onEditing}
        />
      </div>
      <p className="mb-2 text-sm leading-snug font-medium text-gray-800 dark:text-gray-200">
        {test.title}
      </p>
      <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-400 dark:text-gray-600">
        ✓ {test.expected}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-widest uppercase ${
            test.category === "frontend"
              ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
          }`}
        >
          {test.category === "frontend" ? "UI" : "API"}
        </span>
        <span className="truncate text-[10px] text-gray-400 dark:text-gray-600">
          {test.sectionTitle}
        </span>
        {meta?.updated_by && (
          <span className="ml-auto shrink-0 truncate text-[9px] text-gray-300 dark:text-gray-700">
            · {meta.updated_by}
          </span>
        )}
      </div>
      <NoteEditor
        note={note ?? ""}
        status={status}
        onSave={onSaveNote}
        onEditing={onEditing}
      />
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
]

function PresenceBar({
  members,
  myId,
}: {
  members: { id: string; name: string }[]
  myId: string | null
}) {
  if (members.length === 0) return null
  const shown = members.slice(0, 6)
  const extra = members.length - shown.length
  return (
    <div
      className="flex items-center gap-2"
      title={members
        .map((m) => m.name + (m.id === myId ? " (you)" : ""))
        .join(", ")}
    >
      <div className="flex -space-x-2">
        {shown.map((m, i) => (
          <span
            key={m.id}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900 ${AVATAR_COLORS[i % AVATAR_COLORS.length]} ${m.id === myId ? "ring-emerald-400 dark:ring-emerald-500" : ""}`}
            title={m.name + (m.id === myId ? " (you)" : "")}
          >
            {initials(m.name)}
          </span>
        ))}
        {extra > 0 && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 ring-2 ring-white dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-900">
            +{extra}
          </span>
        )}
      </div>
      <span className="hidden text-[11px] text-gray-400 sm:inline">
        {members.length} online
      </span>
    </div>
  )
}

export default function Testing() {
  const [statuses, setStatuses] = useState<Record<string, TestStatus>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [meta, setMeta] = useState<Record<string, StatusMeta>>({})
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>("all")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hydrate from the database (admin-gated BFF route).
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    ;(async () => {
      try {
        const res = await fetch("/api/qa/test-statuses", {
          cache: "no-store",
          signal: controller.signal,
        })
        // Session expired or not an admin — bounce to the admin login.
        if (res.status === 401) {
          window.location.href = "/admin/login?callbackUrl=/testing"
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!active) return
        const nextStatuses: Record<string, TestStatus> = {}
        const nextNotes: Record<string, string> = {}
        const nextMeta: Record<string, StatusMeta> = {}
        const rows = (data?.statuses ?? {}) as Record<
          string,
          {
            status: TestStatus
            note?: string | null
            updated_by?: string | null
            updated_at?: string | null
          }
        >
        for (const [id, row] of Object.entries(rows)) {
          if (row?.status) nextStatuses[id] = row.status
          if (row?.note) nextNotes[id] = row.note
          nextMeta[id] = {
            updated_by: row?.updated_by ?? null,
            updated_at: row?.updated_at ?? null,
          }
        }
        setStatuses(nextStatuses)
        setNotes(nextNotes)
        setMeta(nextMeta)
      } catch (e) {
        const reason = e instanceof Error ? e.message : "network error"
        if (active)
          setError(
            `Could not load QA records (${reason}). Is the backend running on :8000?`
          )
      } finally {
        clearTimeout(timeout)
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
      controller.abort()
      clearTimeout(timeout)
    }
  }, [])

  const setStatus = useCallback(
    async (id: string, status: TestStatus) => {
      const prev = statuses[id]
      setStatuses((s) => ({ ...s, [id]: status }))
      setSaving(true)
      setError(null)
      try {
        const res = await fetch("/api/qa/test-statuses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test_id: id, status }),
        })
        if (!res.ok) throw new Error("save failed")
        const data = await res.json()
        setMeta((m) => ({
          ...m,
          [id]: {
            updated_by: data?.updated_by ?? null,
            updated_at: data?.updated_at ?? null,
          },
        }))
      } catch {
        // Revert optimistic update on failure.
        setStatuses((s) => {
          const copy = { ...s }
          if (prev) copy[id] = prev
          else delete copy[id]
          return copy
        })
        setError("Failed to save to the database. Please try again.")
      } finally {
        setSaving(false)
      }
    },
    [statuses]
  )

  const saveNote = useCallback(
    async (id: string, note: string) => {
      const prev = notes[id] ?? ""
      setNotes((n) => ({ ...n, [id]: note }))
      setSaving(true)
      setError(null)
      try {
        const res = await fetch("/api/qa/test-statuses", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            test_id: id,
            status: statuses[id] ?? "pending",
            note,
          }),
        })
        if (!res.ok) throw new Error("save failed")
        const data = await res.json()
        setMeta((m) => ({
          ...m,
          [id]: {
            updated_by: data?.updated_by ?? null,
            updated_at: data?.updated_at ?? null,
          },
        }))
      } catch {
        setNotes((n) => ({ ...n, [id]: prev }))
        setError("Failed to save the comment. Please try again.")
      } finally {
        setSaving(false)
      }
    },
    [notes, statuses]
  )

  const resetAll = useCallback(async () => {
    if (
      !window.confirm(
        "Reset all QA statuses in the database? This cannot be undone."
      )
    )
      return
    const prevStatuses = statuses
    const prevNotes = notes
    const prevMeta = meta
    setStatuses({})
    setNotes({})
    setMeta({})
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/qa/test-statuses", { method: "DELETE" })
      if (!res.ok) throw new Error("reset failed")
    } catch {
      setStatuses(prevStatuses)
      setNotes(prevNotes)
      setMeta(prevMeta)
      setError("Failed to reset. Please try again.")
    } finally {
      setSaving(false)
    }
  }, [statuses, notes, meta])

  // ── Realtime collaboration (Pusher presence channel) ──
  // Tracks which card THIS browser is editing, so an incoming remote note
  // change never clobbers what the local tester is currently typing.
  const localEditingRef = useRef<string | null>(null)

  const applyRemote = useCallback((u: QaStatusUpdate) => {
    setStatuses((s) => ({ ...s, [u.test_id]: u.status }))
    setMeta((m) => ({
      ...m,
      [u.test_id]: {
        updated_by: u.updated_by ?? null,
        updated_at: u.updated_at ?? null,
      },
    }))
    if (localEditingRef.current !== u.test_id) {
      setNotes((n) => {
        const next = { ...n }
        if (u.note) next[u.test_id] = u.note
        else delete next[u.test_id]
        return next
      })
    }
  }, [])

  const applyReset = useCallback(() => {
    setStatuses({})
    setNotes({})
    setMeta({})
  }, [])

  const { members, myId, editorsByTest, setEditing } = useQaBoardRealtime({
    enabled: !loading,
    onStatusUpdate: applyRemote,
    onReset: applyReset,
  })

  const handleEditing = useCallback(
    (testId: string, active: boolean) => {
      if (active) {
        localEditingRef.current = testId
        setEditing(testId)
      } else if (localEditingRef.current === testId) {
        localEditingRef.current = null
        setEditing(null)
      }
    },
    [setEditing]
  )

  const groupsForCategory = useMemo(
    () =>
      GROUP_ORDER.filter((g) =>
        SECTIONS.some(
          (s) =>
            s.group === g &&
            (categoryFilter === "all" || s.category === categoryFilter)
        )
      ),
    [categoryFilter]
  )

  const filteredTests = useMemo(() => {
    const q = search.toLowerCase()
    return ALL_TESTS.filter((t) => {
      if (categoryFilter !== "all" && t.category !== categoryFilter)
        return false
      if (groupFilter !== "all" && t.group !== groupFilter) return false
      if (
        q &&
        !t.title.toLowerCase().includes(q) &&
        !t.id.toLowerCase().includes(q) &&
        !t.sectionTitle.toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [categoryFilter, groupFilter, search])

  const visibleGroups = useMemo(
    () => GROUP_ORDER.filter((g) => filteredTests.some((t) => t.group === g)),
    [filteredTests]
  )

  const getStatus = (id: string): TestStatus => statuses[id] ?? "pending"

  const totalCount = ALL_TESTS.length
  const passCount = ALL_TESTS.filter((t) => getStatus(t.id) === "pass").length
  const bugCount = ALL_TESTS.filter((t) => getStatus(t.id) === "bug").length
  const skipCount = ALL_TESTS.filter((t) => getStatus(t.id) === "skip").length
  const pendingCount = totalCount - passCount - bugCount - skipCount
  const progressPct =
    totalCount > 0
      ? Math.round(((passCount + skipCount) / totalCount) * 100)
      : 0

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
        <div className="mx-auto max-w-[1400px] space-y-3 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                QA Testing Board
              </h1>
              <p className="mt-0.5 text-xs text-gray-400">
                Apsara Home · {totalCount} test cases
                {saving && (
                  <span className="ml-2 text-emerald-500">· Saving…</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <PresenceBar members={members} myId={myId} />
              <button
                onClick={resetAll}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              >
                Reset all
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Stats chips */}
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "Total",
                value: totalCount,
                cls: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
              },
              {
                label: "Pass",
                value: passCount,
                cls: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
              },
              {
                label: "Bug",
                value: bugCount,
                cls: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400",
              },
              {
                label: "Skip",
                value: skipCount,
                cls: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
              },
              {
                label: "Pending",
                value: pendingCount,
                cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
              },
            ].map((s) => (
              <span
                key={s.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}
              >
                {s.value} {s.label}
              </span>
            ))}
            <span className="ml-auto self-center text-xs text-gray-400">
              {progressPct}% done
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Category toggle + search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-medium dark:border-gray-700">
              {(["all", "frontend", "backend"] as FilterCategory[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setCategoryFilter(f)
                    setGroupFilter("all")
                  }}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    categoryFilter === f
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "frontend"
                      ? "Frontend"
                      : "Backend"}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search test cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs placeholder-gray-400 focus:ring-2 focus:ring-gray-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:focus:ring-gray-600"
            />
          </div>

          {/* Group chips — the dividing categories */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setGroupFilter("all")}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                groupFilter === "all"
                  ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              }`}
            >
              All categories
            </button>
            {groupsForCategory.map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  groupFilter === g
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Board: grouped by category, each with a header divider ── */}
      <div className="mx-auto max-w-[1400px] space-y-8 px-6 py-6">
        {loading && (
          <div className="py-20 text-center text-sm text-gray-400">
            Loading QA records…
          </div>
        )}

        {!loading && visibleGroups.length === 0 && (
          <div className="py-20 text-center text-sm text-gray-400">
            No test cases match the current filter.
          </div>
        )}

        {!loading &&
          visibleGroups.map((group) => {
            const groupTests = filteredTests.filter((t) => t.group === group)
            const gPass = groupTests.filter(
              (t) => getStatus(t.id) === "pass"
            ).length
            const gBug = groupTests.filter(
              (t) => getStatus(t.id) === "bug"
            ).length
            const gPending = groupTests.filter(
              (t) => getStatus(t.id) === "pending"
            ).length
            const isBackend = groupTests[0]?.category === "backend"

            return (
              <section key={group}>
                {/* Group header divider */}
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={`h-6 w-1.5 rounded-full ${isBackend ? "bg-violet-500" : "bg-blue-500"}`}
                  />
                  <h2 className="text-base font-bold tracking-tight">
                    {group}
                  </h2>
                  <span className="text-[11px] font-semibold text-gray-400">
                    {groupTests.length} cases
                  </span>
                  <div className="ml-1 flex items-center gap-1.5">
                    {gPass > 0 && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {gPass} pass
                      </span>
                    )}
                    {gBug > 0 && (
                      <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        {gBug} bug
                      </span>
                    )}
                    {gPending > 0 && (
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {gPending} pending
                      </span>
                    )}
                  </div>
                  <div className="ml-2 h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                </div>

                {/* Kanban for this group */}
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {COLUMNS.map((col) => {
                    const colTests = groupTests.filter(
                      (t) => getStatus(t.id) === col.id
                    )
                    return (
                      <div key={col.id} className="flex flex-col gap-3">
                        <div
                          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${col.bg} ${col.border}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${col.dot}`}
                            />
                            <span
                              className={`text-sm font-semibold ${col.color}`}
                            >
                              {col.label}
                            </span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${col.bg} ${col.color} border ${col.border}`}
                          >
                            {colTests.length}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {colTests.length === 0 && (
                            <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-xs text-gray-300 dark:border-gray-800 dark:text-gray-700">
                              No items
                            </div>
                          )}
                          {colTests.map((test) => (
                            <TestCard
                              key={test.id}
                              test={test}
                              status={getStatus(test.id)}
                              note={notes[test.id]}
                              meta={meta[test.id]}
                              editors={editorsByTest[test.id]}
                              onChange={(s) => setStatus(test.id, s)}
                              onSaveNote={(n) => saveNote(test.id, n)}
                              onEditing={(active) =>
                                handleEditing(test.id, active)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
      </div>
    </div>
  )
}
