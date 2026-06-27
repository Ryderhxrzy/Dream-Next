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
 *       (AUTO)" auto-calculate in the sheet from the Variant Price DP (the same
 *       as the product-level "Product PV (AUTO)" red columns) — LEAVE THEM
 *       BLANK; the formulas fill them in for you. (For the High-End tier the
 *       multiplier stays blank until that formula is finalised.)
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
// Visible reference sheet of [Color Name, Hex] pairs. The "Color Hex" column
// VLOOKUPs against it, so you can add/adjust colors here and every row picks up
// the change. Seeded with defaults only when it doesn't already exist, so your
// edits survive a "Build / Refresh template".
const SHEET_HEXCOLOR = "HEX COLOR"

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
  // auto-calculate in the sheet (PV = Variant Price DP x derived multiplier).
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
// "(AUTO)" are auto-calculated by in-sheet formulas and are tinted RED.
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
// Ready-made Warranty options — keep in sync with AddProductModal WARRANTY_OPTIONS.
const WARRANTIES = [
  "No Warranty",
  "15 Days Warranty",
  "1 Month Warranty",
  "2 Months Warranty",
  "3 Months Warranty",
  "6 Months Warranty",
  "9 Months Warranty",
  "1 Year Warranty",
]
const UNASSIGNED_COMPANY = "— Unassigned —"

// Color Name -> Color Hex defaults. These seed the visible "HEX COLOR" sheet,
// which the "Color Hex" column VLOOKUPs against. Curated for furniture/home
// decor; keys are lowercased and include common synonyms (grey/gray). To change
// the palette, edit the hexes here (re-seeds a fresh sheet) or edit the "HEX
// COLOR" sheet directly (preserved across rebuilds).
const COLOR_HEX = {
  // Neutrals & whites
  white: "#FFFFFF",
  "off white": "#F2EFE9",
  "off-white": "#F2EFE9",
  ivory: "#FFFFF0",
  cream: "#F5EFE0",
  pearl: "#EAE0C8",
  linen: "#EFE6D8",
  beige: "#E8DCC4",
  sand: "#D9C7A3",
  tan: "#D2B48C",
  taupe: "#8B7E6A",
  khaki: "#C3B091",
  greige: "#BBADA0",
  // Greys & blacks
  "white smoke": "#F5F5F5",
  "light gray": "#D3D3D3",
  "light grey": "#D3D3D3",
  silver: "#C0C0C0",
  gray: "#808080",
  grey: "#808080",
  "dark gray": "#5A5A5A",
  "dark grey": "#5A5A5A",
  slate: "#5C6670",
  charcoal: "#36454F",
  graphite: "#33373B",
  black: "#1A1A1A",
  // Reds, pinks
  red: "#D32F2F",
  scarlet: "#E23D28",
  crimson: "#B81D24",
  cherry: "#9E1B32",
  maroon: "#6E1423",
  burgundy: "#5C1A2B",
  wine: "#5E2129",
  rose: "#C46A78",
  blush: "#E0A9A3",
  pink: "#F4B6C2",
  // Oranges, browns, woods
  coral: "#E5735B",
  salmon: "#E9967A",
  terracotta: "#C66B45",
  rust: "#9C5A3C",
  orange: "#E07B39",
  peach: "#F2C6A0",
  apricot: "#E8B17A",
  caramel: "#A9743B",
  brown: "#6F4A2F",
  chocolate: "#4E342E",
  coffee: "#5C4433",
  espresso: "#3B2C26",
  mocha: "#8A6A53",
  // Wood tones
  natural: "#D8B98C",
  oak: "#B58A52",
  teak: "#9C6B3F",
  walnut: "#5C4033",
  mahogany: "#7B3F32",
  wenge: "#3D2B22",
  // Yellows, golds
  gold: "#C9A227",
  amber: "#D9A520",
  mustard: "#C9A227",
  yellow: "#E8C547",
  // Greens
  lime: "#9CB83C",
  olive: "#6B6B3A",
  sage: "#9CAF88",
  green: "#3F7D4E",
  "forest green": "#2E5D3A",
  forest: "#2E5D3A",
  emerald: "#2E8B6B",
  mint: "#A8D5BA",
  teal: "#2C7A7B",
  // Blues
  turquoise: "#3FB6B2",
  aqua: "#5BC8C2",
  cyan: "#3EB6C4",
  "sky blue": "#7FB5D6",
  "light blue": "#A9C9DE",
  "baby blue": "#A7C7E7",
  blue: "#2D5F8A",
  denim: "#3B5B7A",
  cobalt: "#1F4E8C",
  "royal blue": "#27408B",
  navy: "#1B2A4A",
  "navy blue": "#1B2A4A",
  indigo: "#3B3470",
  // Purples
  lavender: "#C9BCE0",
  lilac: "#C8A2C8",
  mauve: "#B08CA0",
  plum: "#6E3E5C",
  violet: "#7A4E9E",
  purple: "#5E3A87",
  // Special
  multicolor: "",
}

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
  writeColorSheet_(ss)

  let sh = ss.getSheetByName(SHEET_PRODUCTS)
  const isNewSheet = !sh
  if (!sh) sh = ss.insertSheet(SHEET_PRODUCTS, 0)

  // Only wipe everything when creating the sheet for the first time. On a
  // "Build / Refresh" of an existing sheet we PRESERVE the product rows the
  // user has already typed — we only refresh the header, the dropdown lists,
  // and the AUTO formulas below (none of which touch the user's data values).
  if (isNewSheet) {
    sh.clear()
    sh.clearConditionalFormatRules()
  }

  // Re-arm the data validations in the data area. Clearing first guarantees
  // variant cells (SKU, Name, Color, prices, sizes…) stay free-typed and never
  // carry a stray Yes/No or other dropdown from a previous build. This clears
  // validation rules only — the cells' typed-in values are left untouched.
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
  setListValidation_(sh, COL["Warranty"], WARRANTIES)
  setListValidation_(sh, COL["Status"], STATUSES)
  setListValidation_(sh, COL["Variant Status"], STATUSES)
  ;[
    "Must Have",
    "Best Seller",
    "Sales Promo",
    "Assembly Required",
    "Verified",
  ].forEach(function (h) {
    setListValidation_(sh, COL[h], STATUSES)
  })

  // The cascade child columns start with no validation; onEdit fills them per row.
  sh.getRange(2, COL["Subcategory"], DATA_ROWS, 1).clearDataValidations()
  sh.getRange(2, COL["Brand"], DATA_ROWS, 1).clearDataValidations()

  // Fill the red "(AUTO)" columns with the PV calculator formulas so PV and the
  // Reversed PV Multiplier compute themselves as Price DP is typed.
  applyAutoFormulas_(sh)

  notify_(
    "Template ready. Pick a Category to load its Subcategories, and a Merchant to load its Brands, on each row."
  )
}

