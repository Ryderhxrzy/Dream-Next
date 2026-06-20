# Supplier / Merchant User Journey — afhome.ph

> App: **apsara-home-frontend** (Next.js) + **apsara-home-backend** (Laravel API).
> Scope: how a supplier/merchant account is created, how they upload products to be
> listed on afhome.ph, and how an admin approves or rejects those products.
> Includes the routes, components, and API endpoints (frontend RTK Query hook +
> backend Laravel route/controller) used at each step.

---

## 0. Actors & Big Picture

| Actor | What they do |
|-------|--------------|
| **Super Admin** | Creates the supplier *company*, invites supplier users, reviews/approves/rejects products. |
| **Main Supplier** (`level_type = 1`) | Manages company profile, sub-users, warehouses, uploads & manages products. |
| **Sub Supplier** (`level_type = 0`) | Uploads/manages inventory & orders; cannot manage other users. |
| **Customer** | Sees only `Active` products on the storefront. |

There is **no public supplier self-registration** — onboarding is **admin-invite only**.

Two product sources:
- **Standard products** — uploaded directly by the supplier (or admin) into the local catalog.
- **ZQ products** — sourced from an external global supplier API ("ZQ"), cached locally, re-priced, then imported into the local catalog.

---

## 1. Journey A — Supplier Onboarding & Account Creation

### Steps
1. **Admin creates the supplier company** in the admin panel (name, company, email, contact, address, status).
2. **Admin invites a supplier user** (full name, username, email, supplier ID, level type). Backend generates a one-time token (24h TTL) and emails a setup link.
3. **Invitee opens the setup link** → `/supplier-setup?token=…`. The form pre-fills (read-only) name/username/supplier/email; the user sets a strong password (8+ chars, upper/lower/number/special).
4. **Account is activated** when the password is set; the token is invalidated. User is sent to `/supplier/login`.
5. **Supplier logs in** at `/supplier/login` (email/username + password, optional email-OTP 2FA) → lands on `/supplier/dashboard`.
6. **Company profile / users / warehouses** managed under `/supplier/company`, `/supplier/users`, `/supplier/warehouse`.
7. **Password recovery**: `/supplier/forgot-password` → emailed reset link → `/supplier/reset-password?token=…` (60-min TTL).

### Routes
| Route | Component |
|-------|-----------|
| `/supplier-setup?token=…` | `components/supplier/SupplierInviteSetupForm.tsx` |
| `/supplier/login` | `components/supplier/SupplierLoginForm.tsx` |
| `/supplier/forgot-password` | `components/supplier/SupplierForgotPasswordForm.tsx` |
| `/supplier/reset-password?token=…` | `components/supplier/SupplierResetPasswordForm.tsx` |
| `/supplier/dashboard` | supplier dashboard page |
| `/supplier/company` | supplier company profile (admin `SuppliersPageMain` view) |
| `/supplier/users` | `components/supplier/SupplierUsersPage.tsx` |
| `/supplier/warehouse` | `components/supplier/SupplierWarehousePage.tsx` |
| *(admin side)* supplier mgmt | `components/superAdmin/suppliers/SuppliersPageMain.tsx` |

### Auth
- Separate **NextAuth `supplier-credentials`** provider (distinct from customer/admin).
- JWT session (~24h). Optional email OTP 2FA. Login throttled; lockout after repeated failures.

