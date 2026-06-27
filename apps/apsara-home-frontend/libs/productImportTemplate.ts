// Product bulk-import Excel template generator (Excel desktop).
//
// Produces an .xlsx whose columns match the product CSV export/import contract
// in ProductController, plus two helper columns (Subcategory, Merchant) so the
// dependent dropdowns make data entry easier.
//
// Dropdowns:
//   - Category .......... flat list of top-level categories (API)
//   - Subcategory ....... CASCADES from the chosen Category (its children)
//   - Merchant .......... flat list of merchants/suppliers (API, from brands)
//   - Brand ............. CASCADES from the chosen Merchant (its brands)
//   - Room Type / Pricing Tier / Product Type / Status / Warranty / booleans ... flat lists
//   - Variant Status .... flat list (purple variant columns on the right)
//
// Variants: use ONE ROW PER VARIANT — repeat the same Parent SKU on every row,
// fill the product fields on the first row, and the variant (purple) columns on
// each row. The two variant "(AUTO)" columns compute PV from Variant Price DP.
//
// Cascading is implemented with the OFFSET/MATCH/COUNTIF data-validation
// technique (robust for names containing spaces, "&", commas, etc. — unlike
// INDIRECT + named ranges). This works in Excel desktop. NOTE: if the file is
// opened/imported into Google Sheets, the cascading validations will not carry
// over (Sheets does not support formula-range data validations on import).
//
// Real Excel data validations require exceljs (the SheetJS `xlsx` build used
// elsewhere cannot WRITE data validations).

import { ROOM_OPTIONS } from "@/libs/roomConfig"

export interface TemplateCategory {
  id: number
  name: string
  parent_id?: number | null
}

export interface TemplateBrand {
  id: number
  name: string
  supplier_name?: string | null
}

type ListKey = "categories" | "companies" | "rooms" | "tiers" | "types" | "statuses" | "bool" | "warranties"
type CascadeSheet = "CatSub" | "CompBrand"

interface TemplateColumn {
  header: string
  width?: number
  // Flat dropdown sourced from the hidden "Lists" sheet.
  list?: ListKey
  // Dependent dropdown sourced from a 2-column (parent, child) helper sheet,
  // filtered by the value chosen in `parentHeader`.
  cascade?: { sheet: CascadeSheet; parentHeader: string }
  required?: boolean
  auto?: boolean
  // Variant column (one row per variant). Tinted purple to mirror the Google Sheet.
  variant?: boolean
}

// Order/labels follow ProductController::exportCsv, with Subcategory inserted
// after Category and Merchant inserted before Brand.
const COLUMNS: TemplateColumn[] = [
  { header: "Main Product Name", width: 28, required: true },
  { header: "Parent SKU", width: 18, required: true },
  { header: "Category", width: 22, list: "categories", required: true },
  { header: "Subcategory", width: 22, cascade: { sheet: "CatSub", parentHeader: "Category" } },
  { header: "Room Type", width: 16, list: "rooms" },
  { header: "Merchant", width: 22, list: "companies" },
  { header: "Brand", width: 20, cascade: { sheet: "CompBrand", parentHeader: "Merchant" } },
  { header: "Price SRP", width: 14, required: true },
  { header: "Price DP", width: 14 },
  { header: "Price Member", width: 14 },
  { header: "Product PV (AUTO)", width: 16, auto: true },
  { header: "PV Pricing Tier", width: 16, list: "tiers" },
  { header: "Reversed PV Multiplier (AUTO)", width: 24, auto: true },
  { header: "Quantity", width: 12 },
  { header: "Weight", width: 12 },
  { header: "Package Weight", width: 14 },
  { header: "Package Width", width: 14 },
  { header: "Package Length", width: 14 },
  { header: "Package Height", width: 14 },
  { header: "Description", width: 30 },
  { header: "Specifications", width: 30 },
  { header: "Material", width: 18 },
  { header: "Warranty", width: 18, list: "warranties" },
  { header: "Images", width: 30 },
  { header: "Product Type", width: 16, list: "types" },
  { header: "Status", width: 12, list: "statuses" },
  { header: "Must Have", width: 12, list: "bool" },
  { header: "Best Seller", width: 12, list: "bool" },
  { header: "Sales Promo", width: 12, list: "bool" },
  { header: "Assembly Required", width: 16, list: "bool" },
  { header: "Verified", width: 12, list: "bool" },
  // --- Variant columns (one row per variant) --------------------------------
  // Repeat the same Parent SKU on every variant row; fill the product fields on
  // the FIRST row and the variant fields on EACH row. The two "(AUTO)" columns
  // compute themselves from Variant Price DP (leave them blank).
  { header: "Variant SKU", width: 18, variant: true },
  { header: "Variant Name", width: 18, variant: true },
  { header: "Color Name", width: 16, variant: true },
  { header: "Color Hex", width: 12, variant: true },
  { header: "Variant Size", width: 14, variant: true },
  { header: "Variant Style", width: 14, variant: true },
  { header: "Variant Width", width: 14, variant: true },
  { header: "Variant Dimension", width: 16, variant: true },
  { header: "Variant Height", width: 14, variant: true },
  { header: "Variant Price SRP", width: 16, variant: true },
  { header: "Variant Price DP", width: 16, variant: true },
  { header: "Variant Price Member", width: 18, variant: true },
  { header: "Variant Reversed PV Multiplier (AUTO)", width: 24, auto: true, variant: true },
  { header: "Variant PV (AUTO)", width: 16, auto: true, variant: true },
  { header: "Variant Qty", width: 12, variant: true },
  { header: "Variant Status", width: 14, list: "statuses", variant: true },
  { header: "Variant Images", width: 30, variant: true },
]

