"use client"

import type { Category } from "@/store/api/categoriesApi"

import Navbar from "@/components/layout/Navbar"
import TopBar from "@/components/layout/TopBar"

interface ProductPageWrapperProps {
  children: React.ReactNode
  initialCategories?: Category[]
  allowedCategoryIds?: number[]
  hideTopBar?: boolean
  logoSrc?: string
  logoAlt?: string
  logoHref?: string
  hideSignIn?: boolean
  hideNavLinks?: boolean
  categoryOnlyNav?: boolean
  stickToTop?: boolean
  showGuestCartWishlist?: boolean
}

export default function ProductPageWrapper({
  children,
  initialCategories = [],
  allowedCategoryIds,
  hideTopBar = false,
  logoSrc = "/Images/af_home_logo.png",
  logoAlt = "AF Home",
  logoHref = "/shop",
  hideSignIn = false,
  hideNavLinks = false,
  categoryOnlyNav = false,
  stickToTop = false,
  showGuestCartWishlist = false,
}: ProductPageWrapperProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="relative z-[55]">
        {!hideTopBar && <TopBar />}
        <Navbar
          initialCategories={initialCategories}
          allowedCategoryIds={allowedCategoryIds}
          logoSrc={logoSrc}
          logoAlt={logoAlt}
          logoHref={logoHref}
          hideSignIn={hideSignIn}
          hideNavLinks={hideNavLinks}
          categoryOnlyNav={categoryOnlyNav}
          stickToTop={stickToTop}
          showGuestCartWishlist={showGuestCartWishlist}
        />
      </div>

      {children}
    </div>
  )
}
