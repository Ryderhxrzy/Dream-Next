"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { X, Plus, Loader2 } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useUpdateProfile, type CommunityProfile } from "@/lib/hooks/use-profile"

interface EditProfileModalProps {
  open: boolean
  onClose: () => void
  profile: CommunityProfile
}

export function EditProfileModal({ open, onClose, profile }: EditProfileModalProps) {
  const update = useUpdateProfile()
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [occupation, setOccupation] = useState("")
  const [role, setRole] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [draft, setDraft] = useState("")

  useEffect(() => {
    if (open) {
      setBio(profile.bio ?? "")
      setLocation(profile.location ?? "")
      setOccupation(profile.occupation ?? "")
      setRole(profile.role ?? "")
      setInterests(profile.interests ?? [])
      setDraft("")
    }
  }, [open, profile])

  function addInterest() {
    const v = draft.trim()
    if (!v) return
    if (interests.length >= 8) {
      toast.error("Up to 8 interests only")
      return
    }
    if (interests.some((i) => i.toLowerCase() === v.toLowerCase())) {
      setDraft("")
      return
    }
    setInterests((arr) => [...arr, v])
    setDraft("")
  }

  function handleSave() {
    update.mutate(
      {
        bio: bio.trim() || null,
        location: location.trim() || null,
        coverUrl: profile.coverUrl, // preserve current cover
        occupation: occupation.trim() || null,
        role: role.trim() || null,
        interests,
      },
      {
        onSuccess: () => {
          onClose()
          toast.success("Profile updated!")
        },
        onError: (e) => toast.error(e.message ?? "Failed to update profile"),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bio */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground/90">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Tell the community about yourself…"
              className="resize-none"
            />
            <p className="text-right text-[11px] text-muted-foreground">{bio.length}/500</p>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground/90">Lives in</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={120}
              placeholder="e.g. Quezon City, Block 4"
            />
          </div>

          {/* Works as + Role */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground/90">Works as</Label>
              <Input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                maxLength={120}
                placeholder="e.g. Landscape Designer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground/90">Role</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={120}
                placeholder="e.g. Watch Coordinator"
              />
            </div>
          </div>

          {/* Interests */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground/90">Interests</Label>
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addInterest()
                  }
                }}
                maxLength={30}
                placeholder="Add an interest…"
              />
              <Button type="button" variant="secondary" onClick={addInterest}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {interests.map((i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {i}
                    <button
                      type="button"
                      onClick={() => setInterests((arr) => arr.filter((x) => x !== i))}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
