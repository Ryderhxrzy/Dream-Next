# Deploying the Google Sheets Product Import Template

This guide walks through turning [`google-sheets-product-template.gs`](./google-sheets-product-template.gs)
into a live, shareable Google Sheet with **cascading dropdowns** (Category → Subcategory,
Merchant → Brand) and a searchable dropdown UI.

You do this **once** to create a master template; your team then makes copies of it.

---

## 0. Before you start — get your PUBLIC API URL

The script fetches categories and brands from your backend at run time, from Google's
servers. This means:

- ✅ Use your **public/production** API domain, e.g. `https://api.afhome.ph`.
- ❌ Do **NOT** use `http://localhost:8000` — Google's servers cannot reach your laptop.

Where to find it: it's the value of `NEXT_PUBLIC_LARAVEL_API_URL` in your **production**
environment (the same host the live website calls). If unsure, open the live site, press
`F12` → **Network** tab, refresh, and look at the domain of any `/api/...` request.

Quick check that it's reachable publicly (paste in a browser — you should get JSON):

```
https://YOUR-API-DOMAIN/api/product-brands
https://YOUR-API-DOMAIN/api/categories
```

If those return JSON in a normal browser, the script will work.

---

## 1. Create the master Google Sheet

1. Go to <https://sheets.new> (or Google Drive → New → Google Sheets).
2. Rename it something clear, e.g. **"AF Home — Product Import Template (MASTER)"**.

## 2. Add the script

1. In the sheet: **Extensions → Apps Script**.
2. In the editor, delete any sample `function myFunction() {}` code.
3. Open [`docs/google-sheets-product-template.gs`](./google-sheets-product-template.gs),
   copy the **entire** file, and paste it into the editor (file `Code.gs`).

## 3. Set your API domain

Near the top of the pasted code, change this line:

```js
const API_BASE = "https://YOUR-API-DOMAIN"
```

to your real public domain (no trailing slash), e.g.:

```js
const API_BASE = "https://api.afhome.ph"
```

Click **Save** (the 💾 icon, or `Ctrl/Cmd + S`).

## 4. First run + authorization

1. Go back to the **Google Sheet tab** in your browser and **reload the page**.
2. A new menu **"AF Home"** appears in the menu bar → click **AF Home → Build / Refresh template**.
3. The first time, Google shows an authorization prompt:
   - Click **Continue** / **Review permissions**.
   - Choose your Google account.
   - You may see **"Google hasn't verified this app"** → click **Advanced → Go to
     (project name) (unsafe)**. This warning is normal for your own private script.
   - Click **Allow** (it needs: see/edit this spreadsheet, and connect to your API).
4. Run **AF Home → Build / Refresh template** again if the menu closed after authorizing.
5. You should see a **"Template ready"** alert, and a **Products** tab with headers and dropdowns.

## 5. Verify it works

On the **Products** tab:

- Click a cell under **Category** → searchable dropdown of top-level categories.
- Pick one → the **Subcategory** cell on that **same row** now lists only that category's children.
- Click a cell under **Merchant** → pick a merchant → the **Brand** cell on that row lists only
  that merchant's brands.

> The two hidden sheets `_CatSub` and `_CompBrand` hold the lookup data. Leave them hidden.

---

## 6. Turn it into the team template

You want everyone to fill in **their own copy**, not the master.

**Option A — "Force a copy" link (recommended):**

1. In the master sheet, copy its URL. It looks like:
   `https://docs.google.com/spreadsheets/d/FILE_ID/edit#gid=0`
2. Take the `FILE_ID` part and build this link:
   `https://docs.google.com/spreadsheets/d/FILE_ID/copy`
3. Share **that** link with the team. Clicking it prompts each person to **"Make a copy"** —
   they get their own editable sheet with the dropdowns and cascade already working.

**Option B — manual:** share the master as **view-only**, and tell people to do
**File → Make a copy** before filling it in.

> Copies keep the cascading behavior automatically (the script travels with the sheet).
> They only need to run **AF Home → Build / Refresh template** if they want to pull the
> latest categories/brands (and they'll authorize once in their own copy).

## 7. Make it findable in the app (optional but recommended)

So your team sees the template right where they import:

1. Open the **master** sheet, copy its normal share URL.
2. In the codebase, open
   [`apps/apsara-home-frontend/components/superAdmin/products/BulkProductImportPanel.tsx`](../apps/apsara-home-frontend/components/superAdmin/products/BulkProductImportPanel.tsx)
   and set:
   ```ts
   const GOOGLE_SHEETS_TEMPLATE_URL: string | null = "https://docs.google.com/spreadsheets/d/FILE_ID/edit"
   ```
3. Deploy the frontend. A **"Google Sheets template (cascading)"** link now appears in
   **Admin → Products → Bulk Import**, next to the CSV/Excel options.

## 8. Importing a filled sheet

When a teammate finishes their copy:

1. **File → Share → General access → "Anyone with the link" → Viewer**, copy the link.
2. In the app: **Admin → Products → Bulk Import → "Google Sheet Link"**, paste the link,
   click **Load Sheet**, review the preview, then **Import**.

> The **Merchant** column is only a helper to filter the Brand dropdown — it is not imported
> (a product's supplier is derived from the brand). **Subcategory** IS imported.

---

## Keeping data fresh

Categories/brands change over time. To refresh the dropdown options, just open the sheet
and run **AF Home → Build / Refresh template** again — it re-fetches live data and rebuilds
the lists. Existing rows you've typed are on the `Products` tab and are not affected by a
rebuild of the helper lists (though a full rebuild clears the `Products` tab, so refresh on
the master before people copy it, not after they've filled their copy).

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Menu "AF Home" doesn't appear | Reload the sheet tab. The `onOpen` menu only shows after a refresh following paste. If it still never appears, the script is **standalone** — see the next row. |
| `Cannot read properties of null (reading 'getSheetByName')`, or no menu, or cascade never fires | The script is **standalone**, not bound to the sheet. Cascading (`onEdit`) and the menu only work in a **bound** script. Fix: delete the standalone project, then create the script from **inside the sheet** via **Extensions → Apps Script**, and paste the code there. |
| `onOpen` errors "Cannot call SpreadsheetApp.getUi() from this context" | You clicked Run on `onOpen` in the editor. Don't — just reload the sheet; the menu appears on its own. |
| `Request to ... failed (HTTP 0/000)` or timeout | `API_BASE` is wrong or not public. It must be reachable from the internet (not `localhost`). Test the two URLs from step 0 in a browser. |
| `HTTP 429` | Rate limited; wait a minute and run again. |
| Dropdowns appear but Subcategory/Brand stays empty after picking a parent | The category has no subcategories / the merchant has no brands — expected. Otherwise re-run **Build / Refresh template**. |
| Cascade doesn't fire in a teammate's copy | Have them run **AF Home → Build / Refresh template** once (authorizes the script in their copy). |
| "Google hasn't verified this app" | Normal for a private script you wrote. **Advanced → Go to project (unsafe) → Allow**. |

---

### Why not just the Excel file?

A downloaded `.xlsx` cannot carry working cascading dropdowns into Google Sheets, and Excel's
native dropdown can't be made searchable/larger. The Google Sheets route (this script) is the
only way to get **both** the cascade **and** the searchable dropdown UI. The in-app
**"Download Excel Template"** button remains available for people who fill it in Excel desktop.
