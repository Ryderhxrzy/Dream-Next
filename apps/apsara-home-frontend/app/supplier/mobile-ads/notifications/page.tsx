'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@heroui/react/card'
import { X, Upload } from 'lucide-react'
import Image from 'next/image'

interface NotificationAd {
  id: string
  title: string
  description: string
  image?: string
  createdAt: string
}

export default function PushNotificationsPage() {
  const { data: session } = useSession()
  const [ads, setAds] = useState<NotificationAd[]>([])
  const [formData, setFormData] = useState({
    title: 'Special Discount Available',
    description: 'Get 30% off on selected items. Limited time offer!',
    image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"%3E%3Crect fill="%230EA5E9" width="400" height="200"/%3E%3Ctext x="200" y="100" font-size="32" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle"%3E30% OFF%3C/text%3E%3C/svg%3E',
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isNotificationExpanded, setIsNotificationExpanded] = useState(true)

  const supplierName = (session?.user as { supplierName?: string } | undefined)?.supplierName || 'Brand'
  const supplierLogo = (session?.user as { supplierLogo?: string | null } | undefined)?.supplierLogo || null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setPreviewImage(result)
        setFormData(prev => ({ ...prev, image: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateAd = () => {
    if (!formData.title || !formData.description) {
      alert('Please fill in all required fields')
      return
    }

    const newAd: NotificationAd = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      image: formData.image,
      createdAt: new Date().toLocaleString(),
    }

    setAds([newAd, ...ads])
    setFormData({ title: '', description: '', image: '' })
    setPreviewImage(null)
  }

  const deleteAd = (id: string) => {
    setAds(ads.filter(ad => ad.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Push Notifications</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Create and manage push notification ads for your users</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create Form */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900">
            <Card.Content className="p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Notification</h2>

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

              {/* Image Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Image (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200/80 dark:border-slate-700/50 rounded-lg p-6 text-center">
                  {previewImage ? (
                    <div>
                      <div className="relative h-40 w-full mb-3 rounded-lg overflow-hidden">
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
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Click to upload or drag and drop</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">PNG, JPG, GIF up to 5MB</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleCreateAd}
                className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-semibold text-white transition hover:bg-sky-700"
              >
                Create Notification
              </button>
            </Card.Content>
          </Card>

          {/* Notifications List */}
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Published Notifications ({ads.length})</h2>

            {ads.length === 0 ? (
              <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900">
                <Card.Content className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No notifications yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create your first notification above</p>
                </Card.Content>
              </Card>
            ) : (
              ads.map(ad => (
                <Card key={ad.id} className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900">
                  <Card.Content className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Notification Preview */}
                      <div className="flex-1">
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200/80 dark:border-slate-700/50">
                          {ad.image && (
                            <div className="relative h-32 w-full mb-3 rounded-lg overflow-hidden">
                              <Image
                                src={ad.image}
                                alt={ad.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{ad.title}</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{ad.description}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">{ad.createdAt}</p>
                        </div>
                      </div>
                      {/* Actions */}
                      <button
                        onClick={() => deleteAd(ad.id)}
                        className="rounded-lg border border-slate-200/80 p-2 text-slate-500 transition hover:border-red-200 hover:text-red-600 dark:border-slate-700/50 dark:text-slate-400 dark:hover:border-red-400/30 dark:hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </Card.Content>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Phone Preview */}
        <div className="lg:col-span-1">
          <Card className="border border-slate-200/80 bg-white/95 shadow-none dark:border-slate-700/50 dark:bg-slate-900 sticky top-6">
            <Card.Content className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Device Preview</h3>

              {/* iPhone Frame */}
              <div className="mx-auto w-full max-w-xs">
                {/* Phone Bezel */}
                <div className="rounded-3xl border-8 border-slate-900 bg-black shadow-2xl dark:border-slate-700 overflow-hidden">
                  {/* Screen */}
                  <div className="bg-slate-700 dark:bg-slate-700 relative h-[480px]">
                    {/* Notch */}
                    <div className="mx-auto w-40 h-7 bg-slate-900 dark:bg-slate-950 rounded-b-2xl flex items-center justify-between px-4 text-white text-[8px] absolute top-0 left-1/2 -translate-x-1/2 z-50">
                      <span>9:41</span>
                      <div className="flex gap-0.5">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0z" /></svg>
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9h4V7H1v2zm6 0h4V7H7v2zm6 0h4V7h-4v2zm6 0h4V7h-4v2zM1 13h4v-2H1v2zm6 0h4v-2H7v2zm6 0h4v-2h-4v2zm6 0h4v-2h-4v2z" /></svg>
                        <svg className="w-3 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0z" /></svg>
                      </div>
                    </div>

                    {/* Screen Content - Lock Screen / Home Screen */}
                    <div className="h-full pt-7 px-3 pb-12 flex flex-col justify-end items-center">
                      {/* Time on lock screen */}
                      <div className="text-center mb-8">
                        <p className="text-4xl font-bold text-slate-900 dark:text-white">9:41</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Thursday, May 29</p>
                      </div>

                      {/* Push Notification Banner */}
                      {(formData.title || formData.description) && (
                        <div className="absolute top-8 left-3 right-3 z-40">
                          {!isNotificationExpanded ? (
                            /* Collapsed State */
                            <button
                              onClick={() => setIsNotificationExpanded(true)}
                              className="w-full bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
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
                                  <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">{formData.title}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{formData.description}</p>
                                </div>
                                {formData.image && (
                                  <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                                    <Image
                                      src={formData.image}
                                      alt="Product"
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setIsNotificationExpanded(true)
                                  }}
                                  className="bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors rounded-full p-1.5 shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </button>
                          ) : (
                            /* Expanded State */
                            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
                              {/* Header with App Info */}
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
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">15m ago</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setIsNotificationExpanded(false)}
                                  className="bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors rounded-full p-1.5 shrink-0"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                              </div>

                              {/* Content */}
                              <div className="px-4 py-2 space-y-1.5">
                                {/* Title */}
                                <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                                  {formData.title}
                                </p>

                                {/* Description */}
                                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                                  {formData.description}
                                </p>

                                {/* Image */}
                                {formData.image && (
                                  <div className="relative h-36 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 mt-2.5">
                                    <Image
                                      src={formData.image}
                                      alt="Preview"
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Action Button */}
                              <div className="px-4 py-2">
                                <button className="w-full bg-sky-600 dark:bg-sky-700 hover:bg-sky-700 dark:hover:bg-sky-800 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
                                  Test only
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center">
                      <div className="w-32 h-1 bg-slate-900 dark:bg-slate-700 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-4">
                Tap notification banner to expand or collapse
              </p>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  )
}
