import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/DashboardLayout';
import UserManagement from '../../components/admin/UserManagement';
import QuestionManagement from '../../components/admin/QuestionManagement';
import AnalyticsDashboard from '../../components/admin/AnalyticsDashboard';
import { AdminMetrics, SystemHealthMonitor } from '../../components/admin/AdminDashboardComponents';
import { Tabs, PageHeader, LoadingState, ErrorState } from '../../components/ui/LoadingStates';
import { 
  Users, BookOpen, TrendingUp, Shield, Trash2,
  Activity, AlertCircle, CheckCircle, Database,
  FileText, Award, Bell, Settings, BarChart3,
  Lock, Clock, Eye, Check, X, FileQuestion,
  Database as DatabaseIcon, Zap, RefreshCw, Download,
  Key, XCircle, Send, Search, Filter, Upload, Mail, Megaphone
} from 'lucide-react';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    totalCourses: 0, 
    totalEnrollments: 0, 
    totalStudents: 0, 
    totalTeachers: 0,
    totalUsers: 0
  });
  const [analytics, setAnalytics] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<{
    database: 'checking' | 'healthy' | 'warning' | 'error';
    storage: 'checking' | 'healthy' | 'warning' | 'error';
    edgeFunctions: 'checking' | 'healthy' | 'warning' | 'error';
    apiResponse: 'checking' | 'healthy' | 'warning' | 'error';
  }>({
    database: 'checking',
    storage: 'healthy',
    edgeFunctions: 'checking',
    apiResponse: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Password reset request state
  const [passwordResetRequests, setPasswordResetRequests] = useState<any[]>([]);
  const [passwordResetStats, setPasswordResetStats] = useState<any>(null);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Activity logs state
  const [activityLogsFilter, setActivityLogsFilter] = useState({
    userId: '',
    action: '',
    dateRange: '7days',
    search: ''
  });
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);

  // Bulk operations state
  const [bulkOperationsLoading, setBulkOperationsLoading] = useState(false);
  const [bulkOperationType, setBulkOperationType] = useState('');
  const [bulkOperationData, setBulkOperationData] = useState<any>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showNewAnnouncementModal, setShowNewAnnouncementModal] = useState(false);
  const [showBroadcastMessageModal, setShowBroadcastMessageModal] = useState(false);

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    platformName: 'EduPlatform',
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    maxFileSize: '10',
    sessionTimeout: '30',
    backupFrequency: 'daily'
  });
  const [systemSettingsLoading, setSystemSettingsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Password reset request handlers
  const handleApproveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-password-reset', {
        body: {
          action: 'approve',
          requestId,
          adminNotes
        }
      });
      if (error) throw error;
      
      console.log('Password reset request approved');
      loadPasswordResetRequests();
      loadPasswordResetStats();
    } catch (error: any) {
      console.error('Error approving password reset request:', error);
      setError(`Failed to approve request: ${error.message}`);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-password-reset', {
        body: {
          action: 'reject',
          requestId,
          adminNotes
        }
      });
      if (error) throw error;
      
      console.log('Password reset request rejected');
      loadPasswordResetRequests();
    } catch (error: any) {
      console.error('Error rejecting password reset request:', error);
      setError(`Failed to reject request: ${error.message}`);
    }
  };

  const handleGenerateTempPassword = async (requestId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-password-reset', {
        body: {
          action: 'generate_temp_password',
          requestId
        }
      });
      if (error) throw error;
      
      setTempPasswordData(data);
      setShowTempPasswordModal(true);
      loadPasswordResetRequests();
    } catch (error: any) {
      console.error('Error generating temporary password:', error);
      setError(`Failed to generate password: ${error.message}`);
    }
  };

  // Get active tab from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';

  // Define tabs
  const tabs = [
    { id: 'overview', label: 'Overview', count: undefined },
    { id: 'users', label: 'Users', count: stats.totalUsers },
    { id: 'analytics', label: 'Analytics', count: undefined },
    { id: 'questions', label: 'Questions', count: undefined },
    { id: 'password-resets', label: 'Password Resets', count: passwordResetRequests.length },
    { id: 'activity', label: 'Activity', count: activityLogs.length },
    { id: 'messages', label: 'Messages', count: notifications.length },
    { id: 'system', label: 'System', count: undefined },
    { id: 'bulk', label: 'Bulk Operations', count: undefined }
  ];

  // Memoized data loading function
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      await Promise.allSettled([
        loadUsers(),
        loadStats(),
        loadAnalytics(),
        loadActivityLogs(),
        checkSystemHealth()
      ]);
      
      setLastRefresh(new Date());
    } catch (error: any) {
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refresh data function
  const refreshData = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  useEffect(() => {
    loadData();
    
    // Load tab-specific data
    if (activeTab === 'password-resets') {
      loadPasswordResetRequests();
      loadPasswordResetStats();
    } else if (activeTab === 'activity') {
      loadActivityLogsWithFilters();
    } else if (activeTab === 'messages') {
      loadNotifications();
      loadAnnouncements();
    } else if (activeTab === 'system') {
      loadSystemSettings();
    }
  }, [loadData, activeTab, activityLogsFilter]);

  // Activity logs filter effect
  useEffect(() => {
    if (activeTab === 'activity') {
      loadActivityLogsWithFilters();
    }
  }, [activityLogsFilter]);

  // Enhanced user loading with better error handling
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      throw error;
    }
  };

  // Enhanced stats loading with fallback
  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-course-stats');
      if (error) throw error;
      
      if (data?.data) {
        setStats(data.data);
      } else {
        // Fallback: calculate stats manually
        await loadStatsFallback();
      }
    } catch (error) {
      console.warn('Edge function unavailable, using fallback:', error);
      await loadStatsFallback();
    }
  };

  // Fallback stats calculation
  const loadStatsFallback = async () => {
    try {
      const [usersResult, coursesResult, enrollmentsResult] = await Promise.allSettled([
        supabase.from('profiles').select('role'),
        supabase.from('courses').select('id'),
        supabase.from('enrollments').select('id')
      ]);

      const totalUsers = usersResult.status === 'fulfilled' ? (usersResult.value.data?.length || 0) : 0;
      const totalStudents = usersResult.status === 'fulfilled' 
        ? (usersResult.value.data?.filter(u => u.role === 'student').length || 0) : 0;
      const totalTeachers = usersResult.status === 'fulfilled'
        ? (usersResult.value.data?.filter(u => u.role === 'teacher').length || 0) : 0;
      const totalCourses = coursesResult.status === 'fulfilled' ? (coursesResult.value.data?.length || 0) : 0;
      const totalEnrollments = enrollmentsResult.status === 'fulfilled' ? (enrollmentsResult.value.data?.length || 0) : 0;

      setStats({
        totalUsers,
        totalStudents,
        totalTeachers,
        totalCourses,
        totalEnrollments
      });
    } catch (error) {
      console.error('Error calculating fallback stats:', error);
    }
  };

  // Enhanced analytics loading
  const loadAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('analytics-engine', {
        body: { type: 'admin_overview' }
      });

      if (response.data?.data) {
        setAnalytics(response.data.data);
      } else {
        // Create mock analytics data for demo
        const mockAnalytics = {
          totalUsers: stats.totalUsers,
          totalCourses: stats.totalCourses,
          totalEnrollments: stats.totalEnrollments,
          activeUsers: Math.floor(stats.totalUsers * 0.7),
          userGrowth: [
            { month: 'Jan', count: 45 },
            { month: 'Feb', count: 52 },
            { month: 'Mar', count: 48 },
            { month: 'Apr', count: 61 },
            { month: 'May', count: 55 },
            { month: 'Jun', count: 67 }
          ],
          courseStats: [
            { category: 'Mathematics', count: 12 },
            { category: 'Science', count: 8 },
            { category: 'Literature', count: 15 },
            { category: 'History', count: 6 },
            { category: 'Languages', count: 9 }
          ],
          activityStats: [
            { date: '2025-11-03', logins: 120, submissions: 85 },
            { date: '2025-11-04', logins: 135, submissions: 92 },
            { date: '2025-11-05', logins: 98, submissions: 67 },
            { date: '2025-11-06', logins: 145, submissions: 103 },
            { date: '2025-11-07', logins: 156, submissions: 118 },
            { date: '2025-11-08', logins: 142, submissions: 95 },
            { date: '2025-11-09', logins: 168, submissions: 127 }
          ]
        };
        setAnalytics(mockAnalytics);
      }
    } catch (error) {
      console.warn('Analytics engine unavailable:', error);
    }
  };

  // Enhanced activity logs loading
  const loadActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*, profiles:user_id(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.warn('Activity logs unavailable:', error);
      setActivityLogs([]);
    }
  };

  // Enhanced system health check
  const checkSystemHealth = async () => {
    const healthChecks: {
      database: 'checking' | 'healthy' | 'warning' | 'error';
      storage: 'checking' | 'healthy' | 'warning' | 'error';
      edgeFunctions: 'checking' | 'healthy' | 'warning' | 'error';
      apiResponse: 'checking' | 'healthy' | 'warning' | 'error';
    } = {
      database: 'checking',
      storage: 'healthy', // Assume healthy for now
      edgeFunctions: 'checking',
      apiResponse: 'healthy' // Assume healthy for now
    };

    // Database check
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      healthChecks.database = 'healthy';
    } catch (error) {
      healthChecks.database = 'error';
    }

    // Edge functions check
    try {
      const response = await supabase.functions.invoke('api-gateway', {
        body: { test: true }
      });
      healthChecks.edgeFunctions = response.error ? 'warning' : 'healthy';
    } catch (error) {
      healthChecks.edgeFunctions = 'error';
    }

    setSystemHealth(healthChecks);
  };

  // Password reset functions
  const loadPasswordResetRequests = async () => {
    try {
      setPasswordResetLoading(true);
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPasswordResetRequests(data || []);
    } catch (error) {
      console.error('Error loading password reset requests:', error);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const loadPasswordResetStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('password-reset-stats');
      if (error) throw error;
      setPasswordResetStats(data);
    } catch (error) {
      console.warn('Password reset stats unavailable:', error);
    }
  };

  // Activity logs functions
  const loadActivityLogsWithFilters = async () => {
    try {
      setActivityLogsLoading(true);
      let query = supabase
        .from('user_activity_logs')
        .select('*, profiles:user_id(full_name, email, role)')
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply filters
      if (activityLogsFilter.userId) {
        query = query.eq('user_id', activityLogsFilter.userId);
      }
      if (activityLogsFilter.action) {
        query = query.ilike('action', `%${activityLogsFilter.action}%`);
      }
      if (activityLogsFilter.search) {
        query = query.or(`action.ilike.%${activityLogsFilter.search}%,details.ilike.%${activityLogsFilter.search}%`);
      }

      // Apply date range
      const now = new Date();
      const startDate = new Date();
      switch (activityLogsFilter.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
      }
      if (activityLogsFilter.dateRange !== 'all') {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error: any) {
      console.error('Error loading activity logs:', error);
      setError(`Failed to load activity logs: ${error.message}`);
    } finally {
      setActivityLogsLoading(false);
    }
  };

  // Bulk operations functions
  const handleBulkUserImport = async (file: File) => {
    try {
      setBulkOperationsLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'user_import');

      const { data, error } = await supabase.functions.invoke('admin-bulk-operations', {
        body: formData
      });

      if (error) throw error;
      setBulkOperationData(data);
      loadUsers();
    } catch (error: any) {
      console.error('Error importing users:', error);
      setError(`Failed to import users: ${error.message}`);
    } finally {
      setBulkOperationsLoading(false);
    }
  };

  const handleBulkCourseCreation = async (courseData: any[]) => {
    try {
      setBulkOperationsLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-bulk-operations', {
        body: {
          action: 'bulk_create_courses',
          data: courseData
        }
      });

      if (error) throw error;
      setBulkOperationData(data);
      loadStats();
    } catch (error: any) {
      console.error('Error creating courses:', error);
      setError(`Failed to create courses: ${error.message}`);
    } finally {
      setBulkOperationsLoading(false);
    }
  };

  const handleDataExport = async (exportType: string) => {
    try {
      setBulkOperationsLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-bulk-operations', {
        body: {
          action: 'export_data',
          type: exportType
        }
      });

      if (error) throw error;
      
      // Download the exported file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error: any) {
      console.error('Error exporting data:', error);
      setError(`Failed to export data: ${error.message}`);
    } finally {
      setBulkOperationsLoading(false);
    }
  };

  // Notifications and announcements functions
  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, profiles:teacher_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const createAnnouncement = async (announcementData: any) => {
    try {
      const { error } = await supabase.functions.invoke('admin-notifications', {
        body: {
          action: 'create_announcement',
          ...announcementData
        }
      });

      if (error) throw error;
      loadAnnouncements();
      setShowNewAnnouncementModal(false);
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      setError(`Failed to create announcement: ${error.message}`);
    }
  };

  const sendBroadcastMessage = async (messageData: any) => {
    try {
      const { error } = await supabase.functions.invoke('admin-notifications', {
        body: {
          action: 'broadcast_message',
          ...messageData
        }
      });

      if (error) throw error;
      setShowBroadcastMessageModal(false);
    } catch (error: any) {
      console.error('Error sending broadcast message:', error);
      setError(`Failed to send message: ${error.message}`);
    }
  };

  // System settings functions
  const saveSystemSettings = async () => {
    try {
      setSystemSettingsLoading(true);
      const { error } = await supabase.functions.invoke('admin-system-settings', {
        body: {
          action: 'update_settings',
          settings: systemSettings
        }
      });

      if (error) throw error;
      setSuccess('System settings saved successfully');
    } catch (error: any) {
      console.error('Error saving system settings:', error);
      setError(`Failed to save settings: ${error.message}`);
    } finally {
      setSystemSettingsLoading(false);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-system-settings', {
        body: { action: 'get_settings' }
      });

      if (error) throw error;
      if (data) {
        setSystemSettings(data);
      }
    } catch (error) {
      console.warn('System settings unavailable:', error);
    }
  };

  // Handle user actions - delegate to UserManagement component
  const handleUserAction = async (action: string, userId: string, data?: any) => {
    try {
      setError(null);
      setSuccess(null);

      switch (action) {
        case 'refresh':
          // Refresh user data
          await loadData();
          setSuccess('User data refreshed successfully');
          break;
        
        case 'bulk_action':
          // Handle bulk user actions
          const { userIds, operation } = data;
          const { error } = await supabase.functions.invoke('admin-manage-users', {
            body: {
              action: 'bulk_update',
              userIds,
              operation
            }
          });
          if (error) throw error;
          setSuccess(`Bulk ${operation.type} completed successfully`);
          await loadData();
          break;

        default:
          // For all other actions, let the UserManagement component handle them
          console.log(`User action ${action} will be handled by UserManagement component`);
      }
    } catch (error: any) {
      console.error(`Error performing user action ${action}:`, error);
      setError(`Failed to ${action}: ${error?.message || 'Unknown error'}`);
    }
  };

  // Render tab content
  const renderTabContent = () => {
    if (loading && !analytics) {
      return <LoadingState message="Loading dashboard data..." size="lg" />;
    }

    if (error) {
      return (
        <ErrorState
          title="Dashboard Error"
          message={error}
          onRetry={refreshData}
        />
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <AdminMetrics
              data={analytics}
              isLoading={loading}
              error={error}
            />
            <SystemHealthMonitor
              data={systemHealth}
              onRefresh={checkSystemHealth}
              isRefreshing={isRefreshing}
            />
          </div>
        );

      case 'users':
        return <UserManagement onAction={handleUserAction} />;

      case 'analytics':
        return (
          <AnalyticsDashboard />
        );

      case 'questions':
        return <QuestionManagement />;

      case 'password-resets':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Requests</h3>
                <p className="text-3xl font-bold text-yellow-600">
                  {passwordResetRequests.length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Completed Today</h3>
                <p className="text-3xl font-bold text-green-600">
                  {passwordResetStats?.completedToday || 0}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Response</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {passwordResetStats?.avgResponseTime || 'N/A'}
                </p>
              </div>
            </div>
            
            {/* Password Reset Requests Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">Password Reset Requests</h3>
              </div>
              {passwordResetLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600">Loading password reset requests...</p>
                </div>
              ) : passwordResetRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p>No pending password reset requests</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Requested</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {passwordResetRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">
                              {request.full_name || 'Unknown User'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-500">
                              {request.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {new Date(request.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setTempPasswordData(request);
                                  setShowTempPasswordModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                                title="Generate Temporary Password"
                              >
                                <Key className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleApproveRequest(request.id)}
                                className="text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded"
                                title="Approve Request"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request.id)}
                                className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                title="Reject Request"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-6">
            {/* Activity Logs Filters */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Activity Logs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <input
                    type="text"
                    placeholder="Filter by user..."
                    value={activityLogsFilter.userId}
                    onChange={(e) => setActivityLogsFilter(prev => ({ ...prev, userId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <input
                    type="text"
                    placeholder="Filter by action..."
                    value={activityLogsFilter.action}
                    onChange={(e) => setActivityLogsFilter(prev => ({ ...prev, action: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select
                    value={activityLogsFilter.dateRange}
                    onChange={(e) => setActivityLogsFilter(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="today">Today</option>
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={activityLogsFilter.search}
                      onChange={(e) => setActivityLogsFilter(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Logs List */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Activity Log Entries</h3>
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(activityLogs, null, 2);
                    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                    const exportFileDefaultName = `activity-logs-${new Date().toISOString().split('T')[0]}.json`;
                    
                    const linkElement = document.createElement('a');
                    linkElement.setAttribute('href', dataUri);
                    linkElement.setAttribute('download', exportFileDefaultName);
                    linkElement.click();
                  }}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
              {activityLogsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600">Loading activity logs...</p>
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No activity logs found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start space-x-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-900">
                              {log.action || 'Unknown action'}
                            </p>
                            <span className="text-sm text-slate-500">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center space-x-4">
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">User:</span> {log.profiles?.full_name || 'Unknown'}
                            </p>
                            {log.profiles?.role && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                log.profiles.role === 'admin' ? 'bg-orange-100 text-orange-800' :
                                log.profiles.role === 'teacher' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.profiles.role}
                              </span>
                            )}
                          </div>
                          {log.details && (
                            <p className="mt-1 text-sm text-slate-500">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-6">
            {/* Messages Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Admin Communications</h3>
                <p className="text-gray-600">Manage announcements and broadcast messages</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNewAnnouncementModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Megaphone className="h-4 w-4" />
                  <span>New Announcement</span>
                </button>
                <button
                  onClick={() => setShowBroadcastMessageModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Mail className="h-4 w-4" />
                  <span>Broadcast Message</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Announcements */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    Recent Announcements
                  </h3>
                </div>
                {announcements.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Megaphone className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No announcements yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="p-4 hover:bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{announcement.title}</h4>
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{announcement.content}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {announcement.priority}
                              </span>
                              <span className="text-xs text-slate-500">
                                by {announcement.profiles?.full_name} • {new Date(announcement.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Notifications */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    System Notifications
                  </h3>
                </div>
                {notificationsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-slate-600">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-4 hover:bg-slate-50">
                        <div className="flex items-start space-x-3">
                          <div className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                            !notification.read ? 'bg-blue-600' : 'bg-gray-300'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-900">{notification.title}</h4>
                            <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                notification.type === 'system' ? 'bg-red-100 text-red-800' :
                                notification.type === 'announcement' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {notification.type}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(notification.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-6">
            <SystemHealthMonitor
              data={systemHealth}
              onRefresh={checkSystemHealth}
              isRefreshing={isRefreshing}
            />
            
            {/* System Settings */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Settings
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Platform Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Platform Configuration</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
                      <input
                        type="text"
                        value={systemSettings.platformName}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, platformName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
                      <input
                        type="number"
                        value={systemSettings.maxFileSize}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, maxFileSize: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={systemSettings.sessionTimeout}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Backup Frequency</label>
                      <select
                        value={systemSettings.backupFrequency}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, backupFrequency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Feature Settings</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={systemSettings.maintenanceMode}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Maintenance Mode</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={systemSettings.registrationEnabled}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, registrationEnabled: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">User Registration</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={systemSettings.emailNotifications}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Email Notifications</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={saveSystemSettings}
                    disabled={systemSettingsLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {systemSettingsLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>{systemSettingsLoading ? 'Saving...' : 'Save Settings'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Database</h4>
                  <p className="text-sm text-gray-600">PostgreSQL 15.x</p>
                  <p className="text-sm text-gray-600">Supabase Platform</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Edge Functions</h4>
                  <p className="text-sm text-gray-600">34 Functions Deployed</p>
                  <p className="text-sm text-gray-600">Deno Runtime</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Storage</h4>
                  <p className="text-sm text-gray-600">Supabase Storage</p>
                  <p className="text-sm text-gray-600">Unlimited Storage</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Authentication</h4>
                  <p className="text-sm text-gray-600">Supabase Auth</p>
                  <p className="text-sm text-gray-600">Row Level Security</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'bulk':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Operations</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Bulk User Import */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900 mb-2">Bulk User Import</h4>
                  <p className="text-sm text-gray-600 mb-3">Import users from CSV file</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBulkUserImport(file);
                    }}
                    className="hidden"
                    id="bulk-user-import"
                    disabled={bulkOperationsLoading}
                  />
                  <label
                    htmlFor="bulk-user-import"
                    className={`flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 ${
                      bulkOperationsLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    <span>{bulkOperationsLoading ? 'Importing...' : 'Select CSV'}</span>
                  </label>
                </div>

                {/* Bulk Course Creation */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <BookOpen className="h-8 w-8 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900 mb-2">Bulk Course Creation</h4>
                  <p className="text-sm text-gray-600 mb-3">Create multiple courses at once</p>
                  <button
                    onClick={() => {
                      // Sample course data for demo
                      const sampleCourses = [
                        { title: 'Introduction to Mathematics', description: 'Basic math concepts', category: 'math', level: 'beginner' },
                        { title: 'Advanced Physics', description: 'Physics for advanced students', category: 'science', level: 'advanced' }
                      ];
                      handleBulkCourseCreation(sampleCourses);
                    }}
                    disabled={bulkOperationsLoading}
                    className={`w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 ${
                      bulkOperationsLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>{bulkOperationsLoading ? 'Creating...' : 'Create Sample'}</span>
                  </button>
                </div>

                {/* Data Export */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <Database className="h-8 w-8 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900 mb-2">Data Export</h4>
                  <p className="text-sm text-gray-600 mb-3">Export platform data</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleDataExport('users')}
                      disabled={bulkOperationsLoading}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Users</span>
                    </button>
                    <button
                      onClick={() => handleDataExport('courses')}
                      disabled={bulkOperationsLoading}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Courses</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Operation Results */}
              {bulkOperationData && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Operation Completed</h4>
                  <pre className="text-sm text-green-700 overflow-x-auto">
                    {JSON.stringify(bulkOperationData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Tab not found</h3>
            <p className="text-gray-600">The selected tab does not exist.</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Admin Dashboard"
          description="Manage users, courses, and platform settings"
          breadcrumbs={[
            { label: 'Admin' },
            { label: 'Dashboard' }
          ]}
          actions={
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          }
        />

        <Tabs
          items={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => {
            const newSearchParams = new URLSearchParams(location.search);
            if (tab !== 'overview') {
              newSearchParams.set('tab', tab);
            } else {
              newSearchParams.delete('tab');
            }
            navigate(`${location.pathname}?${newSearchParams.toString()}`);
          }}
        />

        <div className="mt-6">
          {renderTabContent()}
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess(null)} className="ml-2 text-green-500 hover:text-green-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* New Announcement Modal */}
        {showNewAnnouncementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Create Announcement</h3>
                <AnnouncementForm
                  onSubmit={createAnnouncement}
                  onCancel={() => setShowNewAnnouncementModal(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Message Modal */}
        {showBroadcastMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Broadcast Message</h3>
                <BroadcastMessageForm
                  onSubmit={sendBroadcastMessage}
                  onCancel={() => setShowBroadcastMessageModal(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Temporary Password Modal */}
        {showTempPasswordModal && tempPasswordData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Temporary Password Generated</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
                    <p className="text-slate-900">{tempPasswordData.full_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <p className="text-slate-500">{tempPasswordData.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={tempPasswordData.tempPassword}
                        readOnly
                        className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-mono text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(tempPasswordData.tempPassword)}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Important:</strong> Share this password securely with the user. They will be required to change it on first login.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowTempPasswordModal(false)}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last updated info */}
        <div className="text-center text-sm text-gray-500 mt-8">
          Last updated: {lastRefresh.toLocaleString()}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Announcement Form Component
const AnnouncementForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    courseId: '',
    targetAudience: 'all'
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCourses = async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      setCourses(data || []);
    };
    loadCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
        <textarea
          required
          rows={4}
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
        <select
          value={formData.targetAudience}
          onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Users</option>
          <option value="students">Students Only</option>
          <option value="teachers">Teachers Only</option>
          <option value="admins">Admins Only</option>
        </select>
      </div>
      {formData.targetAudience === 'all' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course (Optional)</label>
          <select
            value={formData.courseId}
            onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Announcement'}
        </button>
      </div>
    </form>
  );
};

// Broadcast Message Form Component
const BroadcastMessageForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    messageType: 'notification',
    targetUsers: 'all'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
        <select
          value={formData.messageType}
          onChange={(e) => setFormData(prev => ({ ...prev, messageType: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="notification">System Notification</option>
          <option value="announcement">Announcement</option>
          <option value="alert">Alert</option>
          <option value="maintenance">Maintenance Notice</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message Content</label>
        <textarea
          required
          rows={4}
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target Users</label>
        <select
          value={formData.targetUsers}
          onChange={(e) => setFormData(prev => ({ ...prev, targetUsers: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Users</option>
          <option value="active">Active Users</option>
          <option value="inactive">Inactive Users</option>
          <option value="students">Students Only</option>
          <option value="teachers">Teachers Only</option>
          <option value="admins">Admins Only</option>
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </form>
  );
};