/** Fetch categories + brands and pre-group them for the cascades. */
function fetchData_() {
  const cats =
    fetchJson_(API_BASE + "/api/categories?per_page=1000").categories || []
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

/**
 * Create the visible "HEX COLOR" reference sheet ([Color Name, Hex]) that the
 * "Color Hex" column VLOOKUPs against. Seeded from COLOR_HEX only when the sheet
 * does not already exist, so colors you add/edit by hand survive a rebuild.
 */
function writeColorSheet_(ss) {
  if (ss.getSheetByName(SHEET_HEXCOLOR)) return // preserve the user's color edits

  const sh = ss.insertSheet(SHEET_HEXCOLOR)
  const rows = [["Color Name", "Hex"]]
  Object.keys(COLOR_HEX).forEach(function (name) {
    const hex = COLOR_HEX[name]
    if (hex) rows.push([name, hex])
  })
  sh.getRange(1, 1, rows.length, 2).setValues(rows)
  sh.getRange(1, 1, 1, 2)
    .setFontWeight("bold")
    .setBackground("#334155")
    .setFontColor("#ffffff")
  sh.setFrozenRows(1)
  sh.setColumnWidth(1, 160)
  sh.setColumnWidth(2, 100)

  // Paint each hex cell in its own color so the table reads at a glance.
  for (let i = 1; i < rows.length; i++) {
    try {
      sh.getRange(i + 1, 2).setBackground(rows[i][1])
    } catch (err) {
      // Skip anything that isn't a valid color value.
    }
  }
}

function setListValidation_(sh, col, values) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(true) // allow typing an exact match too
    .build()
  sh.getRange(2, col, DATA_ROWS, 1).setDataValidation(rule)
}

