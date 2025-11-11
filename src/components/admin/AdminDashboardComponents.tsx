import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Shield, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Database,
  BarChart3, 
  Clock, 
  RefreshCw,
  Download,
  Filter,
  Search,
  Eye,
  MoreVertical,
  Plus
} from 'lucide-react';
import { Card, StatCard, Tabs, LoadingState, ErrorState, EmptyState } from '@/components/ui/LoadingStates';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// @ts-ignore - Recharts type issues

interface AdminAnalyticsData {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeUsers: number;
  userGrowth: Array<{ month: string; count: number }>;
  courseStats: Array<{ category: string; count: number }>;
  activityStats: Array<{ date: string; logins: number; submissions: number }>;
}

interface SystemHealthData {
  database: 'checking' | 'healthy' | 'warning' | 'error';
  storage: 'checking' | 'healthy' | 'warning' | 'error';
  edgeFunctions: 'checking' | 'healthy' | 'warning' | 'error';
  apiResponse: 'checking' | 'healthy' | 'warning' | 'error';
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

interface AdminMetricsProps {
  data: AdminAnalyticsData;
  isLoading: boolean;
  error: string | null;
}

export const AdminMetrics: React.FC<AdminMetricsProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return <LoadingState message="Loading admin metrics..." size="lg" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  if (!data) {
    return <EmptyState title="No Data Available" description="Analytics data is not available yet" />;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={data.totalUsers}
          change={{ value: 12, type: 'increase' }}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Active Courses"
          value={data.totalCourses}
          change={{ value: 8, type: 'increase' }}
          icon={<BookOpen className="h-6 w-6" />}
        />
        <StatCard
          title="Total Enrollments"
          value={data.totalEnrollments}
          change={{ value: 15, type: 'increase' }}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatCard
          title="Active Users"
          value={data.activeUsers}
          change={{ value: 5, type: 'increase' }}
          icon={<Activity className="h-6 w-6" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
            <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {/* @ts-ignore */}
            <AreaChart data={data.userGrowth}>
              {/* @ts-ignore */}
              <CartesianGrid strokeDasharray="3 3" />
              {/* @ts-ignore */}
              <XAxis dataKey="month" />
              {/* @ts-ignore */}
              <YAxis />
              {/* @ts-ignore */}
              <Tooltip />
              {/* @ts-ignore */}
              <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
              {/* @ts-ignore */}
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Course Categories */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Courses by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.courseStats}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {data.courseStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Activity Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data.activityStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="logins" stroke="#10B981" strokeWidth={2} name="Logins" />
            <Line type="monotone" dataKey="submissions" stroke="#F59E0B" strokeWidth={2} name="Submissions" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

interface SystemHealthMonitorProps {
  data: SystemHealthData;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({ 
  data, 
  onRefresh, 
  isRefreshing 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertCircle className="h-5 w-5" />;
      case 'error': return <AlertCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data).map(([component, status]) => (
          <div key={component} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
            <div className={`p-2 rounded-full ${getStatusColor(status)}`}>
              {getStatusIcon(status)}
            </div>
            <div>
              <p className="font-medium text-gray-900 capitalize">
                {component.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <p className={`text-sm font-medium capitalize ${getStatusColor(status).split(' ')[0]}`}>
                {status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

interface UserManagementTableProps {
  users: any[];
  isLoading: boolean;
  onUserAction: (action: string, userId: string) => void;
}

export const UserManagementTable: React.FC<UserManagementTableProps> = ({ 
  users, 
  isLoading, 
  onUserAction 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return <LoadingState message="Loading users..." />;
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUserAction('view', user.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onUserAction('edit', user.id)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onUserAction('suspend', user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <EmptyState
          title="No users found"
          description="Try adjusting your search or filter criteria"
        />
      )}
    </Card>
  );
};
