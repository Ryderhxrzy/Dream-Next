"use client"

import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget(
        options: Record<string, unknown>,
        callback: (
          error: { status: string; statusText: string } | null,
          result: CloudinaryWidgetResult
        ) => void
      ): CloudinaryWidget
    }
  }
}

type CloudinaryWidgetResult = {
  event: string
  info: {
    secure_url: string
    public_id: string
  }
}

type CloudinaryWidget = {
  open(): void
  close(): void
  destroy(): void
}

const CLOUD_NAME = "dc05ncs6l"
const API_KEY = "492967473972197"

interface CloudinaryUploadButtonProps {
  onUploaded: (urls: string[]) => void
  multiple?: boolean
  folder?: string
  className?: string
  children: React.ReactNode
  disabled?: boolean
}

/**
 * Opens the Cloudinary upload widget (the same modal used on the admin
 * Import Image page) and reports back the resulting secure URL(s). The widget
 * lets the user upload from device, paste a URL, use the camera, Drive, etc.
 */
export default function CloudinaryUploadButton({
  onUploaded,
  multiple = false,
  folder = "apsara/supplier/home",
  className,
  children,
  disabled,
}: CloudinaryUploadButtonProps) {
  const widgetRef = useRef<CloudinaryWidget | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Keep the latest callback without re-creating the widget.
  const onUploadedRef = useRef(onUploaded)
  useEffect(() => {
    onUploadedRef.current = onUploaded
  }, [onUploaded])

  // Track batch uploads to preserve selection order.
  const batchRef = useRef<Map<string, string>>(new Map())
  const batchOrderRef = useRef<string[]>([])

  // Load the widget script once.
  useEffect(() => {
    if (document.getElementById("cld-upload-widget")) {
      setScriptLoaded(true)
      return
    }
    const script = document.createElement("script")
    script.id = "cld-upload-widget"
    script.src = "https://upload-widget.cloudinary.com/global/all.js"
    script.onload = () => setScriptLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Create the widget once the script is ready.
  useEffect(() => {
    if (!scriptLoaded || !window.cloudinary || widgetRef.current) return

    widgetRef.current = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        apiKey: API_KEY,
        uploadSignature: (
          callback: (sig: string) => void,
          paramsToSign: Record<string, unknown>
        ) => {
          void fetch("/api/supplier/cloudinary-sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ params_to_sign: paramsToSign }),
          })
            .then((r) => r.json())
            .then((data: { signature: string }) => callback(data.signature))
        },
        folder,
        multiple,
        sources: ["local", "url", "camera", "image_search", "google_drive", "dropbox", "unsplash"],
        resourceType: "image",
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"],
        maxFileSize: 5_000_000,
        transformation: [
          { width: 1600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#E2E8F0",
            tabIcon: "#0EA5E9",
            menuIcons: "#5A616A",
            textDark: "#1E293B",
            textLight: "#FFFFFF",
            link: "#0EA5E9",
            action: "#0EA5E9",
            inactiveTabIcon: "#94A3B8",
            error: "#EF4444",
            inProgress: "#0EA5E9",
            complete: "#10B981",
            sourceBg: "#F8FAFC",
          },
        },
      },
      (error, result) => {
        if (error) return
        if (result.event === "success") {
          batchRef.current.set(result.info.public_id, result.info.secure_url)
          if (!batchOrderRef.current.includes(result.info.public_id)) {
            batchOrderRef.current.push(result.info.public_id)
          }
        } else if (result.event === "queues-end") {
          const urls = batchOrderRef.current
            .map((id) => batchRef.current.get(id))
            .filter((u): u is string => Boolean(u))
          if (urls.length > 0) {
            onUploadedRef.current(urls)
          }
          batchRef.current.clear()
          batchOrderRef.current = []
        } else if (result.event === "abort") {
          batchRef.current.clear()
          batchOrderRef.current = []
        }
      }
    )

    return () => {
      widgetRef.current?.destroy()
      widgetRef.current = null
    }
  }, [scriptLoaded, multiple, folder])

  return (
    <button
      type="button"
      onClick={() => widgetRef.current?.open()}
      disabled={disabled || !scriptLoaded}
      className={className}
    >
      {children}
    </button>
  )
}
