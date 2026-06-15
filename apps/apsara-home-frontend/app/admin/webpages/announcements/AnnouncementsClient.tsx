"use client"

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CalendarDays,
  Bold,
  ChevronDown,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Quote,
  Smile,
  Strikethrough,
  Trash2,
  Underline,
  Clock3,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"

type VariableToken = {
  label: string
  token: string
}

type RecipientMode = "all" | "specific"
type SendTimingMode = "now" | "scheduled"

type RecipientOption = {
  value: string
  label: string
  searchText?: string
}

const VARIABLE_TOKENS: VariableToken[] = [
  { label: "Customer Name", token: "{{ customer_name }}" },
  { label: "First Name", token: "{{ first_name }}" },
  { label: "Last Name", token: "{{ last_name }}" },
  { label: "Username", token: "{{ username }}" },
  { label: "Customer Email", token: "{{ customer_email }}" },
  { label: "Email", token: "{{ email }}" },
  { label: "Store Name", token: "{{ store_name }}" },
  { label: "Current Date", token: "{{ current_date }}" },
  { label: "Current Time", token: "{{ current_time }}" },
  { label: "Current Year", token: "{{ current_year }}" },
  { label: "Member Since", token: "{{ member_since }}" },
  { label: "Support Email", token: "{{ support_email }}" },
]

