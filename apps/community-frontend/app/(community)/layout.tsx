import { Topbar } from "@/components/layout/Topbar"
import Sidebar from "@/components/layout/Sidebar"
import RightPanel from "@/components/layout/RightPanel"
import { CommunityAuthGuard } from "@/components/layout/CommunityAuthGuard"
import { NotificationsProvider } from "@/providers/notifications-provider"

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CommunityAuthGuard>
      <NotificationsProvider>
        <div className="min-h-screen bg-gray-50">
          <Topbar />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 min-w-0 px-6 py-4">
              {children}
            </main>
            <RightPanel />
          </div>
        </div>
      </NotificationsProvider>
    </CommunityAuthGuard>
  )
}
