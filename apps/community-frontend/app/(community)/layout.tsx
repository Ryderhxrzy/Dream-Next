import { Topbar } from "@/components/layout/Topbar"
import Sidebar from "@/components/layout/Sidebar"
import RightPanel from "@/components/layout/RightPanel"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import { MainContent } from "@/components/layout/MainContent"
import { CommunityModals } from "@/components/community/CommunityModals"
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
        <div className="min-h-screen bg-background">
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
