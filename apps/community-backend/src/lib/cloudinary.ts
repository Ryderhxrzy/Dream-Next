import { createHash } from "node:crypto";

import { config } from "../config/config.js";

type CloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
  width: number | null;
  height: number | null;
  format: string | null;
};

export async function uploadImageToCloudinary(file: File, folder: string) {
  const config = readCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createCloudinarySignature(
    {
      folder,
      timestamp,
    },
    config.apiSecret,
  );

  const form = new FormData();
  form.set("file", file);
  form.set("folder", folder);
  form.set("timestamp", timestamp);
  form.set("api_key", config.apiKey);
  form.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      isRecord(body) && isRecord(body.error) && typeof body.error.message === "string"
        ? body.error.message
        : "Cloudinary image upload failed";

    throw new Error(message);
  }

  if (!isRecord(body) || typeof body.secure_url !== "string") {
    throw new Error("Cloudinary returned an invalid upload response");
  }

  return {
    publicId: typeof body.public_id === "string" ? body.public_id : "",
    secureUrl: body.secure_url,
    width: typeof body.width === "number" ? body.width : null,
    height: typeof body.height === "number" ? body.height : null,
    format: typeof body.format === "string" ? body.format : null,
  } satisfies CloudinaryUploadResult;
}

function readCloudinaryConfig() {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function createCloudinarySignature(
  params: Record<string, string>,
  apiSecret: string,
) {
  const payload = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
