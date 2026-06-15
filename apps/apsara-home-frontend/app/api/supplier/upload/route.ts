import { supplierAuthOptions } from "@/libs/supplierAuth"
import { v2 as cloudinary } from "cloudinary"
import type { UploadApiOptions, UploadApiResponse } from "cloudinary"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_SIZE_BYTES = 25 * 1024 * 1024

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"])
const FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/zip",
  "text/plain",
])

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function uploadBuffer(
  buffer: Buffer,
  options: UploadApiOptions
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error)
          return
        }
        if (!result) {
          reject(new Error("Upload failed."))
          return
        }
        resolve(result)
      }
    )
    stream.end(buffer)
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(supplierAuthOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { error: "Cloudinary is not configured." },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 25 MB." },
        { status: 400 }
      )
    }

    const isImage = IMAGE_TYPES.has(file.type)
    const isVideo = VIDEO_TYPES.has(file.type)
    const isFile = FILE_TYPES.has(file.type)

    if (!isImage && !isVideo && !isFile) {
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const resourceType: UploadApiOptions["resource_type"] = isImage
      ? "image"
      : isVideo
        ? "video"
        : "raw"

    const result = await uploadBuffer(buffer, {
      folder: "apsara/supplier-chat",
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    })

    const attachmentType = isImage ? "image" : isVideo ? "video" : "file"
    return NextResponse.json({
      url: result.secure_url,
      type: attachmentType,
      name: file.name,
    })
  } catch (err) {
    console.error("Supplier upload error:", err)
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    )
  }
}
