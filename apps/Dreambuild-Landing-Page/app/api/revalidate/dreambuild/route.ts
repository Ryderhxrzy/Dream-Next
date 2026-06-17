import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { DREAMBUILD_CONTENT_TAG } from "@/lib/dreambuild-cms"

export async function POST(request: Request) {
  const expectedSecret = process.env.DREAMBUILD_REVALIDATE_SECRET
  const providedSecret = request.headers.get("x-dreambuild-revalidate-secret")

  if (process.env.NODE_ENV === "production" && !expectedSecret) {
    return NextResponse.json(
      { message: "DreamBuild revalidate secret is not configured" },
      { status: 503 }
    )
  }

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  revalidateTag(DREAMBUILD_CONTENT_TAG, "max")

  return NextResponse.json({ revalidated: true })
}