// Rows pre-armed with dropdowns for data entry. Copying a row down in Excel
// extends the validations to new rows.
const DATA_ROWS = 300

const UNASSIGNED_COMPANY = "— Unassigned —"

const cleanName = (value: string | null | undefined) => (value ?? "").trim()

// 1-based column index -> spreadsheet column letter (1 -> A, 27 -> AA).
const columnLetter = (index: number): string => {
  let result = ""
  let n = index
  while (n > 0) {
    const remainder = (n - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

// Build the ordered (parent -> children) groups that back a cascading dropdown.
// Every parent gets at least one row so OFFSET/COUNTIF never returns an empty
// range (which would surface as a #REF! error in the dropdown).
interface CascadeGroup {
  parents: string[]
  rows: Array<[string, string]>
}

const buildCategoryGroups = (categories: TemplateCategory[]): CascadeGroup => {
  const nameById = new Map<number, string>()
  categories.forEach((category) => {
    const name = cleanName(category.name)
    if (name) nameById.set(category.id, name)
  })

  const isTopLevel = (category: TemplateCategory) =>
    category.parent_id === null ||
    category.parent_id === undefined ||
    category.parent_id === 0

  const childrenByParent = new Map<string, string[]>()
  const parentOrder: string[] = []
  const ensureParent = (parentName: string) => {
    if (!childrenByParent.has(parentName)) {
      childrenByParent.set(parentName, [])
      parentOrder.push(parentName)
    }
  }

  // Seed every top-level category so categories without children still appear.
  categories.filter(isTopLevel).forEach((category) => {
    const name = cleanName(category.name)
    if (name) ensureParent(name)
  })

  // Attach each subcategory under its resolved parent name.
  categories
    .filter((category) => !isTopLevel(category))
    .forEach((category) => {
      const childName = cleanName(category.name)
      const parentName = nameById.get(Number(category.parent_id))
      if (!childName || !parentName) return
      ensureParent(parentName)
      const children = childrenByParent.get(parentName)!
      if (!children.some((c) => c.toLowerCase() === childName.toLowerCase())) {
        children.push(childName)
      }
    })

  const rows: Array<[string, string]> = []
  parentOrder.forEach((parent) => {
    const children = childrenByParent.get(parent) ?? []
    if (children.length === 0) {
      rows.push([parent, ""]) // keep the range non-empty
    } else {
      children.forEach((child) => rows.push([parent, child]))
    }
  })

  return { parents: parentOrder, rows }
}

const buildBrandGroups = (brands: TemplateBrand[]): CascadeGroup => {
  const brandsByCompany = new Map<string, string[]>()
  const companyOrder: string[] = []
  const ensureCompany = (company: string) => {
    if (!brandsByCompany.has(company)) {
      brandsByCompany.set(company, [])
      companyOrder.push(company)
    }
  }

  brands.forEach((brand) => {
    const brandName = cleanName(brand.name)
    if (!brandName) return
    const company = cleanName(brand.supplier_name) || UNASSIGNED_COMPANY
    ensureCompany(company)
    const list = brandsByCompany.get(company)!
    if (!list.some((b) => b.toLowerCase() === brandName.toLowerCase())) {
      list.push(brandName)
    }
  })

  const rows: Array<[string, string]> = []
  companyOrder.forEach((company) => {
    const list = brandsByCompany.get(company) ?? []
    if (list.length === 0) {
      rows.push([company, ""])
    } else {
      list.forEach((brand) => rows.push([company, brand]))
    }
  })

  return { parents: companyOrder, rows }
}

export async function downloadProductImportTemplate(opts: {
  categories: TemplateCategory[]
  brands: TemplateBrand[]
  fileName?: string
}): Promise<void> {
  // exceljs ships a CJS/UMD build; the namespace may be on `.default` or direct.
  const exceljsModule = await import("exceljs")
  const ExcelJS = exceljsModule.default ?? exceljsModule
  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date(0)

  const categoryGroups = buildCategoryGroups(opts.categories)
  const brandGroups = buildBrandGroups(opts.brands)

  const listValues: Record<ListKey, string[]> = {
    categories: categoryGroups.parents,
    companies: brandGroups.parents,
    rooms: ROOM_OPTIONS.map((room) => room.label),
    tiers: ["Low-End", "High-End"],
    types: ["Simple", "Has Variants"],
    statuses: ["Active", "Inactive"],
    bool: ["Active", "Inactive"],
    // Ready-made Warranty options — keep in sync with AddProductModal WARRANTY_OPTIONS.
    warranties: [
      "No Warranty",
      "15 Days Warranty",
      "1 Month Warranty",
      "2 Months Warranty",
      "3 Months Warranty",
      "6 Months Warranty",
      "9 Months Warranty",
      "1 Year Warranty",
    ],
  }

  // Excel will not evaluate a data-validation formula that references another
  // sheet directly (e.g. OFFSET(CatSub!..)) — it silently drops the dropdown.
  // The accepted workaround is to expose every source range as a workbook
  // DEFINED NAME and reference the name instead. So each list/helper range gets
  // a name here, and all validations below reference names only.
  const listName = (key: ListKey) => `list_${key}`
  const cascadeName: Record<CascadeSheet, { parent: string; child: string }> = {
    CatSub: { parent: "catsub_parent", child: "catsub_child" },
    CompBrand: { parent: "compbrand_parent", child: "compbrand_child" },
  }

  // --- Hidden "Lists" sheet: one column per flat dropdown -------------------
  const lists = workbook.addWorksheet("Lists", { state: "hidden" })
  ;(Object.keys(listValues) as ListKey[]).forEach((key, columnIndex) => {
    const column = columnIndex + 1
    const letter = columnLetter(column)
    lists.getCell(1, column).value = key
    listValues[key].forEach((value, rowIndex) => {
      lists.getCell(rowIndex + 2, column).value = value
    })
    const lastRow = Math.max(listValues[key].length + 1, 2)
    workbook.definedNames.add(
      `Lists!$${letter}$2:$${letter}$${lastRow}`,
      listName(key)
    )
  })

  // --- Hidden cascade helper sheets (parent, child) -------------------------
  const writeCascadeSheet = (name: CascadeSheet, group: CascadeGroup) => {
    const sheet = workbook.addWorksheet(name, { state: "hidden" })
    sheet.getCell(1, 1).value = "parent"
    sheet.getCell(1, 2).value = "child"
    group.rows.forEach((pair, index) => {
      sheet.getCell(index + 2, 1).value = pair[0]
      sheet.getCell(index + 2, 2).value = pair[1]
    })
    const last = Math.max(group.rows.length + 1, 2)
    workbook.definedNames.add(`${name}!$A$2:$A$${last}`, cascadeName[name].parent)
    workbook.definedNames.add(`${name}!$B$2:$B$${last}`, cascadeName[name].child)
  }
  writeCascadeSheet("CatSub", categoryGroups)
  writeCascadeSheet("CompBrand", brandGroups)

  // --- Products sheet -------------------------------------------------------
  const sheet = workbook.addWorksheet("Products", {
    views: [{ state: "frozen", ySplit: 1 }],
  })
  sheet.columns = COLUMNS.map((column) => ({
    header: column.header,
    width: column.width ?? 18,
  }))

  // Force SKU columns to Text so long numeric SKUs aren't mangled by Excel into
  // scientific notation (e.g. 5.75334E+12), which would corrupt the SKU on
  // import and can collapse distinct SKUs onto the same rounded value.
  COLUMNS.forEach((column, index) => {
    if (/sku/i.test(column.header)) {
      sheet.getColumn(index + 1).numFmt = "@"
    }
  })

  const headerIndex = new Map<string, number>()
  COLUMNS.forEach((column, index) => headerIndex.set(column.header, index + 1))

  const headerRow = sheet.getRow(1)
  headerRow.height = 22
  COLUMNS.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    const fill = column.auto
      ? "FFE11D48"
      : column.required
        ? "FF2563EB"
        : column.cascade
          ? "FF0F766E"
          : column.variant
            ? "FF6D28D9"
            : "FF334155"
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }
  })
  headerRow.commit()

  // --- Data validations -----------------------------------------------------
  COLUMNS.forEach((column, index) => {
    const columnNumber = index + 1

    for (let rowNumber = 2; rowNumber <= DATA_ROWS + 1; rowNumber += 1) {
      let formula: string | null = null

      if (column.list) {
        // Reference the workbook defined name, not the cross-sheet range.
        formula = listName(column.list)
      } else if (column.cascade) {
        const parentColumnNumber = headerIndex.get(column.cascade.parentHeader)
        if (parentColumnNumber) {
          const parentRef = `$${columnLetter(parentColumnNumber)}${rowNumber}`
          const names = cascadeName[column.cascade.sheet]
          // Children of the chosen parent: the contiguous block of `child`
          // names whose matching `parent` name equals this row's parent cell.
          // Uses defined names only so Excel accepts the cross-sheet lookup.
          formula =
            `OFFSET(${names.child},` +
            `MATCH(${parentRef},${names.parent},0)-1,0,` +
            `COUNTIF(${names.parent},${parentRef}),1)`
        }
      }

      if (!formula) continue

      sheet.getCell(rowNumber, columnNumber).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Value not in list",
        error: "Pick a value from the dropdown, or type an exact match.",
      }
    }
  })

  // --- Auto-computed PV formulas -------------------------------------------
  // Mirrors the in-app PV calculator (AddProductModal `deriveLowEndMultiplier`
  // + `deriveComputedPv`): for the Low-End tier the Reversed PV Multiplier is
  // derived from the Dealer (Price DP) band, then PV = Price DP × multiplier.
  // High-End is left blank (its formula is not finalised yet). These fill in
  // automatically as soon as Price DP is typed, so the red "(AUTO)" columns no
  // longer need to be hand-entered.
  const tierColIdx = headerIndex.get("PV Pricing Tier")

  // Fill the Reversed PV Multiplier + PV "(AUTO)" pair for a given Price DP
  // column. Used for both the product-level and the variant-level AUTO columns;
  // the variant formulas use the variant's own Price DP and inherit the row's
  // PV Pricing Tier.
  const writeAutoPv = (
    dpColIdx: number | undefined,
    multColIdx: number | undefined,
    pvColIdx: number | undefined
  ) => {
    if (!dpColIdx || !tierColIdx || !multColIdx || !pvColIdx) return
    const dpLetter = columnLetter(dpColIdx)
    const tierLetter = columnLetter(tierColIdx)
    const multLetter = columnLetter(multColIdx)

    for (let rowNumber = 2; rowNumber <= DATA_ROWS + 1; rowNumber += 1) {
      const dp = `$${dpLetter}${rowNumber}`
      const tier = `$${tierLetter}${rowNumber}`
      const mult = `$${multLetter}${rowNumber}`

      // Reversed PV Multiplier — auto for Low-End (or a blank tier, which
      // defaults to Low-End); blank for High-End.
      sheet.getCell(rowNumber, multColIdx).value = {
        formula:
          `IF(OR(${tier}="High-End",${dp}=""),"",` +
          `IF(${dp}<=999,0.5,IF(${dp}<=5000,0.4,IF(${dp}<25000,0.3,0.2))))`,
      }

      // PV = Price DP × Reversed PV Multiplier (rounded to 2 dp).
      sheet.getCell(rowNumber, pvColIdx).value = {
        formula: `IF(OR(${dp}="",${mult}=""),"",ROUND(${dp}*${mult},2))`,
      }
    }
  }

  writeAutoPv(
    headerIndex.get("Price DP"),
    headerIndex.get("Reversed PV Multiplier (AUTO)"),
    headerIndex.get("Product PV (AUTO)")
  )
  writeAutoPv(
    headerIndex.get("Variant Price DP"),
    headerIndex.get("Variant Reversed PV Multiplier (AUTO)"),
    headerIndex.get("Variant PV (AUTO)")
  )

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  triggerDownload(blob, opts.fileName ?? "product-import-template.xlsx")
}
