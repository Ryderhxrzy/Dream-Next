import {
  CommunityItemCondition,
  CommunityPostCategory,
} from "../../generated/prisma/enums.js";

const MAX_POST_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_POST_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function parseCreateCommunityPostInput(body: unknown) {
  if (!isRecord(body)) {
    return { data: null, error: "Invalid request body" };
  }

  const category = parseEnumValue(CommunityPostCategory, body.category);
  const title = parseRequiredString(body.title);
  const content = parseRequiredString(body.content);

  if (!category || !title || !content) {
    return { data: null, error: "category, title, and content are required" };
  }

  const eventDate = parseOptionalDate(body.eventDate);
  if (eventDate === "invalid") {
    return { data: null, error: "eventDate must be a valid date" };
  }

  return {
    data: {
      category,
      title,
      content,
      imageUrl: parseOptionalString(body.imageUrl),
      eventDate,
      eventTime: parseOptionalString(body.eventTime),
      location: parseOptionalString(body.location),
      latitude: parseOptionalString(body.latitude),
      longitude: parseOptionalString(body.longitude),
      price: parseOptionalString(body.price),
      condition: parseEnumValue(CommunityItemCondition, body.condition),
    },
    error: null,
  };
}

export function parseCommunityPostImageUpload(value: unknown) {
  if (!isUploadedFile(value)) {
    return { data: null, error: "image file is required" };
  }

  if (!ALLOWED_POST_IMAGE_TYPES.has(value.type)) {
    return { data: null, error: "image must be a JPEG, PNG, WEBP, or GIF file" };
  }

  if (value.size > MAX_POST_IMAGE_SIZE) {
    return { data: null, error: "image must not be larger than 5MB" };
  }

  return { data: value, error: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUploadedFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

function parseRequiredString(value: unknown) {
  const parsed = parseOptionalString(value);
  return parsed && parsed.length > 0 ? parsed : null;
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

function parseOptionalDate(value: unknown) {
  const parsed = parseOptionalString(value);
  if (!parsed) {
    return null;
  }

  const date = new Date(parsed);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

function parseEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
) {
  const parsed = parseOptionalString(value);
  if (!parsed) {
    return null;
  }

  const normalized = parsed.toUpperCase().replaceAll(" ", "_");
  return normalized in enumObject ? enumObject[normalized as keyof T] : null;
}
