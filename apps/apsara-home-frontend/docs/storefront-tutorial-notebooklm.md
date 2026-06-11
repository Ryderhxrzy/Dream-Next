# Partner Storefront Tutorial → NotebookLM Video Overview

Kit para gumawa ng narrated video (NotebookLM "Video Overview") base sa
`components/StorefrontTutorial.tsx`. May 3 bahagi: (A) screenshot guide,
(B) source document na i-uupload sa NotebookLM, (C) customization prompt.

> ⚠️ Paalala: Ang NotebookLM Video Overview ay **narrated slideshow** (boses +
> slides na may konting pan/zoom). HINDI siya totoong animation tulad ng
> live na `/storefront-tutorial` page. Para tumugma sa totoong produkto ang
> visuals, KAILANGAN mong mag-upload ng screenshots (Part A). Kung wala kang
> i-uupload na images, gagawa ito ng generic na AI visuals.

---

## PART A — Screenshots na kukunin mo (8–11 images)

Buksan mo `https://admin.afhome.ph/partner-storefronts` (admin) at ang isang
live na store gaya ng `https://www.afhome.ph/livingco`. Kunan mo nang malinis
(full window, walang ibang tab/clutter). Pangalanan gaya ng nakalista para
madaling i-order sa NotebookLM.

| # | Filename | Ano kukunan | Mula sa |
|---|----------|-------------|---------|
| 01 | `00-intro.png` | (Optional) title/landing ng Storefront Studio | Admin sidebar header |
| 02 | `01-identity.png` | Slug, Display Name, Hero Title, Notification Email na napunan | Admin → Identity tab |
| 03 | `02-logo-referral.png` | Logo uploaded + Referral link + Shop URL | Admin → Logo/Referral |
| 04 | `03-colors.png` | Theme color, Accent color, Hero Subtitle + live preview bar | Admin → Colors |
| 05 | `04-categories.png` | Categories grid (may naka-enable) + product checkboxes | Admin → Categories |
| 06 | `05-save.png` | Summary cards + "Save Storefront" button (Saved! state) | Admin → Save |
| 07 | `06-live-store.png` | Live storefront hero (logo, title, subtitle) + featured products | `/livingco` |
| 08 | `07-product-list.png` | All Products page (filters sidebar + grid) | `/livingco` products |
| 09 | `08-cart.png` | Cart drawer / "Proceed to Checkout" | Live store cart |
| 10 | `09-checkout.png` | Checkout page (contact, address, payment) | Checkout |
| 11 | `10-success.png` | "Payment Successful!" page | Checkout success |

Tip: 1280×720 o mas mataas, PNG. Iwasan ang personal/totoong data — gamitin
ang demo gaya ng "LivingCo Philippines".

---

## PART B — Source document (i-paste/upload ito sa NotebookLM)

> Sa NotebookLM: New Notebook → Add source → "Copied text" → i-paste ang lahat
> sa ibaba. Pagkatapos, i-upload din ang screenshots sa Part A bilang
> karagdagang sources (image sources).

### AF Home — Partner Storefront Studio: Complete Tutorial

**What it is.** Partner Storefront Studio lets an AF Home partner launch their
own branded online shop in minutes — no coding, no deployment, no waiting.
You set your brand, pick your products, hit save, and your store is live.
Every order is still fulfilled, paid, and shipped through AF Home.

**Who it's for.** Resellers, affiliates, and partners who want their own
storefront link to share with customers while AF Home handles the backend.

#### Advantages of availing a webstore

- **Open 24/7.** Your store keeps selling even while you sleep — no fixed hours.
- **Nationwide reach.** Sell beyond your local area to customers across the country.
- **No website to build.** A professional online store with no coding, hosting, or
  maintenance on your end.
- **Low cost to start.** Far cheaper than building your own e-commerce site from
  scratch.
- **Ready-made operations.** Tap into AF Home's catalog, secure payments, and
  shipping right away.
- **Choose your landing page.** Select a ready-made landing page design for your
  webstore so it looks exactly how you want.
- **Grow your income.** Earn from every referral and scale your store anytime.

#### Why join — the benefits

- **Your own branded store.** Custom store URL (slug), display name, logo,
  hero title, brand colors, and hero subtitle — it looks like *your* brand.
- **Launch instantly.** Click Save and your storefront goes live immediately.
  No setup, no deployment, no technical work.
- **Earn from every order.** Your referral link tracks every purchase that
  comes through your storefront, so each sale is credited to you.
- **Curate your catalog.** Choose exactly which categories and products appear
  in your store — show only what fits your brand.
- **AF Home handles the hard part.** Inventory, secure payments (via PayMongo),
  guest checkout, and shipping are all managed by AF Home. You just sell.
- **Zero maintenance.** No servers, no updates, no inventory headaches.

#### Step-by-step tutorial

**Step 1 — Set your store identity.** Fill in your slug (your store URL),
display name, hero title, and notification email. The slug is your storefront
address. The display name and hero title are what customers see first. The
notification email is where you receive order alerts. This is the foundation
of your branded storefront.

**Step 2 — Upload your logo and add your referral link.** Upload your brand
logo (PNG, JPG, or WebP) — it appears in your store header. Then add your
referral link and shop URL. The referral link tracks every purchase that comes
through your storefront, so you get credited for each sale.

**Step 3 — Set brand colors and hero subtitle.** Pick your theme color and
accent color. The theme color styles your hero banner; the accent color styles
your buttons. A live preview updates instantly as you choose. Then write your
hero subtitle — the short tagline that appears below your store title on the
live page.

**Step 4 — Select your product categories.** Choose which categories appear in
your store. Enabled categories instantly preview their products below. You can
also uncheck individual products to hide them — so you curate exactly what your
customers will see.

