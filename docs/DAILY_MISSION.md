# Daily & Weekly Missions — Implementation Plan

## Context

The app already has a working **daily check-in** reward system (7-day PV ladder) in the
Laravel backend (`RewardCheckinController` + `DailyCheckin` model + `RewardPvPosting`),
and the PV-crediting helper `RewardPvPosting` was _already designed with missions in mind_
— it exposes unused constants `SOURCE_DAILY_MISSION`, `SOURCE_WEEKLY_MISSION`,
`SOURCE_MONTHLY_MISSION`. But there is **no mission engine, no mission tables, no mission
API, and no PV-Earner UI on the frontend yet**.

The screenshot ("PV Earner") asks for a screen that combines the check-in ladder with a
**Daily Missions** list (Check In, Share Products, Make a Purchase, Invite Friends, Browse
Items) and a **Weekly Missions** list (Spend 2000 PV). The hard part is not the screen —
it's the **event-driven progress engine** that watches real user actions across the app
and credits PV when a goal is hit.

### Decisions locked with the user

- **Reward grant:** auto-credit PV the moment a mission's target is met (no manual Claim).
- **Definitions storage:** DB table (`tbl_missions`) + seeder, so missions are admin-editable.
- **Events wired now:** check-in, purchase + spend-PV, browse-30s, share, invite (all 5/6).
- **Target app:** the existing Next.js `apsara-home-frontend` (mobile/PWA). The check-in
  UI doesn't exist on the frontend yet either, so the PV-Earner page builds both.

---

## Architecture overview

A generic engine: missions are **definitions** (`tbl_missions`) keyed by an `event_type`
and a numeric `target` over a **period** (daily / weekly / monthly). A single choke-point
`MissionEngine::recordEvent($customerId, $eventType, $increment)` is called from the places
where those real events already happen. It upserts a per-customer, per-mission,
per-period **progress** row, increments it, and when progress reaches the target it
auto-credits PV via the existing `RewardPvPosting::credit()` and marks the row completed.

Why this shape: it mirrors the existing `RewardPvPosting` static-helper + ledger pattern,
adds exactly one new call site per event, and the wallet ledger's existing
`UNIQUE(wl_wallet_type, wl_entry_type, wl_source_type, wl_source_id)` constraint makes
double-crediting impossible even under races (source_id = mission-progress id).

---

## Backend (`apps/apsara-home-backend`)

### 1. Migrations

- `tbl_missions`: `m_id`, `m_key` (unique slug, e.g. `daily_check_in`), `m_type`
  (`daily|weekly|monthly`), `m_event_type` (e.g. `check_in`, `share_product`, `purchase`,
  `invite_friend`, `browse_item`, `spend_pv`), `m_title`, `m_description`, `m_icon`,
  `m_target` (decimal 12,2), `m_reward_pv` (decimal 12,2), `m_sort_order`, `m_is_active`
  (bool), timestamps.
