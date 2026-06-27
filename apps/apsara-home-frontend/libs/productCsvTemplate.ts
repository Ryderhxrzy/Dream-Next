// Product CSV Import Template Generator
// Generates the single CSV template used by the product import flow.

export interface FieldDefinition {
  name: string
  label: string
  type: "text" | "number" | "url" | "boolean" | "choice"
  required: boolean
  description: string
  example?: string
  choices?: string[]
}

export const PRODUCT_CSV_FIELDS: FieldDefinition[] = [
  {
    name: "pd_name",
    label: "Product Name",
    type: "text",
    required: true,
    description: "The name/title of the product",
    example: "Modern Living Room Chair",
  },
  {
    name: "pd_catid",
    label: "Category ID",
    type: "number",
    required: true,
    description:
      "Category name or numeric ID of the product category. View all categories in Admin > Products > Categories.",
    example: "12",
  },
  {
    name: "pd_price_srp",
    label: "SRP (Suggested Retail Price)",
    type: "number",
    required: true,
    description: "Suggested retail price in PHP (base price)",
    example: "4999.00",
  },
  {
    name: "pd_parent_sku",
    label: "SKU (Stock Keeping Unit)",
    type: "text",
    required: false,
    description:
      'Unique identifier for the product. Used for "Create or Update" mode to match products',
    example: "CHAIR-LIV-001",
  },
  {
    name: "pd_brand_type",
    label: "Brand ID",
    type: "number",
    required: false,
    description: "Numeric ID of the product brand",
    example: "5",
  },
  {
    name: "pd_catsubid",
    label: "Subcategory ID",
    type: "number",
    required: false,
    description: "Numeric ID of the product subcategory (if applicable)",
    example: "45",
  },
  {
    name: "pd_room_type",
    label: "Room Type",
    type: "choice",
    required: false,
    description: "Room type label or numeric ID.",
    example: "1",
    choices: ["1", "2", "3", "4", "5", "6", "7"],
  },
  {
    name: "pd_price_dp",
    label: "DP Price (Distributor Price)",
    type: "number",
    required: false,
    description: "Special pricing for distributor members",
    example: "3999.00",
  },
  {
    name: "pd_price_member",
    label: "Member Price",
    type: "number",
    required: false,
    description: "Special pricing for regular members",
    example: "3599.00",
  },
  {
    name: "pd_prodpv",
    label: "Product PV (Point Value)",
    type: "number",
    required: false,
    description:
      "Points earned when product is purchased. Leave blank to auto-compute from PV multiplier.",
    example: "100",
  },
  {
    name: "pd_pricing_tier",
    label: "PV Pricing Tier",
    type: "choice",
    required: false,
    description: "Pricing tier used for PV computation: low_end or high_end",
    example: "low_end",
    choices: ["low_end", "high_end"],
  },
  {
    name: "pd_reversed_pv_multiplier",
    label: "PV Multiplier (Reversed)",
    type: "number",
    required: false,
    description:
      "Used to auto-compute PV from DP price. Leave blank if providing pd_prodpv directly.",
    example: "0.25",
  },
  {
    name: "pd_qty",
    label: "Quantity",
    type: "number",
    required: false,
    description: "Initial stock quantity",
    example: "50",
  },
  {
    name: "pd_weight",
    label: "Weight (kg)",
    type: "number",
    required: false,
    description: "Product weight for shipping calculations",
    example: "12.5",
  },
  {
    name: "pd_psweight",
    label: "Packaged Weight (kg)",
    type: "number",
    required: false,
    description: "Weight including packaging",
    example: "14.0",
  },
  {
    name: "pd_pswidth",
    label: "Packaged Width (cm)",
    type: "number",
    required: false,
    description: "Width of packaged product",
    example: "120",
  },
  {
    name: "pd_pslenght",
    label: "Packaged Length (cm)",
    type: "number",
    required: false,
    description:
      'Length of packaged product (note: field name has typo "pslenght")',
    example: "80",
  },
  {
    name: "pd_psheight",
    label: "Packaged Height (cm)",
    type: "number",
    required: false,
    description: "Height of packaged product",
    example: "40",
  },
  {
    name: "pd_description",
    label: "Description",
    type: "text",
    required: false,
    description:
      "Detailed product description. Can use HTML tags. For multi-line, wrap in quotes",
    example: "Premium quality chair with ergonomic design",
  },
  {
    name: "pd_specifications",
    label: "Specifications",
    type: "text",
    required: false,
    description: "Product specifications (materials, features, etc.)",
    example: "Fabric: Premium leather, Legs: Solid wood",
  },
  {
    name: "pd_material",
    label: "Material",
    type: "text",
    required: false,
    description: "Primary material composition",
    example: "Premium Leather",
  },
  {
    name: "pd_warranty",
    label: "Warranty",
    type: "choice",
    required: false,
    description: "Warranty period (pick one of the ready-made options)",
    example: "1 Year Warranty",
    choices: [
      "No Warranty",
      "15 Days Warranty",
      "1 Month Warranty",
      "2 Months Warranty",
      "3 Months Warranty",
      "6 Months Warranty",
      "9 Months Warranty",
      "1 Year Warranty",
    ],
  },
  {
    name: "pd_images",
    label: "Product Images (Multiple URLs)",
    type: "url",
    required: false,
    description: "Multiple image URLs separated by pipe character (|)",
    example:
      "https://example.com/chair-001.jpg|https://example.com/chair-002.jpg|https://example.com/chair-003.jpg",
  },
  {
    name: "pd_type",
    label: "Product Type",
    type: "choice",
    required: false,
    description: "Type: simple, variable (for products with variants)",
    example: "simple",
    choices: ["simple", "variable"],
  },
  {
    name: "pd_status",
    label: "Status",
    type: "choice",
    required: false,
    description: "Active or Inactive",
    example: "Active",
    choices: ["Active", "Inactive"],
  },
  {
    name: "pd_musthave",
    label: "Must Have",
    type: "boolean",
    required: false,
    description:
      "Active or Inactive-style flag column. Use 1 for active and 0 for inactive.",
    example: "0",
  },
  {
    name: "pd_bestseller",
    label: "Best Seller",
    type: "boolean",
    required: false,
    description: "Mark as bestseller (1=yes, 0=no)",
    example: "1",
  },
  {
    name: "pd_salespromo",
    label: "Sales Promo",
    type: "boolean",
    required: false,
    description: "Include in sales promotion (1=yes, 0=no)",
    example: "0",
  },
  {
    name: "pd_assembly_required",
    label: "Assembly Required",
    type: "boolean",
    required: false,
    description: "Requires assembly (1=yes, 0=no)",
    example: "1",
  },
  {
    name: "pd_verified",
    label: "Verified",
    type: "boolean",
    required: false,
    description: "Product verified status (1=yes, 0=no)",
    example: "0",
  },
  {
    name: "pd_manual_checkout_enabled",
    label: "Manual Checkout Enabled",
    type: "boolean",
    required: false,
    description:
      "Allow product to go through manual checkout flow (1=yes, 0=no)",
    example: "0",
  },
  // --- Variant columns (one row per variant) --------------------------------
  // Use ONE ROW PER VARIANT: repeat the same pd_parent_sku on every variant
  // row of a product, fill the product (pd_*) fields on the FIRST row only, and
  // fill the variant (pv_*) fields on EACH row. Any row with a pv_sku is treated
  // as a variant; a product with variants is set to "variable" automatically.
  {
    name: "pv_sku",
    label: "Variant SKU",
    type: "text",
    required: false,
    description:
      "Unique SKU for this variant. A row with a Variant SKU is grouped under the product sharing its pd_parent_sku.",
    example: "CHAIR-OFF-001-BLK",
  },
  {
    name: "pv_name",
    label: "Variant Name",
    type: "text",
    required: false,
    description: "Display name for this variant",
    example: "Black",
  },
  {
    name: "pv_color",
    label: "Color Name",
    type: "text",
    required: false,
    description: "Color name of the variant",
    example: "Black",
  },
  {
    name: "pv_color_hex",
    label: "Color Hex",
    type: "text",
    required: false,
    description: "Hex color code for the variant swatch",
    example: "#1A1A1A",
  },
  {
    name: "pv_size",
    label: "Variant Size",
    type: "text",
    required: false,
    description: "Size label of the variant",
    example: "Large",
  },
  {
    name: "pv_style",
    label: "Variant Style",
    type: "text",
    required: false,
    description: "Style label of the variant",
    example: "Modern",
  },
  {
    name: "pv_width",
    label: "Variant Width",
    type: "number",
    required: false,
    description: "Width of the variant",
    example: "60",
  },
  {
    name: "pv_dimension",
    label: "Variant Dimension",
    type: "number",
    required: false,
    description: "Dimension of the variant",
    example: "120",
  },
  {
    name: "pv_height",
    label: "Variant Height",
    type: "number",
    required: false,
    description: "Height of the variant",
    example: "90",
  },
  {
    name: "pv_price_srp",
    label: "Variant Price SRP",
    type: "number",
    required: false,
    description: "SRP price for this variant",
    example: "6999.00",
  },
  {
    name: "pv_price_dp",
    label: "Variant Price DP",
    type: "number",
    required: false,
    description: "DP price for this variant",
    example: "5599.00",
  },
  {
    name: "pv_price_member",
    label: "Variant Price Member",
    type: "number",
    required: false,
    description: "Member price for this variant",
    example: "4999.00",
  },
  {
    name: "pv_prodpv",
    label: "Variant PV",
    type: "number",
    required: false,
    description:
      "Point value for this variant. Leave blank to auto-compute from the variant DP price.",
    example: "100",
  },
  {
    name: "pv_qty",
    label: "Variant Qty",
    type: "number",
    required: false,
    description: "Stock quantity for this variant",
    example: "15",
  },
  {
    name: "pv_status",
    label: "Variant Status",
    type: "choice",
    required: false,
    description: "Active or Inactive (set on every variant row)",
    example: "Active",
    choices: ["Active", "Inactive"],
  },
  {
    name: "pv_images",
    label: "Variant Images",
    type: "url",
    required: false,
    description: "Variant image URLs separated by pipe character (|)",
    example:
      "https://example.com/chair-black-001.jpg|https://example.com/chair-black-002.jpg",
  },
]

