import { NotificationsProvider } from "@/providers/notifications-provider"

import { CommunityModals } from "@/components/community/CommunityModals"
import { CommunityAuthGuard } from "@/components/layout/CommunityAuthGuard"
import { MainContent } from "@/components/layout/MainContent"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import RightPanel from "@/components/layout/RightPanel"
import Sidebar from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CommunityAuthGuard>
      <NotificationsProvider>
        <div className="bg-background min-h-screen">
          <Topbar />
          <div className="flex">
            <Sidebar />
            <MainContent>{children}</MainContent>
            <RightPanel />
          </div>
          <MobileBottomNav />
          <CommunityModals />
        </div>
      </NotificationsProvider>
    </CommunityAuthGuard>
  )
}
