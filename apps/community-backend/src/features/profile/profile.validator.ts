const MAX_BIO = 500
const MAX_LOCATION = 120
const MAX_SHORT = 120
const MAX_INTERESTS = 8
const MAX_INTEREST_LEN = 30

export type UpdateProfileInput = {
  bio: string | null
  location: string | null
  coverUrl: string | null
  occupation: string | null
  role: string | null
  interests: string[]
}

export function parseUpdateProfileInput(body: unknown) {
  if (!isRecord(body)) {
    return { data: null, error: "Invalid request body" }
  }

  const bio = parseOptionalString(body.bio)
  if (bio && bio.length > MAX_BIO) {
    return { data: null, error: `bio must be at most ${MAX_BIO} characters` }
  }

  const location = parseOptionalString(body.location)
  if (location && location.length > MAX_LOCATION) {
    return {
      data: null,
      error: `location must be at most ${MAX_LOCATION} characters`,
    }
  }

  const coverUrl = parseOptionalString(body.coverUrl)

  const occupation = parseOptionalString(body.occupation)
  if (occupation && occupation.length > MAX_SHORT) {
    return {
      data: null,
      error: `occupation must be at most ${MAX_SHORT} characters`,
    }
  }

  const role = parseOptionalString(body.role)
  if (role && role.length > MAX_SHORT) {
    return { data: null, error: `role must be at most ${MAX_SHORT} characters` }
  }

  let interests: string[] = []
  if (Array.isArray(body.interests)) {
    interests = body.interests
      .map((i) => (typeof i === "string" ? i.trim() : ""))
      .filter((i) => i.length > 0 && i.length <= MAX_INTEREST_LEN)
      .slice(0, MAX_INTERESTS)
  }

  const data: UpdateProfileInput = {
    bio,
    location,
    coverUrl,
    occupation,
    role,
    interests,
  }
  return { data, error: null }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null
  return String(value).trim()
}