### API Endpoints
| Frontend hook (`store/api/suppliersApi.ts`) | Method | Backend route | Controller |
|---|---|---|---|
| — | POST | `/api/supplier/auth/login` | `SupplierAuthController@login` |
| `useGetSupplierMeQuery` | GET | `/api/supplier/auth/me` | `SupplierAuthController@me` |
| — | POST | `/api/supplier/auth/forgot-password` | `SupplierAuthController@forgotPassword` |
| — | POST | `/api/supplier/auth/reset-password` | `SupplierAuthController@resetPassword` |
| — | GET | `/api/supplier/auth/reset-password/{token}` | `SupplierAuthController@showResetToken` |
| — | GET | `/api/supplier/invites/{token}` | `SupplierUserController@showInvite` |
| — | POST | `/api/supplier/invites/accept` | `SupplierUserController@acceptInvite` |
| `useGetSuppliersQuery` | GET | `/api/admin/suppliers` | `SupplierController@index` |
| `useCreateSupplierMutation` | POST | `/api/admin/suppliers` | `SupplierController@store` |
| `useUpdateSupplierMutation` | PUT | `/api/admin/suppliers/{id}` | `SupplierController@update` |
| `useDeleteSupplierMutation` | DELETE | `/api/admin/suppliers/{id}` | `SupplierController@destroy` |
| `useInviteSupplierUserMutation` | POST | `/api/admin/supplier-users` | `SupplierUserController@store` |
| `useGetSupplierUsersQuery` | GET | `/api/admin/supplier-users` | `SupplierUserController@index` |
| `useUpdateSupplierUserMutation` | PUT | `/api/admin/supplier-users/{id}` | `SupplierUserController@update` |
| `useDeleteSupplierUserMutation` | DELETE | `/api/admin/supplier-users/{id}` | `SupplierUserController@destroy` |

---

## 2. Journey B — Supplier Uploads / Creates a Product

### 2a. Standard product upload

#### Steps
1. Supplier opens **`/supplier/products`** (server-rendered list; supplier name/company fuzzy-matched to a product brand).
2. Opens the **Add Product** modal and fills in: name, category, pricing (SRP / DP / Member), PV, stock, dimensions/weight, description, specs, variants.
3. **Uploads images/media first** → `POST /api/admin/upload` (Cloudinary; returns `{ url, public_id }`). Images go in the `apsara/products` folder, transformed to ≤1200px / auto WebP. Upload is rate-limited (~20/IP/min).
4. **Submits** → `useCreateProductMutation` → `POST /api/admin/products`. Backend validates the supplier's category access, creates the `Product`, `ProductPhoto`, and (if applicable) `ProductVariant` + `ProductVariantPhoto` records, and writes a `ProductActivityLog` entry.

#### Routes & Components
| Route | Component |
|-------|-----------|
| `/supplier/products` | `app/supplier/products/page.tsx` → `components/superAdmin/products/ProductsPageMain.tsx` |
| `/supplier/inventory` | `components/supplier/SupplierInventoryPage.tsx` |
| `/supplier/categories` | `components/supplier/SupplierCategoriesPage.tsx` |
| `/supplier/warehouse` | `components/supplier/SupplierWarehousePage.tsx` |
| `/supplier/catalogue` | `components/supplier/SupplierCataloguePage.tsx` (digital flipbook) |
| add/edit modals | `components/superAdmin/products/AddProductModal.tsx`, `EditProductModal.tsx`, `BulkProductImportPanel.tsx` |

> Note: the supplier portal **reuses** the admin `ProductsPageMain` / product modals; the backend scopes data to the acting supplier.

#### API Endpoints
| Frontend hook (`store/api/productsApi.ts`) | Method | Backend route | Controller |
|---|---|---|---|
| *(upload)* | POST | `/api/admin/upload` | Next.js route `app/api/admin/upload/route.ts` (Cloudinary) |
| `useGetProductsQuery` | GET | `/api/admin/products` | `ProductController@index` |
| `useCreateProductMutation` | POST | `/api/admin/products` | `ProductController@store` |
| `useUpdateProductMutation` | PUT | `/api/admin/products/{id}` | `ProductController@update` |
| `useDeleteProductMutation` | DELETE | `/api/admin/products/{id}` | `ProductController@destroy` |
| `useBulkImportProductsMutation` | POST | `/api/admin/products/import` | `ProductController@import` |
| `useBulkPriceApplyMutation` | POST | `/api/admin/products/bulk-price/apply` | `ProductController@bulkPriceApply` |
| `useBulkUpdateApplyMutation` | POST | `/api/admin/products/bulk-update/apply` | `ProductController@bulkUpdateApply` |
| `useGetProductActivityLogsQuery` | GET | `/api/admin/products/activity-logs` | `ProductController@activityLogs` |

