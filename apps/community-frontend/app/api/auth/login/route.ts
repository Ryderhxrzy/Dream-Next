import { NextResponse, type NextRequest } from "next/server";

const AFHOME_API_URL =
  process.env.NEXT_PUBLIC_AFHOME_API_URL ?? "https://backend.afhome.ph";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ message: "Invalid login request" }, { status: 422 });
  }

  try {
    const response = await fetch(`${AFHOME_API_URL}/api/auth/mobile/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "Login failed" },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Unable to reach AF Home login service" },
      { status: 502 },
    );
  }
}
