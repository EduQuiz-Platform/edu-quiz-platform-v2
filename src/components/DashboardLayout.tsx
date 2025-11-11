import { ReactNode, useEffect, useState, useCallback } from 'react';
import { Menu, X, Bell, Settings, LogOut, User } from 'lucide-react';
import StudentDrawer from './drawer/StudentDrawer';
import TeacherDrawer from './drawer/TeacherDrawer';
import AdminDrawer from './drawer/AdminDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from './ui/LoadingStates';
import { NotificationService } from '@/services/notificationService';
import { Notification } from '@/lib/supabase';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, user, signOut } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Load notifications on mount
  useEffect(() => {
    if (user) {
      loadNotifications();
      // Subscribe to real-time notifications
      const unsubscribe = NotificationService.subscribeToNotifications(
        user.id,
        (newNotification) => {
          setNotifications(prev => [newNotification, ...prev]);
        }
      );
      return unsubscribe;
    }
  }, [user]);

  // Close drawer when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsDrawerOpen(false);
        setShowNotifications(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.notifications-dropdown')) {
        setShowNotifications(false);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setNotificationsLoading(true);
      const userNotifications = await NotificationService.getUserNotifications(user.id, 50);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  const markNotificationAsRead = async (notificationId: string) => {
    // Update UI immediately for better UX
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );

    // Update in database
    const success = await NotificationService.markAsRead(notificationId);
    if (!success) {
      // Revert UI change if database update failed
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: false }
            : notif
        )
      );
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDrawer = () => {
    switch (profile?.role) {
      case 'student':
        return <StudentDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />;
      case 'teacher':
        return <TeacherDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />;
      case 'admin':
        return <AdminDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Header with Drawer Toggle */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand and Mobile Menu */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Toggle navigation drawer"
              >
                {isDrawerOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                {profile?.role === 'student' && 'Student Dashboard'}
                {profile?.role === 'teacher' && 'Teacher Dashboard'}
                {profile?.role === 'admin' && 'Admin Dashboard'}
              </h1>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
                  aria-label="Notifications"
                >
                  {notificationsLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                  ) : (
                    <Bell className="h-5 w-5" />
                  )}
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="notifications-dropdown absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-4 text-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 mx-auto"></div>
                          <p className="text-sm text-slate-500 mt-2">Loading notifications...</p>
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                                {notification.link && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    View details →
                                  </p>
                                )}
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1"></div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <p>No notifications yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  className="flex items-center space-x-2 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  aria-label="User menu"
                >
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-900">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {profile?.role}
                    </p>
                  </div>
                </button>
              </div>

              {/* Settings & Logout */}
              <div className="hidden sm:flex items-center space-x-1">
                <button
                  className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  aria-label="Sign out"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Drawer (Visible on Large Screens) */}
      <div className="hidden lg:block">
        <div className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full overflow-hidden">
            {renderDrawer()}
          </div>
        </div>
        <div className={`transition-all duration-300 ease-in-out ${
          isDrawerOpen ? 'ml-64' : 'ml-0'
        }`}>
          {/* Desktop content with drawer offset */}
          <div className="h-[calc(100vh-4rem)] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay and Drawer */}
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setIsDrawerOpen(false);
            }}
          />
          
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out">
            {renderDrawer()}
          </div>
        </>
      )}

      {/* Mobile Content (without drawer) */}
      <div className="lg:hidden">
        <div className="h-[calc(100vh-4rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
