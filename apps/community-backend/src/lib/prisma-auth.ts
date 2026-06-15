import { PrismaPg } from "@prisma/adapter-pg"

import { config } from "../config/config.js"
import { PrismaClient } from "../generated/prisma/client.js"

// Separate Prisma client for the public schema where Laravel's
// tbl_customer and personal_access_tokens tables live.
const publicDatabaseUrl = config.databaseUrl.replace(/[?&]schema=[^&]+/, "")

const adapter = new PrismaPg(
  { connectionString: publicDatabaseUrl },
  { schema: "public" }
)

export const prismaAuth = new PrismaClient({ adapter })
