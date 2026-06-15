import { supplierAuthOptions } from "@/libs/supplierAuth"
import NextAuth from "next-auth"

const handler = NextAuth(supplierAuthOptions)

export { handler as GET, handler as POST }
