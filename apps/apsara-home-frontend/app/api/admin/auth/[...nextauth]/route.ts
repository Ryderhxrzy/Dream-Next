import { adminAuthOptions } from "@/libs/adminAuth"
import NextAuth from "next-auth"

const handler = NextAuth(adminAuthOptions)

export { handler as GET, handler as POST }
