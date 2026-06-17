import { revalidateTag } from "next/cache"

export async function revalidateDreamBuild() {
  try {
    await fetch("/api/revalidate/dreambuild", {
      method: "POST",
    })
  } catch {
    // Best-effort cache refresh only.
  }
}