- `tbl_mission_progress`: `mp_id`, `mp_customer_id`, `mp_mission_id`, `mp_period_key`
  (string — `Y-m-d` for daily, Sunday week-start `Y-m-d` for weekly, `Y-m` for monthly),
  `mp_progress` (decimal), `mp_target` + `mp_reward_pv` (**snapshots** so editing a mission
  later doesn't rewrite history), `mp_status` (`in_progress|completed`), `mp_completed_at`,
  `mp_ledger_id`, timestamps.
  - `UNIQUE(mp_customer_id, mp_mission_id, mp_period_key)` — one row per mission per period.
  - `INDEX(mp_customer_id, mp_period_key)` — fast status reads.

### 2. Models

- `app/Models/Mission.php` (table `tbl_missions`, PK `m_id`).
- `app/Models/MissionProgress.php` (table `tbl_mission_progress`, PK `mp_id`).
  Mirror the casts/`$fillable` style of `app/Models/DailyCheckin.php`.

### 3. Seeder

- `database/seeders/MissionSeeder.php` seeds the 6 missions from the screenshot
  (idempotent `updateOrCreate` on `m_key`):
  - daily / `check_in` / +50 / target 1
  - daily / `share_product` / +100 / target 1
  - daily / `purchase` / +150 / target 1
  - daily / `invite_friend` / +200 / target 1
  - daily / `browse_item` / +50 / target 1
  - weekly / `spend_pv` / +500 / target 2000
    Register it in `DatabaseSeeder` (or run standalone).

### 4. Engine — `app/Support/MissionEngine.php` (new, mirrors `RewardPvPosting`)

- `const TIMEZONE = 'Asia/Manila'` and a `periodKey(string $type): string` helper that
  reuses the same Sunday-anchored week logic as `RewardCheckinController::weekStart()`.
- `recordEvent(int $customerId, string $eventType, float $increment = 1.0, ?int $contextId = null): void`
  - Load active `Mission`s where `m_event_type = $eventType`.
  - For each, in a `DB::transaction` with `lockForUpdate` on the progress row
    (`firstOrCreate` on customer+mission+periodKey, snapshotting target/reward):
    skip if already `completed`; else `mp_progress = min(target, progress + increment)`;
    if `mp_progress >= target` → call `RewardPvPosting::credit($customerId, reward,
SOURCE_*_MISSION, $progress->mp_id, "MSN-{mp_id}", "Mission: {title}")`, store
    `mp_ledger_id`, set `mp_status='completed'`, `mp_completed_at`.
  - Map `m_type` → the matching `RewardPvPosting::SOURCE_*_MISSION` constant.
- `status(int $customerId): array` — for the API: groups missions by type, joins the
  current-period progress row (0 / in_progress if none), returns per-mission
  `{key,title,description,icon,target,reward_pv,progress,completed,completed_at}` plus a
  per-group `{completed, total}` summary for the "3/5" badge.

### 5. Controller + routes

- `app/Http/Controllers/Api/MissionController.php`:
  - `GET /rewards/missions` → `MissionEngine::status($request->user()->c_userid)`.
- Register inside the existing `Route::middleware(['auth:sanctum','customer.actor'])`
  group in `routes/api.php`, next to the `/rewards/check-in` routes (~line 269-272).
- **Share endpoint (new, since none exists):**
  `POST /products/{id}/share` (auth) → `ProductController::share()` (or a small
  `ProductShareController`): validates product, fires
  `MissionEngine::recordEvent($cid,'share_product',1)`, returns `{message, share_url}`.
- **Browse-30s endpoint (new authenticated companion):** the existing
  `POST /products/{id}/viewers/heartbeat` is **public & anonymous** (Redis presence, no
  customer id) — do **not** repurpose it. Add `POST /products/{id}/browse-credit` (auth),
  which the product page calls once after a 30s continuous-dwell timer; it fires
  `MissionEngine::recordEvent($cid,'browse_item',1)`. The mission's `target=1` +
  per-period unique row make it naturally once-per-day (no extra dedupe needed).

### 6. Event hook insertions (one call each)

- **check-in** → `RewardCheckinController::checkIn()` after the `DailyCheckin::create`
  - ledger block (~line 220): `MissionEngine::recordEvent($customerId,'check_in',1)`.
- **purchase + spend_pv** → `app/Support/OrderPvPosting.php` `postIfNeeded()`, right after
  PV is booked: `recordEvent($cid,'purchase',1)` **and**
  `recordEvent($cid,'spend_pv',$earnedPv)` (the weekly 0/2000 accumulator uses the PV
  amount as the increment).
- **invite** → `AuthController` post-registration hook (~line 331, the
  `if ($referrer instanceof Customer)` block): `recordEvent((int)$referrer->c_userid,'invite_friend',1)`.
- **share / browse** → from the two new endpoints above.

---

## Frontend (`apps/apsara-home-frontend`)

### 7. RTK Query — `store/api/missionApi.ts` (new, follows `userApi.ts` injectEndpoints)

- Add a `"Missions"` tag to `baseApi`.
- `missionStatus: builder.query<MissionStatusResponse, void>` → `GET /api/rewards/missions`.
- `shareProduct` / `browseCreditProduct` mutations → the two new endpoints,
  `invalidatesTags: ["Missions"]`.
- Reuse the existing check-in endpoints by adding `checkinStatus` query + `claimCheckin`
  mutation here too (or a `checkinApi.ts`), since no frontend hook exists yet.
- Define TS interfaces mirroring the JSON (`MissionStatusResponse`, `MissionItem`,
  `MissionGroup`).

### 8. PV-Earner page + components (`components/rewards/` or `components/profile/`)

- `app/pv-earner/page.tsx` (dedicated route — screenshot has its own header + back arrow),
  plus an entry link from the existing PV tab in
  `components/profile/ProfilePage.tsx` / `PvWalletTab.tsx`.
- Components (HeroUI + Tailwind + Lucide + Framer Motion, matching the existing profile UI):
  - `CheckInLadder.tsx` — Day 1–7 strip, "Checked in today ✓" / check-in button (consumes
    check-in status + mutation).
  - `MissionSection.tsx` — header with title + "3/5" badge; renders a list.
  - `MissionCard.tsx` — icon tile, title, description, progress bar, `+N PV`, `x/target`,
    completed state. One reusable card for both daily & weekly.
- Browse-30s firing: on the product detail page, start a 30s timer when the page is
  visible; on elapse (once per mount) call `browseCreditProduct`. Share: wire the existing
  share affordance to `shareProduct`.

---

## Verification

1. **Migrate + seed:** `php artisan migrate` then run `MissionSeeder`; confirm
   `tbl_missions` has the 6 rows.
2. **Backend unit/flow:** with a Sanctum token, `GET /api/rewards/missions` → returns
   daily (5) + weekly (1) groups, all `progress:0`. Then `POST /api/rewards/check-in` →
   re-GET missions: `check_in` shows `progress:1, completed:true`; confirm a `pv` row was
   written to `tbl_customer_wallet_ledger` with `wl_source_type='daily_mission'` and
   `c_gpv` increased by 50. Repeat check-in same day → mission stays completed, **no**
   second credit (idempotency).
3. **Spend accumulation:** post an order through `OrderPvPosting::postIfNeeded()` and
   confirm the weekly `spend_pv` progress advances by the order's earned PV and that the
   daily `purchase` mission completes.
4. **Invite:** register a new customer with an existing referrer's code → referrer's
   `invite_friend` daily mission completes once.
5. **Frontend:** run the frontend (`pnpm dev` per `apps/apsara-home-backend/DATABASE.md`
   run guide), open `/pv-earner` on a mobile viewport, verify the ladder + both mission
   sections render with live progress and the "3/5" badge updates after actions.
6. Run `graphify update .` after the code lands to refresh the knowledge graph.

## Notes / risks

- Reward PV uses `RewardPvPosting` (does NOT trigger unilevel/affiliate bonuses) — correct
  for missions; no commission cascade.
- All new routes go under `auth:sanctum` + `customer.actor`; add `throttle` to the
  share/browse endpoints (mirror the `throttle:30,1` on check-in) to prevent farming.
- Period resets piggyback on the same Asia/Manila + Sunday-week logic as check-in, so
  daily/weekly boundaries stay consistent across the rewards surface.