> Backend routes are under `routes/api.php` and protected by `auth:sanctum` + `admin.or_supplier` middleware (admins and suppliers share these endpoints; the controller scopes results to the actor).

**Key product fields:** `pd_name`, `pd_catid`, `pd_price_srp`, `pd_price_dp`, `pd_price_member`, `pd_prodpv` (point value), `pd_qty`, `pd_image`, `pd_images[]`, `pd_variants[]`, `pd_status`.
Variants (`tbl_product_variant`): `pv_sku`, `pv_color`/`pv_color_hex`, `pv_size`, `pv_style`, per-variant `pv_price_srp/dp/member`, `pv_qty`, `pv_images[]`. Effective stock = sum of active variant quantities, else base `pd_qty`.

### 2b. ZQ (external supplier) products

#### Steps
1. Supplier opens **`/supplier/products/zq-supplier`** to browse cached ZQ products (`useGetZqCachedProductsQuery`).
2. **Sync catalog** from ZQ on demand (`useSyncZqProductsMutation`), with cursor-based paging.
3. **Map ZQ categories → local AF categories** (`useGetZqCategoryMappingsQuery` / `useUpsertZqCategoryMappingMutation`).
4. **Preview & set pricing** in `SupplierZqPricingModal` — dealer price, member price, PV, PV tier, reversed-PV multiplier (modal also shows the commission breakdown). Persist via `useUpdateZqProductPricingMutation` (product) and `useUpdateZqVariantPricingMutation` (variants).
5. **Import to the local catalog** (`useImportZqToLocalMutation`) → creates a standard `Product` from the ZQ data.
6. Preview a single ZQ product at **`/supplier/products/zq-preview/[id]`**.

#### Routes & Components
| Route | Component |
|-------|-----------|
| `/supplier/products/zq-supplier` | `app/supplier/products/zq-supplier/page.tsx` |
| `/supplier/products/zq-preview/[id]` | `app/supplier/products/zq-preview/[id]/page.tsx` → `ZqProductPreviewClient` |
| ZQ pricing modal | `components/supplier/SupplierZqPricingModal.tsx` |
| ZQ customer preview | `components/supplier/zq/ZqCustomerProductPreview.tsx` |

#### API Endpoints (all `ProductController`)
| Frontend hook | Method | Backend route |
|---|---|---|
| `useGetZqCachedProductsQuery` | GET | `/api/supplier/products/zq/cached` |
| `useFetchZqImportDetailMutation` | GET | `/api/supplier/products/zq/detail/{id}` |
| `useSyncZqProductsMutation` | POST | `/api/supplier/products/zq/sync` |
| `useGetZqProductsSummaryQuery` | GET | `/api/supplier/products/zq/summary` |
| `useGetZqInventoryQuery` | GET | `/api/supplier/products/zq/inventory/{sku}` |
| `useGetZqCategoryMappingsQuery` | GET | `/api/supplier/products/zq/category-mappings` |
| `useUpsertZqCategoryMappingMutation` | POST | `/api/supplier/products/zq/category-mappings` |
| `useUpdateZqProductPricingMutation` | PATCH | `/api/supplier/products/zq/pricing/{externalId}` |
| `useGetZqVariantPricingQuery` | GET | `/api/supplier/products/zq/pricing/{externalId}/variants` |
| `useUpdateZqVariantPricingMutation` | POST | `/api/supplier/products/zq/pricing/{externalId}/variants` |
| `useImportZqToLocalMutation` | POST | `/api/supplier/products/zq/import-to-local/{externalId}` |

