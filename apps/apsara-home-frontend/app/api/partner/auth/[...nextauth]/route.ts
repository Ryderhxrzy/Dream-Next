import { partnerAuthOptions } from "@/libs/partnerAuth"
import NextAuth from "next-auth"

const handler = NextAuth(partnerAuthOptions)

export { handler as GET, handler as POST }
