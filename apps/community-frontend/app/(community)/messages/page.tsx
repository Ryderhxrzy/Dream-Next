import { Suspense } from "react"

import { MessagesView } from "@/components/community/messages/MessagesView"

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesView />
    </Suspense>
  )
}
