"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { CalendarIcon, ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod/v4";

import { useCreateCommunityPost } from "@/lib/hooks/use-create-community-post";
import { useUpdateCommunityPost } from "@/lib/hooks/use-update-community-post";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationSearch } from "@/components/ui/LocationSearch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/TimePicker";
import { cn } from "@/lib/utils";

const categories = [
  { value: "GENERAL", label: "General" },
  { value: "QUESTION", label: "Question" },
  { value: "EVENT", label: "Event" },
  { value: "FOR_SALE", label: "For Sale" },
  { value: "SAFETY", label: "Safety" },
  { value: "FREE", label: "Free" },
] as const;

const conditions = [
  { value: "BRAND_NEW", label: "Brand New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "FOR_PARTS", label: "For Parts" },
] as const;

const createPostSchema = z.object({
  category: z.enum([
    "GENERAL",
    "QUESTION",
    "EVENT",
    "FOR_SALE",
    "SAFETY",
    "FREE",
  ]),
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Details are required"),
  image: z.instanceof(File).optional().nullable(),
  eventDate: z.date().optional().nullable(),
  eventTime: z.string().optional().nullable(),
  eventEndTime: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  price: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
});

type CreatePostValues = z.infer<typeof createPostSchema>;

type EditPost = {
  id: string;
  category: CreatePostValues["category"];
  title: string;
  content: string;
  imageUrl?: string | null;
  eventDate?: string | null;
  eventTime?: string | null;
  eventEndTime?: string | null;
  location?: string | null;
  price?: string | null;
  condition?: string | null;
};

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  editPost?: EditPost;
  presetCategory?: string;
}

