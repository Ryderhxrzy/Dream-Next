/**
 * AF Home — Product Import Template for Google Sheets
 * ===================================================
 * Native cascading (dependent) dropdowns inside Google Sheets:
 *   - Category  -> Subcategory   (subcategory list filtered by the chosen category)
 *   - Merchant  -> Brand         (brand list filtered by the chosen merchant/supplier)
 *
 * Why a script? A downloaded .xlsx cannot carry cascading dropdowns into Google
 * Sheets (Sheets drops the formula-based data validation on import). Google
 * Sheets only does dependent dropdowns via an onEdit Apps Script like this one.
 *
 * Category/Subcategory and Merchant/Brand data is pulled LIVE from the public API
 * each time you run "Build / Refresh template", so it never goes stale.
 *
 * ── SETUP (one time) ──────────────────────────────────────────────────────────
 *   1. Open your Google Sheet → Extensions → Apps Script.
 *   2. Delete any sample code, paste THIS whole file, then set API_BASE below
 *      to your API domain (the value of NEXT_PUBLIC_LARAVEL_API_URL — the same
 *      host the website calls, e.g. https://api.yourdomain.com). No trailing slash.
 *   3. Click Save.  Reload the Google Sheet tab in your browser.
 *   4. A new menu "AF Home" appears → click "Build / Refresh template".
 *   5. Approve the authorization prompt the first time.
 *
 * ── USE ───────────────────────────────────────────────────────────────────────
 *   - Fill one product per row on the "Products" tab.
 *   - Pick a Category → the Subcategory cell on that row offers only its children.
 *   - Pick a Merchant → the Brand cell on that row offers only that merchant's brands.
 *   - When done: File → Share (Anyone with the link can view), copy the link, and
 *     paste it into Admin → Products → Bulk Import → "Google Sheet Link".
 *     (Merchant is a helper column for filtering Brand; it is not imported.)
 *
 * ── VARIANTS (purple columns on the right) ────────────────────────────────────
 *   A product with variants (e.g. colors) uses ONE ROW PER VARIANT:
 *     • Put the SAME "Parent SKU" on every variant row of that product.
 *     • Fill the product fields (Name, Category, Merchant, Brand, prices…) on the
 *       FIRST variant row; you can leave them blank on the following rows.
 *     • Fill the variant columns on EACH row: Variant SKU + Variant Status are
 *       required; add Variant Name / Color Name / Color Hex / Variant Size /
 *       Variant Style / Variant Width / Variant Dimension / Variant Height /
 *       Variant Price SRP / DP / Member / Variant Qty / Variant Images as needed.
 *     • The RED columns "Variant PV (AUTO)" and "Variant Reversed PV Multiplier
 *       (AUTO)" are computed by the system on import — LEAVE THEM BLANK (the same
 *       as the product-level "Product PV (AUTO)" red columns).
 *   The importer groups rows by Parent SKU and sets the product to "Has Variants"
 *   automatically. For a simple product with no variants, just leave the variant
 *   columns blank.
 *   Example:
 *     Parent SKU | Main Product Name | … | Variant SKU | Color Name | Variant Status
 *     CHAIR-01   | Lounge Chair      | … | CHAIR-01-RD | Red        | Active
 *     CHAIR-01   |                   | … | CHAIR-01-BL | Blue       | Active
 */

// ⬇⬇⬇ SET THIS to your API domain (no trailing slash) ⬇⬇⬇
const API_BASE = "https://YOUR-API-DOMAIN"

// Leave EMPTY if this script is bound to the sheet (created via the sheet's
// Extensions → Apps Script). Only fill this in if you see a
// "Cannot read properties of null (reading 'getSheetByName')" error — that
// means the script is standalone. Paste your sheet's ID here: it's the long
// part of the URL: https://docs.google.com/spreadsheets/d/THIS_PART/edit
const SPREADSHEET_ID = ""

const SHEET_PRODUCTS = "Products"
const SHEET_CATSUB = "_CatSub"
const SHEET_COMPBRAND = "_CompBrand"

// How many rows are pre-armed with the flat dropdowns (Category, Merchant, etc.).
const DATA_ROWS = 500

