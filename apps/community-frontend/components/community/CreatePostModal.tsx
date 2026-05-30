"use client"

import { useState } from "react"
import { AnimatePresence, motion, type Transition } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, ImagePlus, X } from "lucide-react"
import { TimePicker } from "@/components/ui/TimePicker"
import { LocationSearch } from "@/components/ui/LocationSearch"
import { cn } from "@/lib/utils"

const categories = [
  { value: "general",  label: "General" },
  { value: "question", label: "❓ Question" },
  { value: "event",    label: "📅 Event" },
  { value: "for_sale", label: "🏷️ For Sale" },
  { value: "safety",   label: "🛡️ Safety" },
  { value: "free",     label: "🎁 Free" },
]

const conditions = ["Brand New", "Like New", "Good", "Fair", "For Parts"]

interface CreatePostModalProps {
  open: boolean
  onClose: () => void
}

export function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const [category, setCategory]       = useState("general")
  const [title, setTitle]             = useState("")
  const [content, setContent]         = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  // Event fields
  const [eventDate, setEventDate]     = useState<Date | undefined>(undefined)
  const [eventTime, setEventTime]     = useState("")
  const [location, setLocation]       = useState("")
  // For Sale fields
  const [price, setPrice]             = useState("")
  const [condition, setCondition]     = useState("Brand New")

  const showImage    = ["general", "for_sale", "free"].includes(category)
  const showEvent    = category === "event"
  const showForSale  = category === "for_sale"
  const showLocation = ["event", "safety"].includes(category)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function handleCategoryChange(val: string) {
    setCategory(val)
    setImagePreview(null)
    setEventDate(undefined)
    setEventTime("")
    setLocation("")
    setPrice("")
    setCondition("Brand New")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: connect to community backend
    handleClose()
  }

  function handleClose() {
    setCategory("general")
    setTitle("")
    setContent("")
    setImagePreview(null)
    setEventDate(undefined)
    setEventTime("")
    setLocation("")
    setPrice("")
    setCondition("Brand New")
    onClose()
  }

  const fieldVariants = {
    hidden: { opacity: 0, y: 8, height: 0 },
    visible: { opacity: 1, y: 0, height: "auto" },
    exit:   { opacity: 0, y: -4, height: 0 },
  }

  const transition: Transition = { duration: 0.18 }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <AnimatePresence>
        {open && (
          <DialogContent forceMount className="sm:max-w-lg p-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 overflow-visible"
            >
              <DialogHeader className="mb-4">
                <DialogTitle className="text-base font-semibold text-zinc-900">
                  Post to Community
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-zinc-700">Category</Label>
                  <Select value={category} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-zinc-700">Title</Label>
                  <Input
                    placeholder={
                      category === "question" ? "What would you like to ask?"
                      : category === "for_sale" ? "What are you selling?"
                      : category === "free" ? "What are you giving away?"
                      : category === "safety" ? "Describe the safety concern"
                      : category === "event" ? "Event name"
                      : "What's on your mind?"
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-9 bg-zinc-50 border-zinc-200 text-sm"
                    required
                  />
                </div>

                {/* Event Fields */}
                <AnimatePresence>
                  {showEvent && (
                    <motion.div
                      key="event-fields"
                      variants={fieldVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={transition}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        {/* Date — shadcn Calendar */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-zinc-700">Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full h-9 justify-start text-sm font-normal bg-zinc-50 border-zinc-200",
                                  !eventDate && "text-zinc-400"
                                )}
                              >
                                <CalendarIcon className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                                {eventDate ? format(eventDate, "MMM d, yyyy") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={eventDate}
                                onSelect={setEventDate}
                                disabled={{ before: new Date() }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        {/* Time */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-zinc-700">Time</Label>
                          <TimePicker
                            value={eventTime}
                            onChange={setEventTime}
                            placeholder="Pick a time"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Location */}
                <AnimatePresence>
                  {showLocation && (
                    <motion.div
                      key="location"
                      variants={fieldVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={transition}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <Label className="text-sm font-medium text-zinc-700">Location</Label>
                      <LocationSearch
                        value={location}
                        onChange={setLocation}
                        placeholder="Search location..."
                        required={showLocation}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* For Sale Fields */}
                <AnimatePresence>
                  {showForSale && (
                    <motion.div
                      key="forsale-fields"
                      variants={fieldVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={transition}
                      className="grid grid-cols-2 gap-3 overflow-hidden"
                    >
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700">Price (₱)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="h-9 bg-zinc-50 border-zinc-200 text-sm"
                          required={showForSale}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700">Condition</Label>
                        <Select value={condition} onValueChange={setCondition}>
                          <SelectTrigger className="h-9 bg-zinc-50 border-zinc-200 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {conditions.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-zinc-700">Details</Label>
                  <Textarea
                    placeholder={
                      category === "question" ? "Add more context to your question..."
                      : category === "safety" ? "Describe what happened and where..."
                      : "Share more details with your community..."
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-zinc-50 border-zinc-200 text-sm resize-none min-h-24"
                    required
                  />
                </div>

                {/* Image Upload */}
                <AnimatePresence>
                  {showImage && (
                    <motion.div
                      key="image-upload"
                      variants={fieldVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={transition}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <Label className="text-sm font-medium text-zinc-700">Photo (optional)</Label>
                      <AnimatePresence mode="wait">
                        {imagePreview ? (
                          <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="relative rounded-lg overflow-hidden border border-zinc-200"
                          >
                            <img src={imagePreview} alt="preview" className="w-full h-40 object-cover" />
                            <button
                              type="button"
                              onClick={() => setImagePreview(null)}
                              className="absolute top-2 right-2 w-6 h-6 bg-zinc-900/70 text-white rounded-full flex items-center justify-center hover:bg-zinc-900 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.label
                            key="dropzone"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-300 rounded-lg h-24 cursor-pointer hover:bg-zinc-50 transition-colors"
                          >
                            <ImagePlus className="w-5 h-5 text-zinc-400" />
                            <span className="text-xs text-zinc-400">Click to upload a photo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                          </motion.label>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={handleClose} className="h-9 text-sm text-zinc-600">
                    Cancel
                  </Button>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit"
                      className="h-9 px-5 bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-medium"
                      disabled={!title || !content}
                    >
                      Post
                    </Button>
                  </motion.div>
                </div>

              </form>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  )
}