---

## 3. Journey C — Admin Approves / Rejects a Product

### Product status lifecycle
Status is an integer column `pd_status` on `tbl_product`; backend validates `in:0,1,2,3`.

| Code | Meaning | Visible to customer? |
|------|---------|----------------------|
| `1` | **Active** (approved / live) | ✅ Yes |
| `0` | **Inactive** (draft / rejected / hidden) | ❌ No |
| `2` | Secondary active / featured | ✅ Yes |
| `3` | **Pending** (awaiting review) | ❌ No |

Public storefront (`/api/products`) only returns `pd_status IN (1,2)`.

### Steps
1. Admin opens **`/admin/products`**.
2. In `ProductsToolbar`, selects the **"Pending"** tab (filters `status=3`). The toolbar also surfaces a pending count (a `useGetProductsQuery({ status: "3" })` call).
3. Clicks a product row → **`EditProductModal`** to review details.
4. **Approve** → set status to `1` (Active) and save. **Reject / hold** → set status to `0` (Inactive) and save.
5. Save → `useUpdateProductMutation` → `PUT /api/admin/products/{id}`. Backend writes the change and records a `ProductActivityLog` (before/after) entry for the audit trail.

### Routes & Components
| Route | Component |
|-------|-----------|
| `/admin/products` | `app/admin/products/page.tsx` → `components/superAdmin/products/ProductsPageMain.tsx` |
| `/admin/products/zq-supplier` | `app/admin/products/zq-supplier/page.tsx` |
| toolbar / status tabs | `components/superAdmin/products/ProductsToolbar.tsx` |
| product table | `components/superAdmin/products/ProductsTable.tsx` |
| review / status change | `components/superAdmin/products/EditProductModal.tsx` |

### API Endpoints
| Frontend hook | Method | Backend route | Controller | Effect |
|---|---|---|---|---|
| `useGetProductsQuery({status:"3"})` | GET | `/api/admin/products?status=3` | `ProductController@index` | List pending products |
| `useUpdateProductMutation` | PUT | `/api/admin/products/{id}` | `ProductController@update` | `pd_status:1` = approve / `pd_status:0` = reject |
| `useDeleteProductMutation` | DELETE | `/api/admin/products/{id}` | `ProductController@destroy` | Remove product |
| `useGetProductActivityLogsQuery` | GET | `/api/admin/products/activity-logs` | `ProductController@activityLogs` | Audit trail |

### ⚠️ Notes / things to confirm
- **There is no dedicated `…/approve` or `…/reject` endpoint.** Approval and rejection are both done by changing `pd_status` through the generic `PUT /api/admin/products/{id}` update. A **rejection reason is not captured** as a first-class field today (only free-text product fields + the activity log).
- **Default status for new uploads is ambiguous in code** — the create path generally defaults to `1` (Active, i.e. live immediately) unless `pd_status: 3` is set explicitly, yet the admin UI exposes a "Pending" (`3`) review tab and `EditProductModal` notes *"Status is locked while the service is pending review."* Confirm whether supplier-uploaded products are meant to default to **Pending (3)** for mandatory review vs. **Active (1)**; this is the key gap if a true approval gate is intended.

---

## 4. Quick Reference — Backend Controllers
| Controller | Responsibility |
|------------|----------------|
| `SupplierAuthController` | Supplier login, logout, me, password reset, 2FA OTP. |
| `SupplierUserController` | Supplier-user invites (show/accept), CRUD. |
| `SupplierController` | Supplier company CRUD, stats, category access. |
| `SupplierWarehouseController` | Supplier warehouse CRUD. |
| `ProductController` | Product CRUD, bulk import/price/update, activity logs, all ZQ sync/pricing/import. |

_Backend routes live in `apps/apsara-home-backend/routes/api.php`; product/supplier endpoints are guarded by `auth:sanctum` and role middleware (`admin.or_supplier`)._