// Column order — keep in sync with the in-app Excel template and the import's
// header aliases (Category, Subcategory, Room Type, Merchant, Brand, ...).
const HEADERS = [
  "Main Product Name",
  "Parent SKU",
  "Category",
  "Subcategory",
  "Room Type",
  "Merchant",
  "Brand",
  "Price SRP",
  "Price DP",
  "Price Member",
  "Product PV (AUTO)",
  "PV Pricing Tier",
  "Reversed PV Multiplier (AUTO)",
  "Quantity",
  "Weight",
  "Package Weight",
  "Package Width",
  "Package Length",
  "Package Height",
  "Description",
  "Specifications",
  "Material",
  "Warranty",
  "Images",
  "Product Type",
  "Status",
  "Must Have",
  "Best Seller",
  "Sales Promo",
  "Assembly Required",
  "Verified",
  // --- Variant columns (one row per variant; see header comment) -------------
  // Free-typed columns + one Variant Status dropdown. The two "(AUTO)" columns
  // are computed by the system on import — leave them blank.
  "Variant SKU",
  "Variant Name",
  "Color Name",
  "Color Hex",
  "Variant Size",
  "Variant Style",
  "Variant Width",
  "Variant Dimension",
  "Variant Height",
  "Variant Price SRP",
  "Variant Price DP",
  "Variant Price Member",
  "Variant Reversed PV Multiplier (AUTO)",
  "Variant PV (AUTO)",
  "Variant Qty",
  "Variant Status",
  "Variant Images",
]

// Variant columns are tinted so the product-vs-variant split is obvious. Names
// match the importer's variant aliases where applicable (pv_sku, pv_name,
// pv_color, pv_color_hex, pv_size, pv_style, pv_width, pv_dimension, pv_height,
// pv_price_*, pv_prodpv, pv_qty, pv_status, pv_images). Columns containing
// "(AUTO)" are computed by the backend on import and are tinted RED.
const VARIANT_HEADERS = [
  "Variant SKU",
  "Variant Name",
  "Color Name",
  "Color Hex",
  "Variant Size",
  "Variant Style",
  "Variant Width",
  "Variant Dimension",
  "Variant Height",
  "Variant Price SRP",
  "Variant Price DP",
  "Variant Price Member",
  "Variant Reversed PV Multiplier (AUTO)",
  "Variant PV (AUTO)",
  "Variant Qty",
  "Variant Status",
  "Variant Images",
]
const VARIANT_HEADER_SET = {}
VARIANT_HEADERS.forEach(function (h) {
  VARIANT_HEADER_SET[h] = true
})

// 1-based column number for each header.
const COL = {}
HEADERS.forEach(function (h, i) {
  COL[h] = i + 1
})

const ROOMS = [
  "Bedroom",
  "Kitchen",
  "Living Room",
  "Outdoor",
  "Study & Office Room",
  "Dining Room",
  "Laundry Room",
  "Bathroom",
]
const TIERS = ["Low-End", "High-End"]
const TYPES = ["Simple", "Has Variants"]
const STATUSES = ["Active", "Inactive"]
const BOOL = ["Yes", "No"]
const UNASSIGNED_COMPANY = "— Unassigned —"

/**
 * Adds the "AF Home" menu when the spreadsheet opens.
 * NOTE: This runs automatically on open — do NOT click "Run" on it in the
 * editor (there is no menu UI in that context, so getUi() would throw).
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("AF Home")
      .addItem("Build / Refresh template", "buildTemplate")
      .addToUi()
  } catch (err) {
    // Happens only if onOpen is run manually from the editor. Just reload the
    // Google Sheet tab and the menu will appear on its own.
    Logger.log("onOpen needs the open spreadsheet UI: " + err.message)
  }
}

/** Show a status message that works from both the menu and the editor. */
function notify_(message) {
  try {
    getSpreadsheet_().toast(message, "AF Home", 6)
  } catch (err) {
    Logger.log(message)
  }
}

/**
 * Returns the spreadsheet to work on. Uses the bound/active spreadsheet when
 * available; if the script is standalone (active is null), falls back to the
 * SPREADSHEET_ID you set at the top.
 */
function getSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet()
  if (active) return active
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID)
  throw new Error(
    "No spreadsheet found. Either run this from the sheet's 'AF Home' menu " +
      "(reload the sheet first), or set SPREADSHEET_ID at the top of the script."
  )
}

/** Menu action: fetch live data, lay out the sheet, and arm the dropdowns. */
function buildTemplate() {
  const ss = getSpreadsheet_()
  const data = fetchData_()

  writeHelper_(ss, SHEET_CATSUB, data.catRows)
  writeHelper_(ss, SHEET_COMPBRAND, data.brandRows)

  let sh = ss.getSheetByName(SHEET_PRODUCTS)
  if (!sh) sh = ss.insertSheet(SHEET_PRODUCTS, 0)
  sh.clear()
  sh.clearConditionalFormatRules()

  // Wipe ALL leftover data validations in the data area first. This guarantees
  // variant cells (SKU, Name, Color, prices, sizes…) are free-typed and never
  // carry a stray Yes/No or other dropdown from a previous build.
  sh.getRange(2, 1, DATA_ROWS, HEADERS.length).clearDataValidations()

  sh.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight("bold")
    .setBackground("#334155")
    .setFontColor("#ffffff")
    .setWrap(true)
  sh.setFrozenRows(1)

  // Per-column header tint: bright RED for "(AUTO)" columns (computed by the
  // system — do NOT type in these), purple for the other variant columns.
  HEADERS.forEach(function (h, i) {
    let bg = null
    if (h.indexOf("(AUTO)") >= 0) bg = "#dc2626"
    else if (VARIANT_HEADER_SET[h]) bg = "#6d28d9"
    if (bg) sh.getRange(1, i + 1).setBackground(bg)
  })

  // Flat dropdowns (these are the ONLY dropdowns; everything else is free text).
  setListValidation_(sh, COL["Category"], data.catParents)
  setListValidation_(sh, COL["Merchant"], data.companies)
  setListValidation_(sh, COL["Room Type"], ROOMS)
  setListValidation_(sh, COL["PV Pricing Tier"], TIERS)
  setListValidation_(sh, COL["Product Type"], TYPES)
  setListValidation_(sh, COL["Status"], STATUSES)
  setListValidation_(sh, COL["Variant Status"], STATUSES)
  ;["Must Have", "Best Seller", "Sales Promo", "Assembly Required", "Verified"].forEach(
    function (h) {
      setListValidation_(sh, COL[h], BOOL)
    }
  )

  // The cascade child columns start with no validation; onEdit fills them per row.
  sh.getRange(2, COL["Subcategory"], DATA_ROWS, 1).clearDataValidations()
  sh.getRange(2, COL["Brand"], DATA_ROWS, 1).clearDataValidations()

  notify_(
    "Template ready. Pick a Category to load its Subcategories, and a Merchant to load its Brands, on each row."
  )
}

/** Fetch categories + brands and pre-group them for the cascades. */
function fetchData_() {
  const cats = fetchJson_(API_BASE + "/api/categories?per_page=1000").categories || []
  const brands = fetchJson_(API_BASE + "/api/product-brands").brands || []

  // --- Category -> Subcategory ---
  const nameById = {}
  cats.forEach(function (c) {
    if (c && c.name) nameById[c.id] = String(c.name).trim()
  })
  const isTop = function (c) {
    return c.parent_id == null || c.parent_id === 0
  }
  const childrenByParent = {}
  const catParents = []
  const ensureParent = function (p) {
    if (!(p in childrenByParent)) {
      childrenByParent[p] = []
      catParents.push(p)
    }
  }
  cats.filter(isTop).forEach(function (c) {
    const n = String(c.name || "").trim()
    if (n) ensureParent(n)
  })
  cats
    .filter(function (c) {
      return !isTop(c)
    })
    .forEach(function (c) {
      const childName = String(c.name || "").trim()
      const parentName = nameById[c.parent_id]
      if (!childName || !parentName) return
      ensureParent(parentName)
      if (childrenByParent[parentName].indexOf(childName) < 0) {
        childrenByParent[parentName].push(childName)
      }
    })
  const catRows = []
  catParents.forEach(function (p) {
    const children = childrenByParent[p]
    if (!children.length) catRows.push([p, ""])
    else
      children.forEach(function (c) {
        catRows.push([p, c])
      })
  })

  // --- Merchant -> Brand ---
  const brandsByCompany = {}
  const companies = []
  const ensureCompany = function (co) {
    if (!(co in brandsByCompany)) {
      brandsByCompany[co] = []
      companies.push(co)
    }
  }
  brands.forEach(function (b) {
    const brandName = String(b.name || "").trim()
    if (!brandName) return
    const company = String(b.supplier_name || "").trim() || UNASSIGNED_COMPANY
    ensureCompany(company)
    if (brandsByCompany[company].indexOf(brandName) < 0) {
      brandsByCompany[company].push(brandName)
    }
  })
  const brandRows = []
  companies.forEach(function (co) {
    const list = brandsByCompany[co]
    if (!list.length) brandRows.push([co, ""])
    else
      list.forEach(function (b) {
        brandRows.push([co, b])
      })
  })

  return {
    catParents: catParents,
    catRows: catRows,
    companies: companies,
    brandRows: brandRows,
  }
}

