export async function revalidateDreamBuild() {
  try {
    const response = await fetch("/api/revalidate/dreambuild", {
      method: "POST",
    })

    return response.ok
  } catch {
    return false
  }
}
