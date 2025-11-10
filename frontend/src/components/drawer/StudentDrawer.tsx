import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { X, LogOut, Home, ChevronRight, User, GraduationCap } from 'lucide-react';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Award,
  Bookmark,
  FolderOpen,
  Medal,
  MessageSquare,
  Settings,
  HelpCircle
} from 'lucide-react';

interface StudentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  description?: string;
}

export default function StudentDrawer({ isOpen, onClose }: StudentDrawerProps) {
  const { profile, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Main navigation items
  const navigationItems: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/student/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/student/dashboard',
      description: 'Overview of your learning progress'
    },
    {
      name: 'My Courses',
      href: '/courses',
      icon: BookOpen,
      current: location.pathname.startsWith('/courses'),
      description: 'Browse and manage enrolled courses'
    },
    {
      name: 'Assignments',
      href: '/student/dashboard?tab=assignments',
      icon: FileText,
      current: location.pathname === '/student/dashboard' && location.search.includes('tab=assignments'),
      description: 'View all course assignments'
    },
    {
      name: 'Recent Grades',
      href: '/student/dashboard?tab=grades',
      icon: Award,
      current: location.pathname === '/student/dashboard' && location.search.includes('tab=grades'),
      description: 'Check your latest grades'
    },
    {
      name: 'Achievements',
      href: '/student/achievements',
      icon: Medal,
      current: location.pathname === '/student/achievements',
      description: 'View earned badges and milestones'
    },
    {
      name: 'Bookmarks',
      href: '/student/bookmarks',
      icon: Bookmark,
      current: location.pathname === '/student/bookmarks',
      description: 'Saved content and resources'
    },
    {
      name: 'Course Resources',
      href: '/student/resources',
      icon: FolderOpen,
      current: location.pathname === '/student/resources',
      description: 'Download course materials'
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      current: location.pathname.startsWith('/messages'),
      description: 'Communicate with teachers'
    }
  ];

  // Secondary navigation items
  const secondaryItems: NavigationItem[] = [
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: location.pathname === '/settings',
      description: 'Manage your account preferences'
    },
    {
      name: 'Help & Support',
      href: '/help',
      icon: HelpCircle,
      current: location.pathname === '/help',
      description: 'Get help and support'
    }
  ];

  // Navigation handler
  const handleNavigation = useCallback((href: string) => {
    try {
      navigate(href);
      
      // Close drawer on mobile when navigation item is clicked
      if (window.innerWidth < 1024) {
        onClose();
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [navigate, onClose]);

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, isSigningOut]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Backdrop click handler
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-600 bg-opacity-75 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 flex w-80 max-w-xs flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">EduQuiz</h1>
              <p className="text-xs text-slate-600 font-medium">Student Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                <User className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {profile?.full_name || 'Student'}
              </p>
              <p className="text-xs text-slate-500 capitalize mb-1">
                {profile?.role || 'student'}
              </p>
              {user?.email && (
                <p className="text-xs text-slate-400 truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Main Navigation
            </h3>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    group w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                    ${item.current
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                  title={item.description}
                >
                  <div className="flex items-center">
                    <Icon className={`mr-3 h-5 w-5 ${
                      item.current ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'
                    }`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.current && (
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Navigation */}
          <div className="space-y-1 pt-4 border-t border-slate-200">
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              More
            </h3>
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    group w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                    ${item.current
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                  title={item.description}
                >
                  <Icon className={`mr-3 h-5 w-5 ${
                    item.current ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'
                  }`} />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-1">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center space-x-2 mb-2">
              <Home className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-800">Quick Actions</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleNavigation('/student/dashboard')}
                className="w-full text-left text-xs text-slate-600 hover:text-blue-600 transition-colors"
              >
                → Go to Dashboard
              </button>
              <button
                onClick={() => handleNavigation('/courses')}
                className="w-full text-left text-xs text-slate-600 hover:text-blue-600 transition-colors"
              >
                → Browse Courses
              </button>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="mr-3 h-5 w-5" />
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}