const SAMPLE_PRODUCTS = [
  {
    pd_name: "Modern Living Room Chair",
    pd_parent_sku: "CHAIR-LIV-001",
    pd_catid: 12,
    pd_room_type: 1,
    pd_brand_type: 5,
    pd_price_srp: 4999.0,
    pd_price_dp: 3999.0,
    pd_price_member: 3599.0,
    pd_prodpv: 100,
    pd_qty: 50,
    pd_weight: 12.5,
    pd_psweight: 14.0,
    pd_pswidth: 120,
    pd_pslenght: 80,
    pd_psheight: 40,
    pd_material: "Premium Leather",
    pd_warranty: "1 Year Warranty",
    pd_status: 1,
    pd_bestseller: 1,
    pd_assembly_required: 1,
  },
  {
    pd_name: "Wooden Dining Table",
    pd_parent_sku: "TABLE-DIN-001",
    pd_catid: 15,
    pd_room_type: 4,
    pd_brand_type: 3,
    pd_price_srp: 8999.0,
    pd_price_dp: 7199.0,
    pd_price_member: 6499.0,
    pd_prodpv: 150,
    pd_qty: 25,
    pd_weight: 45.0,
    pd_psweight: 50.0,
    pd_pswidth: 180,
    pd_pslenght: 100,
    pd_psheight: 80,
    pd_material: "Solid Mahogany",
    pd_warranty: "6 Months Warranty",
    pd_status: 1,
    pd_musthave: 1,
  },
  {
    pd_name: "Bedroom Queen Bed Frame",
    pd_parent_sku: "BED-QUEEN-001",
    pd_catid: 18,
    pd_room_type: 2,
    pd_brand_type: 7,
    pd_price_srp: 12999.0,
    pd_price_dp: 10399.0,
    pd_price_member: 9399.0,
    pd_prodpv: 200,
    pd_qty: 30,
    pd_weight: 65.0,
    pd_psweight: 72.0,
    pd_pswidth: 200,
    pd_pslenght: 160,
    pd_psheight: 45,
    pd_material: "Steel + Wood",
    pd_warranty: "1 Year Warranty",
    pd_status: 1,
    pd_assembly_required: 1,
  },
  // Variant product — first row carries the product fields + the first variant.
  {
    pd_name: "Ergonomic Office Chair",
    pd_parent_sku: "CHAIR-OFF-001",
    pd_catid: 25,
    pd_room_type: 5,
    pd_brand_type: 5,
    pd_price_srp: 6999.0,
    pd_price_dp: 5599.0,
    pd_price_member: 4999.0,
    pd_material: "Mesh + Aluminum",
    pd_warranty: "1 Year Warranty",
    pd_type: "variable",
    pd_status: 1,
    pv_sku: "CHAIR-OFF-001-BLK",
    pv_name: "Black",
    pv_color: "Black",
    pv_color_hex: "#1A1A1A",
    pv_price_srp: 6999.0,
    pv_price_dp: 5599.0,
    pv_price_member: 4999.0,
    pv_qty: 15,
    pv_status: "Active",
  },
  // Following variant rows repeat ONLY the parent SKU + the variant (pv_*) fields.
  {
    pd_parent_sku: "CHAIR-OFF-001",
    pv_sku: "CHAIR-OFF-001-GRY",
    pv_name: "Gray",
    pv_color: "Gray",
    pv_color_hex: "#808080",
    pv_price_srp: 6999.0,
    pv_price_dp: 5599.0,
    pv_price_member: 4999.0,
    pv_qty: 10,
    pv_status: "Active",
  },
]

