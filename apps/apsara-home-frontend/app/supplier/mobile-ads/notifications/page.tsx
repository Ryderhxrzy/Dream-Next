"use client"

import { useState } from "react"
import {
  useGetAvailableCustomersQuery,
  useGetCloudinarySignatureMutation,
  useGetPushNotificationsHistoryQuery,
  useSendPushNotificationMutation,
} from "@/store/api/supplierPushNotificationsApi"
import { Card } from "@heroui/react/card"
import { ChevronDown, Copy, Loader, Send, Upload } from "lucide-react"
import { useSession } from "next-auth/react"
import Image from "next/image"

const CLOUD_NAME = "dc05ncs6l"
const API_KEY = "492967473972197"

export default function PushNotificationsPage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    title: "Special Discount Available",
    description: "Get 30% off on selected items. Limited time offer!",
    image: "",
    buttonText: "Shop Now",
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(
    new Set()
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isButtonEnabled, setIsButtonEnabled] = useState(true)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState("")
  const [isNotificationExpanded, setIsNotificationExpanded] = useState(false)

  // RTK Query hooks
  const { data: customersData, isLoading: isLoadingCustomers } =
    useGetAvailableCustomersQuery()
  const { data: historyData } = useGetPushNotificationsHistoryQuery()
  const [sendNotification, { isLoading: isSending }] =
    useSendPushNotificationMutation()
  const [getCloudinarySignature] = useGetCloudinarySignatureMutation()

  const [isUploading, setIsUploading] = useState(false)

  const handleCopyImageLink = () => {
    if (formData.image) {
      navigator.clipboard.writeText(formData.image)
      // Optional: Show a toast notification
      setSuccess("Image link copied to clipboard!")
      setTimeout(() => setSuccess(null), 2000)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      setError(null)

      // Show preview locally
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Get signature from backend via RTK Query
      const timestamp = Math.floor(Date.now() / 1000)
      const { signature } = await getCloudinarySignature({
        params_to_sign: {
          timestamp,
          folder: "apsara/supplier/notifications",
        },
      }).unwrap()

      // Upload to Cloudinary
      const formData = new FormData()
      formData.append("file", file)
      formData.append("api_key", API_KEY)
      formData.append("signature", signature)
      formData.append("timestamp", timestamp.toString())
      formData.append("folder", "apsara/supplier/notifications")

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      )

      const uploadData = await uploadResponse.json()

      if (uploadData.secure_url) {
        setFormData((prev) => ({ ...prev, image: uploadData.secure_url }))
      } else {
        setError("Failed to upload image")
      }
    } catch (err: any) {
      setError(err?.data?.message || "Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const supplierName =
    (session?.user as { supplierName?: string } | undefined)?.supplierName ||
    "Brand"
  const supplierLogo =
    (session?.user as { supplierLogo?: string | null } | undefined)
      ?.supplierLogo || null
  const availableCustomers = customersData?.customer_ids || []
  const deviceList = customersData?.devices || []

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
  }

  const toggleCustomer = (customerId: number) => {
    const newSelected = new Set(selectedCustomers)
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId)
    } else {
      newSelected.add(customerId)
    }
    setSelectedCustomers(newSelected)
  }

  const selectAll = () => {
    setSelectedCustomers(new Set(availableCustomers))
  }

  const deselectAll = () => {
    setSelectedCustomers(new Set())
  }

  const handleSendNotification = async () => {
    if (!formData.title || !formData.description) {
      setError("Please fill in all required fields")
      return
    }

    if (selectedCustomers.size === 0) {
      setError("Please select at least one customer")
      return
    }

    if (isScheduled && !scheduledDateTime) {
      setError("Please select a date and time for scheduling")
      return
    }

    try {
      setError(null)
      setSuccess(null)

      const payload: any = {
        title: formData.title,
        body: formData.description,
        image: formData.image || null,
        recipients: Array.from(selectedCustomers),
      }

      if (isButtonEnabled) {
        payload.buttonText = formData.buttonText
      }

      if (isScheduled && scheduledDateTime) {
        payload.scheduled_at = scheduledDateTime
      }

      const result = await sendNotification(payload).unwrap()

      if (result.status === "scheduled") {
        setSuccess(
          `Notification scheduled for ${new Date(result.scheduled_at).toLocaleString()}`
        )
      } else {
        setSuccess(
          `Notification sent! ${result.sent} device(s) reached, ${result.failed} failed.`
        )
      }

      setFormData({
        title: "",
        description: "",
        image: "",
        buttonText: "Shop Now",
      })
      setPreviewImage(null)
      setSelectedCustomers(new Set())
      setIsScheduled(false)
      setScheduledDateTime("")
    } catch (err: any) {
      setError(err?.data?.message || "Failed to send notification")
    }
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Push Notifications
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Create and manage push notifications for your customers
          </p>
        </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm text-green-700 dark:text-green-300">
            {success}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Form Sections */}
        <div className="space-y-4 lg:col-span-2">
          {/* Section 1 & 2: Details and Customize Button - 2-Column Grid */}
          <div id="details" className="grid grid-cols-2 gap-4 scroll-mt-24">
            {/* Section 1: Notification Details */}
            <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 rounded-md">
              <Card.Content className="space-y-4 p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Notification Details
                </h2>

                {/* Title Field */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                    Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter notification title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    maxLength={50}
                    className="w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400/60"
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {formData.title.length}/50 characters
                  </p>
                </div>

                {/* Description Field */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                    Description *
                  </label>
                  <textarea
                    placeholder="Enter notification description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    maxLength={150}
                    rows={4}
                    className="w-full resize-none rounded-md border border-slate-200/80 bg-white/95 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition outline-none focus:border-sky-400 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400/60"
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {formData.description.length}/150 characters
                  </p>
                </div>
              </Card.Content>
            </Card>

            {/* Section 2: Customize Button */}
            <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 rounded-md">
              <Card.Content className="space-y-4 p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Customize Button
                </h2>

                {/* Button Enable/Disable Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsButtonEnabled(!isButtonEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isButtonEnabled
                        ? "bg-sky-600"
                        : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isButtonEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <label className="text-sm font-semibold text-slate-900 dark:text-white">
                    Enable Action Button
                  </label>
                </div>

                {/* Button Text Field */}
                {isButtonEnabled && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                      Button Text *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Shop Now, View More, Learn More"
                      value={formData.buttonText}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          buttonText: e.target.value,
                        }))
                      }
                      maxLength={30}
                      className="w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400/60"
                    />
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {formData.buttonText.length}/30 characters
                    </p>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>

          {/* Section 3 & 5: Add Image and Schedule Notification - 2-Column Grid */}
          <div id="image" className="grid grid-cols-2 gap-4 scroll-mt-24">
            {/* Section 3: Add Image */}
            <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 rounded-md">
              <Card.Content className="space-y-4 p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Image
                </h2>

                {/* Upload Section */}
                <div>
                  <label className="mb-3 block text-sm font-semibold text-slate-900 dark:text-white">
                    Upload Image
                  </label>
                  <div className="rounded-md border-2 border-dashed border-slate-200 p-4 text-center dark:border-slate-700">
                    {previewImage ? (
                      <div>
                        <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md">
                          <Image
                            src={previewImage}
                            alt="Preview"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setPreviewImage(null)
                            setFormData((prev) => ({ ...prev, image: "" }))
                          }}
                          className="text-sm text-sky-600 hover:underline dark:text-sky-400"
                        >
                          Change Image
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center gap-3">
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            Click to upload
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          disabled={isUploading}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={isUploading}
                          className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <Loader className="h-3 w-3 animate-spin" />
                              Uploading…
                            </>
                          ) : (
                            <>
                              <Upload className="h-3 w-3" />
                              Upload
                            </>
                          )}
                        </button>
                      </label>
                    )}
                  </div>
                </div>

                {/* Image Link Field */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                    Image URL {formData.image && <span className="text-green-600 dark:text-green-400">✓</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste image link here or upload above"
                      value={formData.image}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, image: e.target.value }))
                        if (e.target.value) {
                          setPreviewImage(e.target.value)
                        }
                      }}
                      className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400/60"
                    />
                    {formData.image && (
                      <button
                        onClick={handleCopyImageLink}
                        className="flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        title="Copy image link"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="hidden sm:inline">Copy</span>
                      </button>
                    )}
                  </div>
                </div>
              </Card.Content>
            </Card>

            {/* Section 5: Schedule Notification */}
            <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 rounded-md">
              <Card.Content className="space-y-4 p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Schedule Notification
                </h2>

                {/* Schedule Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsScheduled(!isScheduled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isScheduled
                        ? "bg-sky-600"
                        : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isScheduled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <label className="text-sm font-semibold text-slate-900 dark:text-white">
                    Schedule for later
                  </label>
                </div>

                {/* Date/Time Input */}
                {isScheduled && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">
                      Send at *
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400/60"
                    />
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {scheduledDateTime &&
                        new Date(scheduledDateTime).toLocaleString()}
                    </p>
                  </div>
                )}

                {!isScheduled && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Toggle to schedule this notification for a later time
                  </p>
                )}
              </Card.Content>
            </Card>
          </div>

          {/* Section 4: Select Recipients - Full Width */}
          <Card id="recipients" className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 rounded-md scroll-mt-24">
            <Card.Content className="space-y-4 p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Select Recipients
              </h2>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedCustomers.size} of {availableCustomers.length}{" "}
                  selected
                </span>
              </div>

              {isLoadingCustomers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-5 w-5 animate-spin text-sky-600" />
                </div>
              ) : availableCustomers.length > 0 ? (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="flex-1 rounded-md bg-sky-50 px-4 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/30"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="flex-1 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Deselect All
                    </button>
                  </div>

                  <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-4 dark:border-slate-700">
                    {deviceList.map((device) => (
                      <label
                        key={`${device.customer_id}-${device.device_name}`}
                        className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(device.customer_id)}
                          onChange={() => toggleCustomer(device.customer_id)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 dark:border-slate-600"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {device.device_name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Customer ID: {device.customer_id}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  No customers with active devices found
                </p>
              )}
            </Card.Content>
          </Card>

          {/* Section 6: Send Button - Full Width */}
          <Card id="send" className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 rounded-md scroll-mt-24">
            <Card.Content className="p-6">
              <button
                onClick={handleSendNotification}
                disabled={
                  isSending ||
                  selectedCustomers.size === 0 ||
                  (isScheduled && !scheduledDateTime)
                }
                className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    {isScheduled ? "Scheduling..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {isScheduled
                      ? "Schedule Notification"
                      : "Send Notification"}
                  </>
                )}
              </button>
            </Card.Content>
          </Card>
        </div>

        {/* Right Column - Sticky Notification Preview & Recent Notifications */}
        <div className="flex flex-col gap-6">
          {/* Notification Preview */}
          <Card className="sticky top-6 border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 rounded-md">
            <Card.Content className="p-6">
              <h3 className="mb-6 text-base font-bold text-slate-900 dark:text-white">
                Phone Preview
              </h3>

              {/* Phone Mockup Frame */}
              <div className="mx-auto w-full max-w-xs">
                {/* Phone Bezel & Screen */}
                <div className="relative overflow-hidden rounded-md bg-black" style={{ aspectRatio: '9/16', boxShadow: '0 0 0 12px #1f2937, 0 0 0 13px #000' }}>
                  {/* Phone Screen */}
                  <div className="relative h-full w-full overflow-hidden bg-slate-900">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-950 text-white text-xs font-medium">
                      <span>9:41</span>
                      <div className="flex gap-1">
                        <span>📶</span>
                        <span>📡</span>
                        <span>🔋</span>
                      </div>
                    </div>

                    {/* Notch */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />

                    {/* Screen Content */}
                    <div className="h-full w-full bg-gradient-to-b from-slate-800 to-slate-900 p-3 pt-4 flex flex-col">
                      {/* Notification Pop-up */}
                      <div className="rounded-md bg-white dark:bg-slate-800 shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        {/* Notification Header with Expand/Collapse */}
                        <div className="flex p-3 items-start gap-2">
                          {/* App Icon - Circular */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 flex-shrink-0 mt-0.5">
                            <Image
                              src="/af_home_logo.png"
                              alt="AF Home"
                              width={20}
                              height={20}
                              className="h-5 w-5"
                              style={{ filter: "brightness(0) invert(1)" }}
                            />
                          </div>

                          {/* Notification Content */}
                          <div className="flex-1 min-w-0 py-0.5">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {formData.title || "AF Home"}
                            </p>
                            <p className={`text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-tight ${
                              isNotificationExpanded ? "" : "line-clamp-1"
                            }`}>
                              {formData.description || "New notification"}
                            </p>
                          </div>

                          {/* Expand/Collapse Button */}
                          <button
                            onClick={() => setIsNotificationExpanded(!isNotificationExpanded)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 transition mt-0.5"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isNotificationExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>

                        {/* Expanded Content */}
                        {isNotificationExpanded && (
                          <>
                            {/* Image */}
                            {formData.image && (
                              <div className="px-3 pt-2 pb-1">
                                <div className="relative h-20 w-full overflow-hidden rounded-md">
                                  <Image
                                    src={formData.image}
                                    alt="Notification"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Button */}
                            {isButtonEnabled && (
                              <div className="px-3 pt-1 pb-3">
                                <button className="w-full rounded-md bg-sky-500 py-1.5 text-xs font-semibold text-white text-center hover:bg-sky-600 transition">
                                  {formData.buttonText || "Shop Now"}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-slate-700 rounded-full" />
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  )
}
