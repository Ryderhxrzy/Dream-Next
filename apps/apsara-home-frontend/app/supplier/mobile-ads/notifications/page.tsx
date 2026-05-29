'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@heroui/react/card'
import { Upload, Send, Loader, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { useGetAvailableCustomersQuery, useGetPushNotificationsHistoryQuery, useSendPushNotificationMutation, useGetCloudinarySignatureMutation } from '@/store/api/supplierPushNotificationsApi'

const CLOUD_NAME = 'dc05ncs6l'
const API_KEY = '492967473972197'

export default function PushNotificationsPage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    title: 'Special Discount Available',
    description: 'Get 30% off on selected items. Limited time offer!',
    image: '',
    buttonText: 'Shop Now',
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isNotificationExpanded, setIsNotificationExpanded] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isButtonEnabled, setIsButtonEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'image' | 'recipients' | 'schedule' | 'review'>('details')
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState('')

  // RTK Query hooks
  const { data: customersData, isLoading: isLoadingCustomers } = useGetAvailableCustomersQuery()
  const { data: historyData } = useGetPushNotificationsHistoryQuery()
  const [sendNotification, { isLoading: isSending }] = useSendPushNotificationMutation()
  const [getCloudinarySignature] = useGetCloudinarySignatureMutation()

  const [isUploading, setIsUploading] = useState(false)

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
          folder: 'apsara/supplier/notifications',
        },
      }).unwrap()

      // Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', API_KEY)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp.toString())
      formData.append('folder', 'apsara/supplier/notifications')

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const uploadData = await uploadResponse.json()

      if (uploadData.secure_url) {
        setFormData(prev => ({ ...prev, image: uploadData.secure_url }))
      } else {
        setError('Failed to upload image')
      }
    } catch (err: any) {
      setError(err?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const supplierName = (session?.user as { supplierName?: string } | undefined)?.supplierName || 'Brand'
  const supplierLogo = (session?.user as { supplierLogo?: string | null } | undefined)?.supplierLogo || null
  const availableCustomers = customersData?.customer_ids || []
  const deviceList = customersData?.devices || []

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
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
      setError('Please fill in all required fields')
      return
    }

    if (selectedCustomers.size === 0) {
      setError('Please select at least one customer')
      return
    }

    if (isScheduled && !scheduledDateTime) {
      setError('Please select a date and time for scheduling')
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

      if (result.status === 'scheduled') {
        setSuccess(`Notification scheduled for ${new Date(result.scheduled_at).toLocaleString()}`)
      } else {
        setSuccess(`Notification sent! ${result.sent} device(s) reached, ${result.failed} failed.`)
      }

      setFormData({ title: '', description: '', image: '', buttonText: 'Shop Now' })
      setPreviewImage(null)
      setSelectedCustomers(new Set())
      setIsScheduled(false)
      setScheduledDateTime('')
    } catch (err: any) {
      setError(err?.data?.message || 'Failed to send notification')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Push Notifications</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Create and manage push notifications for your customers</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Form Sections */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section 1 & 2: Details and Customize Button - 2-Column Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Section 1: Notification Details */}
            <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900">
              <Card.Content className="p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Notification Details
                </h2>

                {/* Title Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter notification title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    maxLength={50}
                    className="w-full rounded-lg border border-slate-200/80 bg-white/95 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400/60"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formData.title.length}/50 characters</p>
                </div>

                {/* Description Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Description *
                  </label>
                  <textarea
                    placeholder="Enter notification description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    maxLength={150}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200/80 bg-white/95 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400/60 resize-none"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formData.description.length}/150 characters</p>
                </div>
              </Card.Content>
            </Card>

            {/* Section 2: Customize Button */}
            <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900">
              <Card.Content className="p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Customize Button
                </h2>

                {/* Button Enable/Disable Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsButtonEnabled(!isButtonEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isButtonEnabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isButtonEnabled ? 'translate-x-6' : 'translate-x-1'
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
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Button Text *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Shop Now, View More, Learn More"
                      value={formData.buttonText}
                      onChange={(e) => setFormData(prev => ({ ...prev, buttonText: e.target.value }))}
                      maxLength={30}
                      className="w-full rounded-lg border border-slate-200/80 bg-white/95 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400/60"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formData.buttonText.length}/30 characters</p>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>

          {/* Section 3 & 5: Add Image and Schedule Notification - 2-Column Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Section 3: Add Image */}
            <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900">
              <Card.Content className="p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                  Add Image
                </h2>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Notification Image (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200/80 dark:border-slate-700/50 rounded-lg p-4 text-center">
                  {previewImage ? (
                    <div>
                      <div className="relative h-32 w-full mb-3 rounded-lg overflow-hidden">
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
                          setFormData(prev => ({ ...prev, image: '' }))
                        }}
                        className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Change Image
                      </button>
                      {formData.image && (
                        <div className="mt-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg break-all">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">Image URL:</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-mono truncate">{formData.image}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-3 cursor-pointer">
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Click to upload</span>
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
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-500/20 transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              </Card.Content>
            </Card>

            {/* Section 5: Schedule Notification */}
            <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900">
              <Card.Content className="p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Schedule Notification
                </h2>

                {/* Schedule Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsScheduled(!isScheduled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isScheduled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isScheduled ? 'translate-x-6' : 'translate-x-1'
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
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Send at *
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full rounded-lg border border-slate-200/80 bg-white/95 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-400 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400/60"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {scheduledDateTime && new Date(scheduledDateTime).toLocaleString()}
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
          <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900">
            <Card.Content className="p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Select Recipients
              </h2>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedCustomers.size} of {availableCustomers.length} selected
                </span>
              </div>

              {isLoadingCustomers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-5 h-5 animate-spin text-sky-600" />
                </div>
              ) : availableCustomers.length > 0 ? (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="flex-1 px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                    >
                      Deselect All
                    </button>
                  </div>

                  <div className="border border-slate-200/80 dark:border-slate-700/50 rounded-lg p-4 max-h-80 overflow-y-auto space-y-2">
                    {deviceList.map((device) => (
                      <label key={`${device.customer_id}-${device.device_name}`} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(device.customer_id)}
                          onChange={() => toggleCustomer(device.customer_id)}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 dark:border-slate-600"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{device.device_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Customer ID: {device.customer_id}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-12 text-center">
                  No customers with active devices found
                </p>
              )}
            </Card.Content>
          </Card>

          {/* Section 6: Send Button - Full Width */}
          <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900">
            <Card.Content className="p-6">
              <button
                onClick={handleSendNotification}
                disabled={isSending || selectedCustomers.size === 0 || (isScheduled && !scheduledDateTime)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {isScheduled ? 'Scheduling...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {isScheduled ? 'Schedule Notification' : 'Send Notification'}
                  </>
                )}
              </button>
            </Card.Content>
          </Card>
        </div>

        {/* Right Column - Sticky Notification Preview & Recent Notifications */}
        <div className="flex flex-col gap-6">
          {/* Notification Preview */}
          <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900 sticky top-6">
            <Card.Content className="p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Preview</h3>

              {/* Phone Mockup Frame */}
              <div className="w-full max-w-xs mx-auto">
                <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-2 relative">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
                    {!isNotificationExpanded ? (
                      /* Collapsed - notification with title and description inside phone */
                      <button
                        onClick={() => setIsNotificationExpanded(true)}
                        className="w-full bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 transition-colors text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 shrink-0">
                          <Image
                            src="/af_home_logo.png"
                            alt="AF Home"
                            width={16}
                            height={16}
                            className="w-4 h-4"
                            style={{ filter: 'brightness(0) invert(1)' }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {formData.title || 'Title'}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {formData.description || 'Description'}
                          </p>
                        </div>
                        {formData.image && (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                            <Image
                              src={formData.image}
                              alt="Notification"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="bg-slate-200 dark:bg-slate-600 rounded-full w-9 h-9 shrink-0 flex items-center justify-center">
                          <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-200" />
                        </div>
                      </button>
                    ) : (
                      /* Expanded - Full notification inside phone */
                      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
                        <div className="px-4 py-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 shrink-0">
                              <Image
                                src="/af_home_logo.png"
                                alt="AF Home"
                                width={16}
                                height={16}
                                className="w-4 h-4"
                                style={{ filter: 'brightness(0) invert(1)' }}
                              />
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">AF Home</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">Just now</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsNotificationExpanded(false)}
                            className="bg-slate-200 dark:bg-slate-600 rounded-full w-7 h-7 flex items-center justify-center shrink-0 transition hover:bg-slate-300 dark:hover:bg-slate-500"
                          >
                            <ChevronDown className="w-4 h-4 rotate-180 text-slate-600 dark:text-slate-200" />
                          </button>
                        </div>

                        <div className="px-4 py-2 space-y-2">
                          <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                            {formData.title || 'Title'}
                          </p>
                          <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                            {formData.description || 'Description'}
                          </p>

                          {formData.image && (
                            <div className="relative h-32 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 mt-3">
                              <Image
                                src={formData.image}
                                alt="Notification"
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                        </div>

                        {isButtonEnabled && (
                          <div className="px-4 py-2">
                            <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
                              {formData.buttonText || 'Shop Now'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center">
                    <div className="w-32 h-1 bg-slate-900 dark:bg-slate-700 rounded-full" />
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