export default function AnnouncementsClient() {
  const { data: session } = useSession()
  const [deliveryChannel, setDeliveryChannel] = useState<"email" | "sms">(
    "email"
  )
  const [title, setTitle] = useState("")
  const initialContentHtml =
    "<p>Hi {{ customer_name }},</p><h2>Mega Sale Starts Tonight!</h2><p>Get ready for our biggest sale of the month!</p><p>Sale starts tonight at 12:00 AM.<br/>Shop now before stocks run out!</p>"
  const maxTitleLength = 100
  const editorRef = useRef<HTMLDivElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const selectionRangeRef = useRef<Range | null>(null)
  const emailDraftSnapshotRef = useRef(initialContentHtml)
  const [emailDraftHtml, setEmailDraftHtml] = useState(initialContentHtml)
  const previousDeliveryChannelRef = useRef<"email" | "sms">(deliveryChannel)
  const [characterCount, setCharacterCount] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [hasSelectedImage, setHasSelectedImage] = useState(false)
  const [fontSize, setFontSize] = useState("14")
  const [fontFamily, setFontFamily] = useState("Arial")
  const [showVariableMenu, setShowVariableMenu] = useState(false)
  const [showEmojiMenu, setShowEmojiMenu] = useState(false)
  const [emojiMenuPos, setEmojiMenuPos] = useState<{
    top: number
    left: number
  } | null>(null)
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [lastSendResult, setLastSendResult] = useState<{
    sent: number
    failed: number
  } | null>(null)
  const [isUploadingEditorImage, setIsUploadingEditorImage] = useState(false)
  const [smsMessage, setSmsMessage] = useState("")
  const [smsCharacterCount, setSmsCharacterCount] = useState(0)
  const [smsWordCount, setSmsWordCount] = useState(0)
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all")
  const [memberEmails, setMemberEmails] = useState<RecipientOption[]>([])
  const [recipientSearch, setRecipientSearch] = useState("")
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)
  const [isFocusedSearch, setIsFocusedSearch] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [sendTimingMode, setSendTimingMode] = useState<SendTimingMode>("now")
  const [scheduledFor, setScheduledFor] = useState("")

  const EMOJIS = [
    // Faces & expressions
    "😀",
    "😁",
    "😂",
    "🤣",
    "😊",
    "😍",
    "😘",
    "😎",
    "🤩",
    "🥳",
    "😇",
    "🙂",
    "😉",
    "🤗",
    "🤔",
    "😌",
    "😴",
    "😜",
    "🤤",
    "😆",
    "😅",
    "🥲",
    "😋",
    "🤑",
    "😤",
    "😠",
    "😡",
    "🤯",
    "😳",
    "🥹",
    "😢",
    "😭",
    "😱",
    "😨",
    "😰",
    "😓",
    "🤭",
    "🤫",
    "🤥",
    "😶",
    "😐",
    "😑",
    "😬",
    "🙄",
    "😏",
    "😒",
    "🧐",
    "🤓",
    // Hands & gestures
    "🙌",
    "👏",
    "👍",
    "👋",
    "🤝",
    "🤜",
    "🤛",
    "✊",
    "👊",
    "🤞",
    "✌️",
    "🤟",
    "🤙",
    "👆",
    "👇",
    "👈",
    "👉",
    "☝️",
    "👌",
    "🤌",
    "🤏",
    "💪",
    "🙏",
    "🫶",
    // Hearts
    "💙",
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💜",
    "🖤",
    "🤍",
    "🩷",
    "🩶",
    "💖",
    "💗",
    "💓",
    "💞",
    "💕",
    "💟",
    "❣️",
    "💔",
    "🫀",
    "❤️‍🔥",
    "❤️‍🩹",
    // Celebration & special
    "✨",
    "🔥",
    "🎉",
    "🎊",
    "🥂",
    "🎈",
    "🎀",
    "🎆",
    "🎇",
    "🌈",
    "⭐",
    "🌟",
    "💫",
    "🌠",
    "🪄",
    "🎯",
    "🏆",
    "🥇",
    "🏅",
    "🎖️",
    "🎗️",
    "🎫",
    "🎟️",
    // Shopping & business
    "🛍️",
    "🛒",
    "💸",
    "💰",
    "💵",
    "💴",
    "💶",
    "💷",
    "💳",
    "🏷️",
    "📦",
    "🚚",
    "📣",
    "📢",
    "📬",
    "📧",
    "✉️",
    "📩",
    "📨",
    "📝",
    "📋",
    "🧾",
    "🗒️",
    "📊",
    // Tech & time
    "📱",
    "💻",
    "🖥️",
    "⌨️",
    "🖱️",
    "🖨️",
    "📸",
    "📷",
    "🎥",
    "📡",
    "⌚",
    "🕒",
    "⏰",
    "⏳",
    "⚡",
    "🚀",
    "🛸",
    "💡",
    "🔔",
    "🔕",
    "📌",
    "📍",
    "🔑",
    "🗝️",
    // Nature & misc
    "🌸",
    "🌺",
    "🌻",
    "🌹",
    "🌷",
    "🍀",
    "🌿",
    "🍃",
    "🌊",
    "🌙",
    "☀️",
    "🌤️",
    "⛅",
    "🌦️",
    "❄️",
    "🌈",
    "🔵",
    "🟢",
    "🔴",
    "🟡",
    "🟠",
    "🟣",
    "⚫",
    "⚪",
  ]

  const toolbarButtonClass =
    "grid h-8 w-8 place-items-center rounded-md border border-transparent text-[#2f58c8] transition hover:border-[#c7d4ff] hover:bg-[#eef3ff] hover:text-[#1f45b5]"

  const formatLocalDatetimeInput = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0")
    return (
      [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(
        "-"
      ) + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    )
  }

  const baseUrl = (process.env.NEXT_PUBLIC_LARAVEL_API_URL || "").trim()
  const accessToken = String(
    (session?.user as { accessToken?: string } | undefined)?.accessToken ?? ""
  ).trim()

  const filteredMemberEmails = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase()
    if (!q) return memberEmails
    const terms = q.split(/\s+/).filter(Boolean)
    const scoredMatches = memberEmails
      .map((item) => {
        const searchable =
          `${item.label} ${item.value} ${item.searchText ?? ""}`.toLowerCase()
        const matchedTerms = terms.filter((term) =>
          searchable.includes(term)
        ).length
        const firstTermMatches = terms[0]
          ? searchable.includes(terms[0])
          : false
        const score = searchable.includes(q)
          ? matchedTerms + terms.length + 1
          : matchedTerms

        return { item, score, matchedTerms, firstTermMatches }
      })
      .filter(({ score }) => score > 0)

    const strongMatches = scoredMatches.filter(
      ({ firstTermMatches, matchedTerms }) => {
        if (terms.length <= 1) return true
        return firstTermMatches || matchedTerms >= 2
      }
    )
    const matchesToShow =
      strongMatches.length > 0 ? strongMatches : scoredMatches

    return matchesToShow
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.matchedTerms - a.matchedTerms ||
          a.item.label.localeCompare(b.item.label)
      )
      .map(({ item }) => item)
  }, [memberEmails, recipientSearch])

  const recipientUnitLabel =
    deliveryChannel === "sms" ? "mobile number" : "email"
  const recipientUnitLabelPlural =
    deliveryChannel === "sms" ? "mobile numbers" : "emails"
  const recipientSearchPlaceholder =
    deliveryChannel === "sms"
      ? "Search member name or mobile number"
      : "Search member email"

  const isAllVisibleSelected = useMemo(() => {
    if (filteredMemberEmails.length === 0) return false
    return filteredMemberEmails.every((item) =>
      selectedEmails.includes(item.value)
    )
  }, [filteredMemberEmails, selectedEmails])

  const recipientLabelMap = useMemo(() => {
    return new Map(memberEmails.map((item) => [item.value, item.label]))
  }, [memberEmails])

  const saveSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return
    const range = selection.getRangeAt(0)
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      selectionRangeRef.current = range.cloneRange()
    }
  }

  const restoreSelection = () => {
    const selection = window.getSelection()
    if (!selection || !selectionRangeRef.current) return
    selection.removeAllRanges()
    selection.addRange(selectionRangeRef.current)
  }

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus()
    restoreSelection()
    const ok = document.execCommand(command, false, value)
    if (
      !ok &&
      (command === "insertUnorderedList" || command === "insertOrderedList")
    ) {
      const listTag = command === "insertUnorderedList" ? "ul" : "ol"
      document.execCommand(
        "insertHTML",
        false,
        `<${listTag}><li><br></li></${listTag}><p><br></p>`
      )
    }
    saveSelection()
    const text = editorRef.current?.textContent?.trim() ?? ""
    setCharacterCount(text.length)
    setWordCount(text ? text.split(/\s+/).length : 0)
  }

  const insertEmoji = (emoji: string) => {
    if (deliveryChannel === "sms") {
      setSmsMessage((prev) => {
        const next = `${prev}${emoji}`
        setSmsCharacterCount(next.length)
        setSmsWordCount(next.trim() ? next.trim().split(/\s+/).length : 0)
        return next
      })
      setShowEmojiMenu(false)
      return
    }
    runCommand("insertText", emoji)
    setShowEmojiMenu(false)
  }

  const runListCommand = (
    command: "insertUnorderedList" | "insertOrderedList"
  ) => {
    runCommand(command)
  }

  const insertVariableToken = (token: string) => {
    if (deliveryChannel === "sms") {
      setSmsMessage((prev) => {
        const next = `${prev}${token}`
        setSmsCharacterCount(next.length)
        setSmsWordCount(next.trim() ? next.trim().split(/\s+/).length : 0)
        return next
      })
      setShowVariableMenu(false)
      return
    }
    runCommand("insertText", token)
  }

  const applyFontSize = (sizePx: string) => {
    editorRef.current?.focus()
    restoreSelection()
    document.execCommand("styleWithCSS", false, "true")
    document.execCommand("fontSize", false, "7")
    if (!editorRef.current) return
    const fontTags = editorRef.current.querySelectorAll('font[size="7"]')
    fontTags.forEach((tag) => {
      tag.removeAttribute("size")
      ;(tag as HTMLElement).style.fontSize = `${sizePx}px`
    })
    saveSelection()
    const text = editorRef.current.textContent?.trim() ?? ""
    setCharacterCount(text.length)
    setWordCount(text ? text.split(/\s+/).length : 0)
  }

  const handleInsertImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const doUploadAndInsert = async () => {
      setIsUploadingEditorImage(true)
      try {
        const payload = new FormData()
        payload.append("file", file)
        payload.append("folder", "web-content")

        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body: payload,
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.url) {
          toast.error(String(data?.error ?? "Failed to upload image."))
          return
        }

        const src = String(data.url)
        restoreSelection()
        const html = `<img src="${src}" alt="Announcement image" style="max-width:100%;width:auto;height:auto;display:block;border-radius:8px;border:1px solid #e2e8f0;margin:12px 0;" />`
        runCommand("insertHTML", html)
        toast.success("Image inserted.")
      } catch {
        toast.error("Failed to upload image.")
      } finally {
        setIsUploadingEditorImage(false)
      }
    }

    void doUploadAndInsert()
    event.target.value = ""
  }

  useEffect(() => {
    const previousChannel = previousDeliveryChannelRef.current
    previousDeliveryChannelRef.current = deliveryChannel

    if (deliveryChannel === "email") {
      if (previousChannel !== "email" && editorRef.current) {
        const restoredHtml = emailDraftSnapshotRef.current || initialContentHtml
        editorRef.current.innerHTML = restoredHtml
        const text = editorRef.current.textContent?.trim() ?? ""
        setCharacterCount(text.length)
        setWordCount(text ? text.split(/\s+/).length : 0)
      }
      setPreviewOpen(false)
      return
    }

    emailDraftSnapshotRef.current =
      emailDraftHtml || emailDraftSnapshotRef.current || initialContentHtml
    setEmailDraftHtml("")
    if (editorRef.current) {
      editorRef.current.innerHTML = ""
      clearImageSelection()
    }
    setHasSelectedImage(false)
    setPreviewOpen(false)
  }, [deliveryChannel])

  useEffect(() => {
    const loadRecipients = async () => {
      if (!baseUrl || !accessToken) return
      setIsLoadingRecipients(true)
      try {
        const params = new URLSearchParams({
          recipient_type: "members",
          per_page: "100000",
        })
        const recipientPath =
          deliveryChannel === "sms"
            ? "/api/admin/sms-blast/recipients"
            : "/api/admin/email-blast/recipients"
        const response = await fetch(
          `${baseUrl}${recipientPath}?${params.toString()}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          toast.error(
            String(data?.message ?? "Failed to load recipient emails.")
          )
          return
        }
        const recipients: RecipientOption[] = Array.isArray(data?.recipients)
          ? (data.recipients as unknown[])
              .map((item: unknown) => {
                if (
                  deliveryChannel === "sms" &&
                  item &&
                  typeof item === "object"
                ) {
                  const phone = String(
                    (item as { phone?: unknown }).phone ?? ""
                  ).trim()
                  const name =
                    String((item as { name?: unknown }).name ?? "").trim() ||
                    "Customer"
                  const firstName = String(
                    (item as { first_name?: unknown }).first_name ?? ""
                  ).trim()
                  const middleName = String(
                    (item as { middle_name?: unknown }).middle_name ?? ""
                  ).trim()
                  const lastName = String(
                    (item as { last_name?: unknown }).last_name ?? ""
                  ).trim()
                  const username = String(
                    (item as { username?: unknown }).username ?? ""
                  ).trim()
                  const localPhone = phone.startsWith("63")
                    ? `0${phone.slice(2)}`
                    : phone
                  const phoneWithoutCountryCode = phone.startsWith("63")
                    ? phone.slice(2)
                    : phone
                  return phone
                    ? {
                        value: phone,
                        label: `+${phone} - ${name}`,
                        searchText: [
                          phone,
                          localPhone,
                          phoneWithoutCountryCode,
                          name,
                          firstName,
                          middleName,
                          lastName,
                          username,
                        ]
                          .filter(Boolean)
                          .join(" "),
                      }
                    : null
                }
                const value = String(item ?? "").trim()
                return value
                  ? {
                      value:
                        deliveryChannel === "email"
                          ? value.toLowerCase()
                          : value,
                      label: value,
                    }
                  : null
              })
              .filter((item: RecipientOption | null): item is RecipientOption =>
                Boolean(item)
              )
          : []
        const normalizedRecipients = Array.from(
          new Map(
            recipients.map((item: RecipientOption) => [item.value, item])
          ).values()
        )
        setMemberEmails(normalizedRecipients)
      } catch {
        toast.error(
          deliveryChannel === "sms"
            ? "Unable to load mobile numbers."
            : "Unable to load member emails."
        )
      } finally {
        setIsLoadingRecipients(false)
      }
    }

    loadRecipients()
  }, [baseUrl, accessToken, deliveryChannel])

  useEffect(() => {
    setSelectedEmails([])
    setRecipientSearch("")
  }, [baseUrl, accessToken, deliveryChannel])

  useEffect(() => {
    if (sendTimingMode === "scheduled" && !scheduledFor) {
      setScheduledFor(
        formatLocalDatetimeInput(new Date(Date.now() + 60 * 60 * 1000))
      )
    }
  }, [scheduledFor, sendTimingMode])

  const clearImageSelection = () => {
    if (!editorRef.current) return
    const selected = editorRef.current.querySelectorAll(
      'img[data-selected="true"]'
    )
    selected.forEach((img) => {
      img.removeAttribute("data-selected")
      ;(img as HTMLImageElement).style.outline = "none"
    })
    setHasSelectedImage(false)
  }

  const removeSelectedImage = () => {
    if (!editorRef.current) return
    const selected = editorRef.current.querySelector(
      'img[data-selected="true"]'
    )
    if (selected) {
      selected.remove()
      setHasSelectedImage(false)
      const text = editorRef.current.textContent?.trim() ?? ""
      setCharacterCount(text.length)
      setWordCount(text ? text.split(/\s+/).length : 0)
    }
  }

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email)
        ? prev.filter((item) => item !== email)
        : [...prev, email]
    )
  }

  const toggleSelectVisible = () => {
    if (filteredMemberEmails.length === 0) return
    setSelectedEmails((prev) => {
      if (isAllVisibleSelected) {
        return prev.filter(
          (email) => !filteredMemberEmails.some((item) => item.value === email)
        )
      }
      const next = new Set(prev)
      filteredMemberEmails.forEach((item) => next.add(item.value))
      return Array.from(next)
    })
  }

  const sendAnnouncement = async () => {
    const liveEditorHtml = editorRef.current?.innerHTML?.trim() ?? ""
    if (!title.trim()) {
      toast.error("Announcement title is required.")
      return
    }
    if (!baseUrl) {
      toast.error("Missing NEXT_PUBLIC_LARAVEL_API_URL.")
      return
    }
    if (!accessToken) {
      toast.error("Session expired. Please log in again.")
      return
    }
    if (recipientMode === "specific" && selectedEmails.length === 0) {
      toast.error("Select at least one recipient email.")
      return
    }

    const isEmailMode = deliveryChannel === "email"
    const smsText = smsMessage.trim()
    const isScheduledSend = sendTimingMode === "scheduled"
    const scheduledDate = isScheduledSend ? new Date(scheduledFor) : null

    if (isEmailMode && !liveEditorHtml) {
      toast.error("Announcement content is required.")
      return
    }
    if (!isEmailMode && !smsText) {
      toast.error("SMS content is required.")
      return
    }
    if (isScheduledSend) {
      if (
        !scheduledFor ||
        !scheduledDate ||
        Number.isNaN(scheduledDate.getTime())
      ) {
        toast.error("Select a valid date and time for the schedule.")
        return
      }
      if (scheduledDate.getTime() <= Date.now()) {
        toast.error("Schedule time must be in the future.")
        return
      }
    }

    setIsSending(true)
    setLastSendResult(null)

    try {
      const safeTitle = title
        .trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
      const firstImageMatch = liveEditorHtml.match(/<img\b[^>]*>/i)
      const topImageHtml = firstImageMatch ? firstImageMatch[0] : ""
      const contentWithoutTopImage = firstImageMatch
        ? liveEditorHtml.replace(firstImageMatch[0], "").trim()
        : liveEditorHtml
      const normalizedTopImage = topImageHtml
        ? topImageHtml.replace(
            /style=["'][^"']*["']/i,
            'style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:0;margin:0 0 16px;"'
          )
        : ""
      const bodyWithTitle = isEmailMode
        ? `${normalizedTopImage}<h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;font-weight:800;color:#0f172a;">${safeTitle}</h1>${contentWithoutTopImage}`
        : smsText
      const formData = new FormData()
      formData.append("subject", title.trim())
      formData.append("body", bodyWithTitle)
      formData.append("channel", isEmailMode ? "email" : "sms")
      if (isScheduledSend && scheduledDate) {
        formData.append("scheduled_at", scheduledDate.toISOString())
      }
      if (recipientMode === "all") {
        formData.append("recipient_type", "members")
      } else {
        selectedEmails.forEach((email) =>
          formData.append("recipients[]", email)
        )
      }

      const sendPath = isEmailMode
        ? "/api/admin/email-blast/send"
        : "/api/admin/sms-blast/send"
      const response = await fetch(`${baseUrl}${sendPath}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toast.error(String(data?.message ?? "Failed to send announcement."))
        return
      }

      if (data?.scheduled) {
        const scheduledLabel = data?.scheduled_at
          ? new Date(String(data.scheduled_at)).toLocaleString()
          : (scheduledDate?.toLocaleString() ?? "later")
        toast.success(`Announcement scheduled for ${scheduledLabel}.`)
        setSelectedEmails([])
        setRecipientSearch("")
        setPreviewOpen(false)
        setSendTimingMode("now")
        setScheduledFor("")
        return
      }

      // "Send now" is processed in the background by the queue worker — the
      // request returns immediately so it never times out on large lists.
      if (data?.queued) {
        const count = Number(data?.recipient_count ?? 0)
        toast.success(
          count > 0
            ? `Announcement is being sent to ${count} ${recipientUnitLabelPlural} in the background. It may take a few minutes.`
            : "Announcement is being sent in the background. It may take a few minutes."
        )
        setLastSendResult(null)
        setSelectedEmails([])
        setRecipientSearch("")
        if (!isEmailMode) {
          setSmsMessage("")
          setSmsCharacterCount(0)
          setSmsWordCount(0)
        }
        setPreviewOpen(false)
        return
      }

      const sent = Number(data?.sent_count ?? 0)
      const failed = Number(data?.failed_count ?? 0)
      setLastSendResult({ sent, failed })
      setSelectedEmails([])
      setRecipientSearch("")
      if (!isEmailMode) {
        setSmsMessage("")
        setSmsCharacterCount(0)
        setSmsWordCount(0)
      }
      toast.success(`Announcement sent. Success: ${sent}, Failed: ${failed}`)
    } catch {
      toast.error("Unexpected error while sending announcement.")
    } finally {
      setIsSending(false)
    }
  }

  const buildAnnouncementPreview = () => {
    const liveEditorHtml = editorRef.current?.innerHTML?.trim() ?? ""
    const safeTitle = title
      .trim()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
    const isEmailMode = deliveryChannel === "email"
    const smsText = smsMessage.trim()

    if (isEmailMode) {
      const firstImageMatch = liveEditorHtml.match(/<img\b[^>]*>/i)
      const topImageHtml = firstImageMatch ? firstImageMatch[0] : ""
      const contentWithoutTopImage = firstImageMatch
        ? liveEditorHtml.replace(firstImageMatch[0], "").trim()
        : liveEditorHtml
      const normalizedTopImage = topImageHtml
        ? topImageHtml.replace(
            /style=["'][^"']*["']/i,
            'style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:0;margin:0 0 16px;"'
          )
        : ""

      return {
        title: safeTitle,
        body: `${normalizedTopImage}<h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;font-weight:800;color:#0f172a;">${safeTitle}</h1>${contentWithoutTopImage}`,
        plainText: "",
      }
    }

    return {
      title: safeTitle,
      body: smsText,
      plainText: smsText,
    }
  }

  const renderEmailComposer = () => (
    <div
      data-announcement-email-editor
      className="overflow-hidden rounded-xl border border-[#d6dff7]"
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-[#d6dff7] bg-[#eef3ff] px-3 py-2">
        <button
          type="button"
          className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-[#1a357f] hover:bg-[#dde8ff]"
        >
          Paragraph <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <label className="ml-1 flex h-8 items-center rounded-md border border-[#cfdbfd] bg-white px-2 text-xs text-[#2f58c8]">
          <select
            value={fontFamily}
            onChange={(event) => {
              setFontFamily(event.target.value)
              runCommand("fontName", event.target.value)
            }}
            className="bg-transparent outline-none"
          >
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Verdana">Verdana</option>
            <option value="Tahoma">Tahoma</option>
          </select>
        </label>
        <label className="ml-1 flex h-8 items-center rounded-md border border-[#cfdbfd] bg-white px-2 text-xs text-[#2f58c8]">
          <select
            value={fontSize}
            onChange={(event) => {
              setFontSize(event.target.value)
              applyFontSize(event.target.value)
            }}
            className="bg-transparent outline-none"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10</option>
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
            <option value="28">28</option>
            <option value="32">32</option>
            <option value="36">36</option>
            <option value="40">40</option>
            <option value="50">50</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => runCommand("bold")}
          className={toolbarButtonClass}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => runCommand("italic")}
          className={toolbarButtonClass}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => runCommand("underline")}
          className={toolbarButtonClass}
        >
          <Underline className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => runCommand("strikeThrough")}
          className={toolbarButtonClass}
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => runListCommand("insertUnorderedList")}
          className={toolbarButtonClass}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => runListCommand("insertOrderedList")}
          className={toolbarButtonClass}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => runCommand("justifyLeft")}
          className={toolbarButtonClass}
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => runCommand("justifyCenter")}
          className={toolbarButtonClass}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => runCommand("justifyRight")}
          className={toolbarButtonClass}
          title="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => runCommand("formatBlock", "blockquote")}
          className={toolbarButtonClass}
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Enter link URL")
            if (url) runCommand("createLink", url)
          }}
          className={toolbarButtonClass}
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            saveSelection()
            imageInputRef.current?.click()
          }}
          className={toolbarButtonClass}
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={removeSelectedImage}
          disabled={!hasSelectedImage}
          className={`${toolbarButtonClass} ${hasSelectedImage ? "" : "cursor-not-allowed opacity-40"}`}
          title="Remove selected image"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <div className="relative">
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => {
              if (!showEmojiMenu && emojiButtonRef.current) {
                const rect = emojiButtonRef.current.getBoundingClientRect()
                const pickerWidth = 288
                const spaceOnRight = window.innerWidth - rect.left
                const left =
                  spaceOnRight >= pickerWidth
                    ? rect.left
                    : Math.max(8, rect.right - pickerWidth)
                setEmojiMenuPos({
                  top: rect.bottom + 8,
                  left,
                })
              }
              setShowEmojiMenu((prev) => !prev)
            }}
            className={toolbarButtonClass}
            title="Insert emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          {showEmojiMenu && emojiMenuPos ? (
            <div
              className="fixed z-9999 w-72 rounded-lg border border-[#c7d4ff] bg-white p-2 shadow-xl"
              style={{ top: emojiMenuPos.top, left: emojiMenuPos.left }}
            >
              <div className="grid max-h-52 grid-cols-8 gap-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="rounded-md p-1.5 text-lg hover:bg-[#eef3ff]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => runCommand("removeFormat")}
          className={toolbarButtonClass}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInsertImage}
        />
      </div>
      {isUploadingEditorImage ? (
        <div className="border-b border-[#d6dff7] bg-amber-50 px-4 py-2 text-xs text-amber-700">
          Uploading image...
        </div>
      ) : null}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => {
          const text = event.currentTarget.textContent?.trim() ?? ""
          const nextHtml = event.currentTarget.innerHTML
          emailDraftSnapshotRef.current = nextHtml
          setEmailDraftHtml(nextHtml)
          setCharacterCount(text.length)
          setWordCount(text ? text.split(/\s+/).length : 0)
          saveSelection()
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.shiftKey) {
            const selection = window.getSelection()
            const node = selection?.anchorNode
            const element = node instanceof Element ? node : node?.parentElement
            const inListItem = Boolean(element?.closest("ol li, ul li"))
            if (inListItem) {
              event.preventDefault()
              document.execCommand("insertParagraph")
              saveSelection()
            }
          }
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onClick={(event) => {
          const target = event.target as HTMLElement
          if (target.tagName === "IMG") {
            clearImageSelection()
            target.setAttribute("data-selected", "true")
            ;(target as HTMLImageElement).style.outline = "2px solid #6366f1"
            ;(target as HTMLImageElement).style.outlineOffset = "2px"
            setHasSelectedImage(true)
          } else {
            clearImageSelection()
          }
        }}
        className="min-h-[300px] max-h-[520px] overflow-y-auto space-y-4 bg-white px-4 py-5 text-[15px] leading-relaxed text-[#2f4177] focus:outline-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_img]:my-3 [&_img]:!h-auto [&_img]:!max-w-[320px] [&_img]:!w-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-[#c7d4ff]"
      />

      <div className="flex items-center justify-between border-t border-[#d6dff7] bg-[#eef3ff] px-4 py-2 text-xs text-[#4f75dc]">
        <span>div &gt; p &gt; strong</span>
        <span>
          Characters: {characterCount} | Words: {wordCount}
        </span>
      </div>
    </div>
  )

  const renderSmsComposer = () => (
    <div className="space-y-3 rounded-xl border border-[#d6dff7] bg-white p-4">
      <div className="rounded-lg border border-[#d6dff7] bg-[#f7f9ff] px-3 py-2 text-sm text-[#4e67ab]">
        SMS supports plain text only. Images and rich formatting are disabled
        for this channel.
      </div>
      <textarea
        value={smsMessage}
        onChange={(event) => {
          const value = event.target.value
          setSmsMessage(value)
          setSmsCharacterCount(value.length)
          setSmsWordCount(value.trim() ? value.trim().split(/\s+/).length : 0)
        }}
        placeholder="Type your SMS message here..."
        rows={10}
        className="w-full rounded-xl border border-[#d6dff7] px-4 py-3 text-sm text-[#1a357f] placeholder:text-[#8fa0cf] focus:border-[#4f75dc] focus:outline-none focus:ring-2 focus:ring-[#dbe6ff]"
      />
      <div className="flex items-center justify-between text-xs text-[#4f75dc]">
        <span>Plain text only</span>
        <span>
          Characters: {smsCharacterCount} | Words: {smsWordCount}
        </span>
      </div>
    </div>
  )

  return (
    <div
      data-announcement-sms-mode={deliveryChannel === "sms" ? "true" : "false"}
      className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12"
    >
      <style>{`
        [data-announcement-sms-mode="true"] img {
          display: none !important;
        }
        [data-announcement-sms-mode="true"] [data-announcement-email-editor] {
          display: none !important;
        }
      `}</style>
      <div className="space-y-5 rounded-2xl border border-[#dce5ff] bg-white p-4 shadow-sm xl:col-span-8 md:p-5">
        <section
          key={deliveryChannel}
          className={`space-y-3 ${deliveryChannel === "sms" ? "[&_[data-announcement-email-editor]]:hidden [&_img]:hidden" : ""}`}
        >
          <h2 className="text-[20px] font-bold text-[#17398d]">1. Channel</h2>
          <p className="text-sm text-[#4e67ab]">
            Choose between email with rich content or SMS with text only.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label
              htmlFor="announcement-channel-email"
              className={`relative flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                deliveryChannel === "email"
                  ? "border-[#3f69db] bg-[#f3f6ff]"
                  : "border-[#d6dff7] bg-white"
              }`}
            >
              <input
                id="announcement-channel-email"
                type="radio"
                checked={deliveryChannel === "email"}
                onChange={() => setDeliveryChannel("email")}
                className="sr-only"
              />
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#2457e7] text-white shadow-sm">
                <Mail className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-base font-semibold text-[#1a357f]">
                  Email
                </span>
                <span className="block text-sm text-[#4e67ab]">
                  Rich text, images, links and formatting
                </span>
              </span>
              <span
                className={`h-5 w-5 rounded-full border-2 ${deliveryChannel === "email" ? "border-[#2457e7]" : "border-[#a7b8e6]"}`}
              >
                <span
                  className={`m-[3px] block h-2.5 w-2.5 rounded-full ${deliveryChannel === "email" ? "bg-[#2457e7]" : "bg-transparent"}`}
                />
              </span>
            </label>

            <label
              htmlFor="announcement-channel-sms"
              className={`relative flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                deliveryChannel === "sms"
                  ? "border-[#3f69db] bg-[#f3f6ff]"
                  : "border-[#d6dff7] bg-white"
              }`}
            >
              <input
                id="announcement-channel-sms"
                type="radio"
                checked={deliveryChannel === "sms"}
                onChange={() => setDeliveryChannel("sms")}
                className="sr-only"
              />
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef3ff] text-[#2457e7] shadow-sm">
                <MessageSquareText className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-base font-semibold text-[#1a357f]">
                  SMS
                </span>
                <span className="block text-sm text-[#4e67ab]">
                  Plain text only, no images or rich formatting
                </span>
              </span>
              <span
                className={`h-5 w-5 rounded-full border-2 ${deliveryChannel === "sms" ? "border-[#2457e7]" : "border-[#a7b8e6]"}`}
              >
                <span
                  className={`m-[3px] block h-2.5 w-2.5 rounded-full ${deliveryChannel === "sms" ? "bg-[#2457e7]" : "bg-transparent"}`}
                />
              </span>
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[20px] font-bold text-[#17398d]">
            2. Announcement Title
          </h2>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value.slice(0, maxTitleLength))
              }
              placeholder="Enter announcement title"
              className="w-full rounded-xl border border-[#d6dff7] px-4 py-3 pr-16 text-sm text-[#1a357f] placeholder:text-[#8fa0cf] focus:border-[#4f75dc] focus:outline-none focus:ring-2 focus:ring-[#dbe6ff]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#4f75dc]">
              {title.length}/{maxTitleLength}
            </span>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[20px] font-bold text-[#17398d]">
            3. {deliveryChannel === "email" ? "Email Content" : "SMS Message"}
          </h2>
          <p className="text-sm text-[#4e67ab]">
            {deliveryChannel === "email"
              ? "Create your announcement content. You can format text, add images, buttons and more."
              : "SMS is text-only. Keep it short and avoid images, links with previews, or rich formatting."}
          </p>

          {deliveryChannel === "email"
            ? renderEmailComposer()
            : renderSmsComposer()}

          <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6dff7] bg-[#eef3ff] px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-[#2f58c8]">
              <Smile className="h-4 w-4 text-[#2f58c8]" />
              <span>
                {deliveryChannel === "email"
                  ? "Use variables to personalize your announcement."
                  : "SMS is plain text only; variables still work."}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {VARIABLE_TOKENS.slice(0, 2).map((token) => (
                <button
                  key={token.token}
                  type="button"
                  onClick={() => insertVariableToken(token.token)}
                  className="rounded-md border border-[#c7d4ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f58c8]"
                >
                  {token.token}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowVariableMenu((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-md border border-[#c7d4ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f58c8]"
              >
                More variables <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {showVariableMenu ? (
              <div className="absolute right-3 bottom-[calc(100%+6px)] z-20 w-72 rounded-lg border border-[#c7d4ff] bg-white p-2 shadow-lg">
                {VARIABLE_TOKENS.map((item) => (
                  <button
                    key={item.token}
                    type="button"
                    onClick={() => {
                      insertVariableToken(item.token)
                    }}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-[#2f4177] hover:bg-[#eef3ff]"
                  >
                    <span>{item.label}</span>
                    <span className="text-[#7f95d4]">{item.token}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <aside className="space-y-4 rounded-2xl border border-[#dce5ff] bg-white p-4 shadow-sm xl:col-span-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2457e7] text-white shadow-sm">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#17398d]">
              Announcement Actions
            </div>
            <p className="mt-0.5 text-sm text-[#4e67ab]">
              Choose audience and send your announcement.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[#d6dff7] p-3">
          <p className="text-sm font-bold text-[#17398d]">Recipients</p>
          <label className="flex items-center gap-2 text-sm text-[#2f4177]">
            <input
              type="radio"
              checked={recipientMode === "all"}
              onChange={() => setRecipientMode("all")}
            />
            Send to all registered members
          </label>
          <label className="flex items-center gap-2 text-sm text-[#2f4177]">
            <input
              type="radio"
              checked={recipientMode === "specific"}
              onChange={() => setRecipientMode("specific")}
            />
            Send to specific {recipientUnitLabelPlural}
          </label>

          {recipientMode === "specific" ? (
            <div className="space-y-2">
              <div
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${isFocusedSearch ? "border-[#4f75dc] ring-2 ring-[#dbe6ff]" : "border-[#d6dff7]"}`}
              >
                <input
                  type="text"
                  value={recipientSearch}
                  onFocus={() => setIsFocusedSearch(true)}
                  onBlur={() => setIsFocusedSearch(false)}
                  onChange={(event) => setRecipientSearch(event.target.value)}
                  placeholder={recipientSearchPlaceholder}
                  className="w-full text-xs text-[#1a357f] placeholder:text-[#8fa0cf] focus:outline-none"
                />
                <svg
                  className="h-3.5 w-3.5 text-[#7f95d4]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </div>
              <button
                type="button"
                onClick={toggleSelectVisible}
                className="rounded-md border border-[#c7d4ff] px-2 py-1 text-[11px] font-semibold text-[#2f58c8] hover:bg-[#eef3ff]"
              >
                {isAllVisibleSelected ? "Unselect visible" : "Select visible"}
              </button>
              <div className="max-h-64 overflow-auto rounded-lg border border-[#d6dff7] p-1.5">
                {isLoadingRecipients ? (
                  <p className="px-2 py-1 text-[11px] text-[#7f95d4]">
                    Loading {recipientUnitLabelPlural}...
                  </p>
                ) : filteredMemberEmails.length === 0 ? (
                  <p className="px-2 py-1 text-[11px] text-[#7f95d4]">
                    No {recipientUnitLabelPlural} found.
                  </p>
                ) : (
                  filteredMemberEmails.map((item) => (
                    <label
                      key={item.value}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[13px] text-[#2f4177] hover:bg-[#eef3ff]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(item.value)}
                        onChange={() => toggleEmail(item.value)}
                      />
                      <span className="truncate">{item.label}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-[12px] font-semibold text-[#4f75dc]">
                Selected: {selectedEmails.length}
              </p>
              {selectedEmails.length > 0 ? (
                <div className="max-h-24 overflow-auto rounded-lg border border-[#d6dff7] bg-[#f7f9ff] p-2">
                  <p className="mb-1 text-[11px] font-semibold text-[#4f75dc]">
                    Selected {recipientUnitLabelPlural}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-full border border-[#c7d4ff] bg-white px-2 py-0.5 text-[10px] text-[#2f4177]"
                      >
                        <span>{recipientLabelMap.get(email) ?? email}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedEmails((prev) =>
                              prev.filter((item) => item !== email)
                            )
                          }
                          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#c7d4ff] text-[9px] leading-none text-[#2f58c8] hover:bg-[#eef3ff]"
                          title={`Remove ${recipientUnitLabel}`}
                          aria-label={`Remove ${recipientUnitLabel}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-xl border border-[#d6dff7] p-3">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#2457e7]" />
            <p className="text-sm font-bold text-[#17398d]">Scheduler</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                sendTimingMode === "now"
                  ? "border-[#3f69db] bg-[#f3f6ff] text-[#17398d]"
                  : "border-[#d6dff7] bg-white text-[#2f4177]"
              }`}
            >
              <input
                type="radio"
                checked={sendTimingMode === "now"}
                onChange={() => setSendTimingMode("now")}
              />
              Send now
            </label>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                sendTimingMode === "scheduled"
                  ? "border-[#3f69db] bg-[#f3f6ff] text-[#17398d]"
                  : "border-[#d6dff7] bg-white text-[#2f4177]"
              }`}
            >
              <input
                type="radio"
                checked={sendTimingMode === "scheduled"}
                onChange={() => {
                  setSendTimingMode("scheduled")
                  if (!scheduledFor) {
                    setScheduledFor(
                      formatLocalDatetimeInput(
                        new Date(Date.now() + 60 * 60 * 1000)
                      )
                    )
                  }
                }}
              />
              Schedule later
            </label>
          </div>
          {sendTimingMode === "scheduled" ? (
            <div className="space-y-2 rounded-lg border border-[#d6dff7] bg-[#f7f9ff] p-3">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#4f75dc]">
                <CalendarDays className="h-3.5 w-3.5" />
                Send date & time
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="w-full rounded-lg border border-[#c7d4ff] bg-white px-3 py-2 text-sm text-[#1a357f] focus:border-[#4f75dc] focus:outline-none focus:ring-2 focus:ring-[#dbe6ff]"
              />
              <p className="text-[11px] leading-relaxed text-[#7f95d4]">
                Scheduled announcements are queued and sent automatically when
                the selected time is reached.
              </p>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-[#7f95d4]">
              Send immediately, or switch to scheduling and queue this
              announcement for later.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#c7d4ff] bg-white px-4 py-2.5 text-base font-semibold text-[#2457e7] transition hover:bg-[#eef3ff]"
        >
          <ChevronDown className="h-4 w-4 rotate-180" />
          Preview {deliveryChannel === "email" ? "Email" : "SMS"}
        </button>

        <button
          type="button"
          onClick={sendAnnouncement}
          disabled={isSending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2457e7] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#1f4bd0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          {isSending
            ? recipientMode === "all"
              ? deliveryChannel === "email"
                ? sendTimingMode === "scheduled"
                  ? "Scheduling email for all members..."
                  : "Sending email to all members..."
                : sendTimingMode === "scheduled"
                  ? "Scheduling SMS for all members..."
                  : "Sending SMS to all members..."
              : deliveryChannel === "email"
                ? sendTimingMode === "scheduled"
                  ? "Scheduling email to selected emails..."
                  : "Sending email to selected emails..."
                : sendTimingMode === "scheduled"
                  ? "Scheduling SMS to selected emails..."
                  : "Sending SMS to selected emails..."
            : sendTimingMode === "scheduled"
              ? "Schedule Announcement"
              : "Send Announcement"}
        </button>

        {lastSendResult ? (
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#d6dff7] bg-[#f7f9ff] p-3">
            <div className="rounded-lg border border-[#dce5ff] bg-white p-3 text-center">
              <p className="text-xs font-semibold text-[#4f75dc]">Sent</p>
              <p className="text-2xl font-bold text-[#17398d]">
                {lastSendResult.sent}
              </p>
            </div>
            <div className="rounded-lg border border-[#dce5ff] bg-white p-3 text-center">
              <p className="text-xs font-semibold text-[#4f75dc]">Failed</p>
              <p className="text-2xl font-bold text-[#17398d]">
                {lastSendResult.failed}
              </p>
            </div>
          </div>
        ) : null}
      </aside>

      {previewOpen
        ? (() => {
            const preview = buildAnnouncementPreview()
            const isEmailPreview = deliveryChannel === "email"
            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
                onClick={() => setPreviewOpen(false)}
              >
                <div
                  className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-br from-slate-50 via-white to-[#eef3ff] shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4 border-b border-white/70 bg-white/70 px-6 py-5 backdrop-blur">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e4ff] bg-[#f3f7ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#5671b5]">
                        {isEmailPreview ? "Email Preview" : "SMS Preview"}
                      </div>
                      <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
                        Review your message before sending
                      </h3>
                      <p className="text-sm text-slate-500">
                        {isEmailPreview
                          ? "This is how the announcement will read in email."
                          : "This is the exact text that will be sent as SMS."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(false)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid max-h-[calc(92vh-88px)] gap-0 overflow-auto lg:grid-cols-[1.4fr_0.8fr]">
                    <div className="border-b border-white/70 bg-gradient-to-b from-white/60 to-slate-50/80 p-5 lg:border-b-0 lg:border-r">
                      {isEmailPreview ? (
                        <div className="mx-auto max-w-3xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                              Email Client Preview
                            </div>
                            <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-semibold text-[#4568c7]">
                              Subject: {preview.title || "Untitled"}
                            </span>
                          </div>

                          <div className="space-y-4 px-5 py-5">
                            <div className="rounded-2xl border border-[#dfe7ff] bg-[#f8fbff] p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                From
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                AF Home &lt;support@afhome.com&gt;
                              </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-[#fbfcff] p-5">
                              <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#2457e7] to-[#6e8cff] text-sm font-black text-white shadow-md">
                                  AF
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Announcement Preview
                                  </p>
                                  <p className="text-lg font-bold text-slate-900">
                                    {preview.title || "Untitled"}
                                  </p>
                                </div>
                              </div>

                              <div
                                className="preview-email prose max-w-none prose-headings:tracking-tight prose-p:leading-7 prose-img:rounded-2xl prose-img:border prose-img:border-slate-200"
                                dangerouslySetInnerHTML={{
                                  __html: preview.body,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mx-auto flex max-w-md justify-center">
                          <div className="w-full rounded-[34px] border border-slate-200 bg-slate-900 p-3 shadow-[0_25px_70px_rgba(15,23,42,0.28)]">
                            <div className="rounded-[28px] bg-[#f7f9ff] p-4">
                              <div className="mb-4 flex items-center justify-between">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    SMS Preview
                                  </p>
                                  <p className="text-lg font-bold text-slate-900">
                                    AF Home
                                  </p>
                                </div>
                                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                                  Message
                                </div>
                              </div>

                              <div className="rounded-[24px] bg-slate-900 p-4 text-white shadow-inner">
                                <div className="mb-4 flex justify-end">
                                  <div className="max-w-[90%] rounded-[22px] rounded-tr-md bg-gradient-to-br from-[#2457e7] to-[#6d86ff] px-4 py-3 shadow-lg">
                                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white">
                                      {preview.plainText}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                  Sent via AF Home SMS
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Channel
                        </p>
                        <p className="mt-1 text-base font-bold text-slate-900">
                          {isEmailPreview ? "Email" : "SMS"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Title
                        </p>
                        <p className="mt-1 text-base font-bold text-slate-900">
                          {preview.title || "Untitled"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Recipients
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {recipientMode === "all"
                            ? `All registered ${isEmailPreview ? "members" : "mobile numbers"}`
                            : `${selectedEmails.length} selected ${isEmailPreview ? "emails" : "mobile numbers"}`}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Length
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {isEmailPreview
                            ? `${(editorRef.current?.textContent ?? "").trim().length} characters in body`
                            : `${smsCharacterCount} characters, ${smsWordCount} words`}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Notes
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {isEmailPreview
                            ? "This email preview keeps the headline, formatting, and inserted image placement intact."
                            : "SMS preview is plain text only, so images and rich formatting are intentionally excluded."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()
        : null}
    </div>
  )
}
