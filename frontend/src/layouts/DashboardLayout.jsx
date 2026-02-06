import Sidebar from './Sidebar'
import TopBar from './TopBar'

const DashboardLayout = ({ 
  children, 
  role, 
  userName, 
  currentPage, 
  onNavigate, 
  onProfile,
  onNotifications,
  onMessages
}) => {
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Sidebar 
              role={role} 
              currentPage={currentPage} 
              onNavigate={onNavigate} 
            />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <TopBar 
                  userName={userName} 
                  onProfile={onProfile}
                  onNotifications={onNotifications}
                  onMessages={onMessages}
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