function fetchJson_(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true })
  const code = res.getResponseCode()
  if (code < 200 || code >= 300) {
    throw new Error("Request to " + url + " failed (HTTP " + code + ").")
  }
  return JSON.parse(res.getContentText())
}

/** (Re)write a hidden 2-column helper sheet: [parent, child]. */
function writeHelper_(ss, name, rows) {
  let sh = ss.getSheetByName(name)
  if (!sh) sh = ss.insertSheet(name)
  sh.clear()
  sh.getRange(1, 1, 1, 2).setValues([["parent", "child"]])
  if (rows.length) sh.getRange(2, 1, rows.length, 2).setValues(rows)
  sh.hideSheet()
}

function setListValidation_(sh, col, values) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(true) // allow typing an exact match too
    .build()
  sh.getRange(2, col, DATA_ROWS, 1).setDataValidation(rule)
}

/**
 * Simple trigger — fires automatically on every edit (container-bound script).
 * When Category/Merchant changes on a row, rebuild that row's child dropdown.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return
    const sh = e.range.getSheet()
    if (sh.getName() !== SHEET_PRODUCTS) return

    const startRow = e.range.getRow()
    const numRows = e.range.getNumRows()
    const startCol = e.range.getColumn()
    const endCol = startCol + e.range.getNumColumns() - 1

    // Handle single edits and multi-row fills/pastes that span Category/Merchant.
    const touchesCategory = COL["Category"] >= startCol && COL["Category"] <= endCol
    const touchesCompany = COL["Merchant"] >= startCol && COL["Merchant"] <= endCol
    if (!touchesCategory && !touchesCompany) return

    for (let i = 0; i < numRows; i++) {
      const row = startRow + i
      if (row < 2) continue
      if (touchesCategory) {
        const value = sh.getRange(row, COL["Category"]).getValue()
        applyChild_(sh, row, COL["Subcategory"], SHEET_CATSUB, value)
      }
      if (touchesCompany) {
        const value = sh.getRange(row, COL["Merchant"]).getValue()
        applyChild_(sh, row, COL["Brand"], SHEET_COMPBRAND, value)
      }
    }
  } catch (err) {
    // Simple triggers must stay quiet; swallow and leave the cell as-is.
  }
}

/** Set the child cell's dropdown to the children of `parentValue`. */
function applyChild_(sh, row, childCol, helperName, parentValue) {
  const childCell = sh.getRange(row, childCol)
  childCell.clearContent()

  const help = getSpreadsheet_().getSheetByName(helperName)
  if (!help || !parentValue) {
    childCell.clearDataValidations()
    return
  }

  const lastRow = help.getLastRow()
  if (lastRow < 2) {
    childCell.clearDataValidations()
    return
  }

  const rows = help.getRange(2, 1, lastRow - 1, 2).getValues()
  const options = []
  rows.forEach(function (r) {
    if (String(r[0]) === String(parentValue) && String(r[1]).trim() !== "") {
      options.push(String(r[1]))
    }
  })

  if (!options.length) {
    childCell.clearDataValidations()
    return
  }

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options, true)
    .setAllowInvalid(true)
    .build()
  childCell.setDataValidation(rule)
}
