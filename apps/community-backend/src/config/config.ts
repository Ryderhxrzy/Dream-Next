import "dotenv/config";

const databaseUrl = readRequiredEnv("DATABASE_URL");

export const config = {
  databaseUrl,
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? undefined,
  },
  databaseSchema: process.env.DATABASE_SCHEMA?.trim() || readSchemaFromUrl(databaseUrl),
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() ?? "",
    communityPostsFolder:
      process.env.CLOUDINARY_COMMUNITY_POSTS_FOLDER?.trim() ??
      "afhome/community/posts",
    communityChatFolder:
      process.env.CLOUDINARY_COMMUNITY_CHAT_FOLDER?.trim() ??
      "afhome/community/chat",
  },
};

function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readSchemaFromUrl(url: string) {
  try {
    return new URL(url).searchParams.get("schema") || "public";
  } catch {
    return "public";
  }
}