export function CreatePostModal({ open, onClose, editPost, presetCategory }: CreatePostModalProps) {
  const isEditMode = !!editPost;
  const [imagePreview, setImagePreview] = useState<string | null>(editPost?.imageUrl ?? null);
  const createPost = useCreateCommunityPost();
  const updatePost = useUpdateCommunityPost(editPost?.id ?? "");

  const mutation = isEditMode ? updatePost : createPost;

  const form = useForm<CreatePostValues>({
    resolver: zodResolver(createPostSchema as never) as Resolver<CreatePostValues>,
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (open && editPost) {
      form.reset({
        category: editPost.category,
        title: editPost.title,
        content: editPost.content,
        image: null,
        eventDate: editPost.eventDate ? new Date(editPost.eventDate) : null,
        eventTime: editPost.eventTime ?? "",
        eventEndTime: editPost.eventEndTime ?? "",
        location: editPost.location ?? "",
        price: editPost.price ?? "",
        condition: editPost.condition ?? "BRAND_NEW",
      });
      setImagePreview(editPost.imageUrl ?? null);
    } else if (open && presetCategory) {
      form.reset({ ...getDefaultValues(), category: presetCategory as CreatePostValues["category"] });
      setImagePreview(null);
    } else if (!open) {
      form.reset(getDefaultValues());
      setImagePreview(null);
    }
  }, [open, editPost, presetCategory, form]);

  const category = form.watch("category");
  const title = form.watch("title");
  const content = form.watch("content");
  const eventDate = form.watch("eventDate");

  const showImage = ["GENERAL", "FOR_SALE", "FREE"].includes(category);
  const showEvent = category === "EVENT";
  const showForSale = category === "FOR_SALE";
  const showLocation = ["EVENT", "SAFETY"].includes(category);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    form.setValue("image", file, { shouldDirty: true, shouldValidate: true });

    if (!file) {
      setImagePreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleCategoryChange(value: CreatePostValues["category"]) {
    form.setValue("category", value, { shouldDirty: true });
    form.setValue("image", null);
    form.setValue("eventDate", null);
    form.setValue("eventTime", "");
    form.setValue("eventEndTime", "");
    form.setValue("location", "");
    form.setValue("price", "");
    form.setValue("condition", "BRAND_NEW");
    setImagePreview(null);
  }

  function handleClose() {
    form.reset(getDefaultValues());
    setImagePreview(null);
    onClose();
  }

  function onSubmit(values: CreatePostValues) {
    if (isEditMode) {
      updatePost.mutate(values, {
        onSuccess: () => {
          handleClose();
          toast.success("Post updated successfully!");
        },
        onError: (error) => {
          toast.error(error.message ?? "Failed to update. Please try again.");
        },
      });
    } else {
      createPost.mutate(values, {
        onSuccess: () => {
          handleClose();
          toast.success("Post shared to the community!");
        },
        onError: (error) => {
          toast.error(error.message ?? "Failed to post. Please try again.");
        },
      });
    }
  }

  const fieldVariants = {
    hidden: { opacity: 0, y: 8, height: 0 },
    visible: { opacity: 1, y: 0, height: "auto" },
    exit: { opacity: 0, y: -4, height: 0 },
  };

  const transition: Transition = { duration: 0.18 };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
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
                <DialogTitle className="text-base font-semibold text-foreground">
                  {isEditMode ? "Edit Post" : "Post to Community"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground/90">
                    Category
                  </Label>
                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={handleCategoryChange}
                      >
                        <SelectTrigger className="h-9 bg-muted border-border text-sm">
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
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground/90">
                    Title
                  </Label>
                  <Input
                    placeholder={getTitlePlaceholder(category)}
                    className="h-9 bg-muted border-border text-sm"
                    {...form.register("title")}
                  />
                </div>

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
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-foreground/90">
                          Date
                        </Label>
                        <Controller
                          control={form.control}
                          name="eventDate"
                          render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-full h-9 justify-start text-sm font-normal bg-muted border-border",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                  {field.value
                                    ? format(field.value, "MMM d, yyyy")
                                    : "Pick a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value ?? undefined}
                                  onSelect={(date) => field.onChange(date ?? null)}
                                  disabled={{ before: new Date() }}
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground/90">
                            Start Time
                          </Label>
                          <Controller
                            control={form.control}
                            name="eventTime"
                            render={({ field }) => (
                              <TimePicker
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                placeholder="Start time"
                              />
                            )}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground/90">
                            End Time
                          </Label>
                          <Controller
                            control={form.control}
                            name="eventEndTime"
                            render={({ field }) => (
                              <TimePicker
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                placeholder="End time"
                              />
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showLocation && (
                    <motion.div
                      key="location"
                      variants={fieldVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={transition}
                      className="relative z-10 space-y-1.5 overflow-visible"
                    >
                      <Label className="text-sm font-medium text-foreground/90">
                        Location
                      </Label>
                      <Controller
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <LocationSearch
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="Search location..."
                            required={showLocation}
                          />
                        )}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

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
                        <Label className="text-sm font-medium text-foreground/90">
                          Price (PHP)
                        </Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="h-9 bg-muted border-border text-sm"
                          {...form.register("price")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-foreground/90">
                          Condition
                        </Label>
                        <Controller
                          control={form.control}
                          name="condition"
                          render={({ field }) => (
                            <Select
                              value={field.value ?? "BRAND_NEW"}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="h-9 bg-muted border-border text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {conditions.map((condition) => (
                                  <SelectItem
                                    key={condition.value}
                                    value={condition.value}
                                  >
                                    {condition.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground/90">
                    Details
                  </Label>
                  <Textarea
                    placeholder={getContentPlaceholder(category)}
                    className="bg-muted border-border text-sm resize-none min-h-24"
                    {...form.register("content")}
                  />
                </div>

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
                      <Label className="text-sm font-medium text-foreground/90">
                        Photo (optional)
                      </Label>
                      <AnimatePresence mode="wait">
                        {imagePreview ? (
                          <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="relative rounded-lg overflow-hidden border border-border"
                          >
                            <img
                              src={imagePreview}
                              alt=""
                              className="w-full h-40 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                form.setValue("image", null);
                                setImagePreview(null);
                              }}
                              className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
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
                            className="flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-lg h-24 cursor-pointer hover:bg-accent transition-colors"
                          >
                            <ImagePlus className="w-5 h-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Click to upload a photo
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              onChange={handleImageChange}
                            />
                          </motion.label>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {mutation.error && (
                  <p className="text-sm text-red-600">
                    {mutation.error.message}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    className="h-9 text-sm text-foreground/80"
                  >
                    Cancel
                  </Button>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="submit"
                      className="h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium min-w-[80px]"
                      disabled={mutation.isPending || !title.trim() || !content.trim()}
                    >
                      {mutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isEditMode ? (
                        "Save changes"
                      ) : (
                        "Post"
                      )}
                    </Button>
                  </motion.div>
                </div>
              </form>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

function getDefaultValues(): CreatePostValues {
  return {
    category: "GENERAL",
    title: "",
    content: "",
    image: null,
    eventDate: null,
    eventTime: "",
    eventEndTime: "",
    location: "",
    price: "",
    condition: "BRAND_NEW",
  };
}

function getTitlePlaceholder(category: CreatePostValues["category"]) {
  if (category === "QUESTION") return "What would you like to ask?";
  if (category === "FOR_SALE") return "What are you selling?";
  if (category === "FREE") return "What are you giving away?";
  if (category === "SAFETY") return "Describe the safety concern";
  if (category === "EVENT") return "Event name";
  return "What's on your mind?";
}

function getContentPlaceholder(category: CreatePostValues["category"]) {
  if (category === "QUESTION") return "Add more context to your question...";
  if (category === "SAFETY") return "Describe what happened and where...";
  return "Share more details with your community...";
}