export function buildTemplateWithInstructions(): string {
  const lines: string[] = []

  lines.push("# AFHOME PRODUCT CSV IMPORT TEMPLATE")
  lines.push("# Generated for easy bulk product uploads")
  lines.push("")
  lines.push("## INSTRUCTIONS:")
  lines.push("# 1. REQUIRED FIELDS (must fill in ALL of these):")
  lines.push("#    - pd_name: Product name")
  lines.push(
    '#    - pd_catid: Category ID (numeric, see "Category Reference" section below)'
  )
  lines.push("#    - pd_price_srp: SRP price in PHP")
  lines.push("#")
  lines.push("# 2. OPTIONAL FIELDS: Leave blank if not applicable")
  lines.push(
    '#    - SKU is important for "Create or Update" mode (matches existing products)'
  )
  lines.push(
    "#    - For multiple images, store them in pd_images separated by pipe character: url1|url2|url3"
  )
  lines.push(
    "#    - Prices and quantities should be numeric only (no commas, no currency symbols)"
  )
  lines.push("#    - Boolean fields use 1=yes, 0=no")
  lines.push("#")
  lines.push("# 3. VARIANTS (one row per variant):")
  lines.push(
    "#    - Use ONE ROW PER VARIANT and repeat the SAME pd_parent_sku on every row of that product."
  )
  lines.push(
    "#    - Fill the product (pd_*) fields on the FIRST variant row only; leave them blank on the following rows."
  )
  lines.push(
    "#    - Fill the variant (pv_*) fields on EACH row. pv_sku + pv_status are required per variant."
  )
  lines.push(
    "#    - Any row with a pv_sku is grouped as a variant; the product is set to pd_type=variable automatically."
  )
  lines.push("#")
  lines.push("# 4. NOTES:")
  lines.push(
    '#    - Text with commas or special chars should be wrapped in quotes: "Text, with, commas"'
  )
  lines.push(
    "#    - Leave required fields empty to skip that row (it will be marked as failed)"
  )
  lines.push("#    - Always use CSV format (comma-separated values)")
  lines.push("#")
  lines.push("## CATEGORY REFERENCE:")
  lines.push("# Common categories (use pd_catid for these):")
  lines.push("# 12 = Living Room Furniture")
  lines.push("# 15 = Dining Room Furniture")
  lines.push("# 18 = Bedroom Furniture")
  lines.push("# 20 = Kitchen & Dining")
  lines.push("# 25 = Office Furniture")
  lines.push("# 28 = Outdoor Furniture")
  lines.push("# 30 = Decorative Items")
  lines.push("# NOTE: See Admin > Products > Categories page for complete list")
  lines.push("")
  lines.push("## FIELD DEFINITIONS:")

  PRODUCT_CSV_FIELDS.forEach((field) => {
    const req = field.required ? "[REQUIRED]" : "[optional]"
    lines.push(`# ${field.name}: ${field.label} ${req}`)
    lines.push(`#   Type: ${field.type}`)
    lines.push(`#   Description: ${field.description}`)
    if (field.example) {
      lines.push(`#   Example: ${field.example}`)
    }
    if (field.choices && field.choices.length > 0) {
      lines.push(`#   Valid values: ${field.choices.join(", ")}`)
    }
  })

  lines.push("")
  lines.push("## SAMPLE DATA (uncomment or modify to use):")
  lines.push("")

  // Header row — all fields
  const headerCols = PRODUCT_CSV_FIELDS.map((f) => f.name)
  lines.push(headerCols.join(","))

  // Sample rows
  SAMPLE_PRODUCTS.forEach((product) => {
    const row = headerCols.map((col) => {
      const val = product[col as keyof typeof product]
      if (typeof val === "string" && val.includes(",")) {
        return `"${val}"`
      }
      return String(val ?? "")
    })
    lines.push(row.join(","))
  })

  return lines.join("\n")
}

export function buildSimpleTemplate(): string {
  const headerCols = [
    "pd_name",
    "pd_parent_sku",
    "pd_catid",
    "pd_price_srp",
    "pd_price_dp",
    "pd_price_member",
    "pd_qty",
    "pd_weight",
    "pd_material",
    "pd_status",
  ]

  const rows: string[] = [headerCols.join(",")]

  SAMPLE_PRODUCTS.forEach((product) => {
    const row = headerCols.map((col) => {
      const val = product[col as keyof typeof product]
      if (typeof val === "string" && val.includes(",")) {
        return `"${val}"`
      }
      return String(val ?? "")
    })
    rows.push(row.join(","))
  })

  return rows.join("\n")
}

export function buildAllFieldsTemplate(): string {
  const headerCols = PRODUCT_CSV_FIELDS.map((f) => f.name)
  const rows: string[] = [headerCols.join(",")]

  SAMPLE_PRODUCTS.forEach((product) => {
    const row = headerCols.map((col) => {
      const val = product[col as keyof typeof product]
      if (typeof val === "string" && val.includes(",")) {
        return `"${val}"`
      }
      return String(val ?? "")
    })
    rows.push(row.join(","))
  })

  return rows.join("\n")
}
