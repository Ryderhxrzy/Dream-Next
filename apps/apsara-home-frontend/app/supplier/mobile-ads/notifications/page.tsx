'use client'

import { useState } from 'react'
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
  const [ads, setAds] = useState<NotificationAd[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)

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
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Preview</h3>

              {/* Phone Frame */}
              <div className="mx-auto w-full max-w-xs rounded-3xl border-8 border-slate-900 bg-black shadow-2xl dark:border-slate-700 overflow-hidden">
                <div className="bg-white dark:bg-slate-900 overflow-hidden flex flex-col h-96">
                  {/* Status Bar */}
                  <div className="h-6 bg-slate-900 dark:bg-slate-950 flex items-center px-3 text-white text-[8px]">
                    <div className="flex-1">9:41</div>
                    <div className="flex gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="bg-sky-600 text-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/af_home_logo.png"
                        alt="AF Home"
                        width={24}
                        height={24}
                        className="w-6 h-6"
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                      <span className="font-semibold text-sm">AF Home</span>
                    </div>
                  </div>

                  {/* Notification Banner */}
                  {(formData.title || formData.description) && (
                    <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
                      <div className="flex gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500">
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
                          <p className="font-semibold text-slate-900 dark:text-white text-[10px]">
                            {formData.title || 'Notification Title'}
                          </p>
                          <p className="text-[8px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {formData.description || 'Notification description'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* App Content */}
                  <div className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
                    {formData.image && (
                      <div className="relative h-24 w-full rounded-lg overflow-hidden">
                        <Image
                          src={formData.image}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                    </div>

                    <div className="pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                        <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                      </div>
                    </div>
                  </div>

                  {/* Home Indicator */}
                  <div className="h-5 bg-slate-900 dark:bg-slate-950" />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-4">
                How your notification appears in the AF Home app
              </p>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  )
}