/** 1-based column number -> spreadsheet column letter (1 -> A, 27 -> AA). */
function colLetter_(n) {
  let result = ""
  let x = n
  while (x > 0) {
    const remainder = (x - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    x = Math.floor((x - 1) / 26)
  }
  return result
}

/**
 * Fill the red "(AUTO)" columns with formulas that mirror the in-app PV
 * calculator (AddProductModal `deriveLowEndMultiplier` + `deriveComputedPv`):
 *   - Low-End tier (or a blank tier, which defaults to Low-End) derives the
 *     Reversed PV Multiplier from the Dealer (Price DP) band:
 *       <=999 -> 0.5,  <=5000 -> 0.4,  <25000 -> 0.3,  >=25000 -> 0.2
 *   - PV = Price DP x Reversed PV Multiplier (rounded to 2 dp).
 *   - High-End is left blank (its formula is not finalised yet).
 * Applies to both the product-level and the variant-level AUTO columns; the
 * variant formulas use the variant's own Price DP and inherit the row's tier.
 */
function applyAutoFormulas_(sh) {
  const dp = colLetter_(COL["Price DP"])
  const tier = colLetter_(COL["PV Pricing Tier"])
  const mult = colLetter_(COL["Reversed PV Multiplier (AUTO)"])
  const vdp = colLetter_(COL["Variant Price DP"])
  const vmult = colLetter_(COL["Variant Reversed PV Multiplier (AUTO)"])
  const cname = colLetter_(COL["Color Name"])

  const multiplierFormula = function (transferCol, r) {
    const t = "$" + transferCol + r
    return (
      "=IF(OR($" +
      tier +
      r +
      '="High-End",' +
      t +
      '=""),"",' +
      "IF(" +
      t +
      "<=999,0.5,IF(" +
      t +
      "<=5000,0.4,IF(" +
      t +
      "<25000,0.3,0.2))))"
    )
  }
  const pvFormula = function (transferCol, multiplierCol, r) {
    const t = "$" + transferCol + r
    const m = "$" + multiplierCol + r
    return "=IF(OR(" + t + '="",' + m + '=""),"",ROUND(' + t + "*" + m + ",2))"
  }
  // Color Hex = VLOOKUP of Color Name against the "HEX COLOR" sheet; blank when
  // the name is empty or not found (so a manually typed hex is never replaced
  // by an error). Matching is case-insensitive.
  const colorHexFormula = function (r) {
    const c = "$" + cname + r
    return (
      "=IF(" +
      c +
      '="","",IFERROR(VLOOKUP(' +
      c +
      ",'" +
      SHEET_HEXCOLOR +
      "'!$A:$B,2,FALSE),\"\"))"
    )
  }

  const multCol = []
  const pvCol = []
  const vMultCol = []
  const vPvCol = []
  const colorHexCol = []
  for (let i = 0; i < DATA_ROWS; i++) {
    const r = i + 2
    multCol.push([multiplierFormula(dp, r)])
    pvCol.push([pvFormula(dp, mult, r)])
    vMultCol.push([multiplierFormula(vdp, r)])
    vPvCol.push([pvFormula(vdp, vmult, r)])
    colorHexCol.push([colorHexFormula(r)])
  }

  sh.getRange(
    2,
    COL["Reversed PV Multiplier (AUTO)"],
    DATA_ROWS,
    1
  ).setFormulas(multCol)
  sh.getRange(2, COL["Product PV (AUTO)"], DATA_ROWS, 1).setFormulas(pvCol)
  sh.getRange(
    2,
    COL["Variant Reversed PV Multiplier (AUTO)"],
    DATA_ROWS,
    1
  ).setFormulas(vMultCol)
  sh.getRange(2, COL["Variant PV (AUTO)"], DATA_ROWS, 1).setFormulas(vPvCol)
  sh.getRange(2, COL["Color Hex"], DATA_ROWS, 1).setFormulas(colorHexCol)
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

    // Handle single edits and multi-row fills/pastes that span these columns.
    // (Color Name -> Color Hex is handled by the VLOOKUP formula in the sheet,
    // not here.)
    const touchesCategory =
      COL["Category"] >= startCol && COL["Category"] <= endCol
    const touchesCompany =
      COL["Merchant"] >= startCol && COL["Merchant"] <= endCol
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