**Step 5 — Save and launch.** Review your settings in the summary, then click
Save Storefront. Your branded partner shop goes live instantly — no setup, no
deployment, no waiting.

#### What your customers see (live store)

Your live storefront is fully branded with your logo, title, colors, and
subtitle, and the products load from AF Home's real catalog. Customers can:

1. Browse featured products on your storefront home.
2. Open the full product listing with filters and product cards.
3. Hover a product and click **Add to Cart** — it flies into the cart.
4. Open the cart and **Proceed to Checkout**.
5. Enter contact info (their referral source is captured automatically),
   delivery address, and payment method (GCash, Card, or Online Banking).
6. Click **Place Order** — a secure checkout session is created and payment is
   processed via PayMongo.
7. See the **Payment Successful** page confirming the order and next steps.

Orders from your storefront are still processed through AF Home — you sell
under your brand, AF Home fulfills.

#### Closing

Your brand. Your curated products. Powered by AF Home. Create your storefront
today and start selling in minutes.

---

## PART C — Video Overview customization prompt

> Sa NotebookLM: Studio panel → **Video Overview** → **Customize** → i-paste ito.

```
Create a clear, upbeat step-by-step explainer video for AF Home PARTNERS who
want to launch their own branded online store using Partner Storefront Studio.

Audience: resellers and affiliates (non-technical). Tone: friendly, motivating,
practical — like an onboarding walkthrough.

Structure the video in this exact order:
1. Hook — what Partner Storefront Studio is and that you can launch in minutes.
2. Benefits — your own branded store, instant launch, earn from referrals,
   curate your catalog, AF Home handles payments/shipping, zero maintenance.
3. The 5 setup steps in order: (1) Store identity, (2) Logo + referral link,
   (3) Brand colors + hero subtitle, (4) Select product categories, (5) Save
   and launch.
4. What customers see — live storefront, add to cart, checkout, payment
   success.
5. Closing call to action — "Create your storefront today."

Use the uploaded screenshots in numbered order (01 intro → 10 success) so each
section shows the matching real screen. Keep each step short and concrete. Tell
viewers exactly what to click. Keep it under ~4 minutes.
```

**Language option:** Sa NotebookLM Video Overview settings, pwede mong palitan
ang output language. Kung gusto mo Filipino/Taglish narration, piliin ang
Filipino (o idagdag sa dulo ng prompt: "Narrate in Taglish — conversational
Filipino mixed with English product terms.").

**Visual focus:** Para gamitin nito ang totoong screens, siguraduhin nakaupload
LAHAT ng Part A images bago mag-generate. Yan ang magbibigay ng "motion
graphics" feel (pan/zoom sa totoong screenshots).

---

## PART D — Motion-graphics prompt (PDF reference + sequential images)

> Gamitin ito sa AI video / motion-graphics tool. I-attach mo muna ang exported
> PDF (ang "AF Home Partner Webstore — Complete Guide" galing sa
> `/webstore-tutorial`), tapos i-paste ang prompt sa ibaba. Pagkatapos, i-send
> mo ang mga screenshot **in numbered order (01 → 14)** — yan ang susundan ng
> mga eksena.

```
You are creating an animated, motion-graphics explainer video for AF Home.

REFERENCE: The attached PDF — "AF Home Partner Webstore — Complete Guide" — is
the single source of truth. All narration, steps, and on-screen copy must come
from it. Do not invent features or steps that are not in the PDF.

WHAT THE VIDEO IS ABOUT: How an AF Home partner requests, sets up, and manages
their own branded online webstore — from request all the way to a live store
and renewal.

AUDIENCE: AF Home partners, resellers, and affiliates (non-technical).
TONE: friendly, upbeat, motivating — like a clean onboarding walkthrough.
STYLE: modern motion graphics — smooth slide transitions, gentle pan/zoom
(Ken Burns) on the screenshots, animated text callouts, numbered step badges,
soft emerald/teal accent color, light background. Keep it crisp and premium.

STRUCTURE (follow this order):
1. Hook — what an AF Home Partner Webstore is and that you can launch fast.
2. Advantages of availing a webstore — open 24/7, nationwide reach, no website
   to build, low cost to start, ready-made operations, choose your own landing
   page, and grow your income.
3. Benefits — your own branded store, instant launch, earn from referrals,
   curate your products, AF Home handles payments/shipping, easy renewal.
4. The step-by-step walkthrough, grouped in 4 phases:
   • Phase 1 — Request a Webstore (Step 1).
   • Phase 2 — Review & Approval (Steps 2–3).
   • Phase 3 — Build the Storefront (Steps 4–6).
   • Phase 4 — Partner Portal (Steps 7–14: login, manage storefront, build your
     landing page from a template, orders, subscriptions, partner users, members,
     renewal).
5. Closing call to action — "Request your webstore today and start selling."

IMAGES: I will send the screenshots separately, in numbered order (01 to 14).
Use them in that exact sequence — each screenshot is the visual for its matching
step in the PDF. IMPORTANT: the screenshots are full dashboard/page captures with
small text, so do NOT show them fully zoomed out. Instead, zoom IN (close-up) on
the specific field, button, or area being described so the content is clearly
readable, then slowly pan/zoom across it (Ken Burns) for a motion-graphics feel.
Add an animated highlight or arrow on the exact element to click. Image 07 and 08
are both for the login step.

PACING: short, concrete narration per step — tell the viewer exactly what to do.
Add a one-line on-screen caption per scene. Keep the whole video under ~4 minutes.
LANGUAGE: English. (If asked, an alternate Taglish narration is also fine.)
```

