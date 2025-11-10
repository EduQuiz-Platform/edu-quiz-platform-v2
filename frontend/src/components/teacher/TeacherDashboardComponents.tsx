import React from 'react';
import { 
  BookOpen, 
  Users, 
  FileText, 
  Award, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  BarChart3,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Settings,
  Megaphone
} from 'lucide-react';
import { Card, StatCard, ProgressBar, LoadingState, ErrorState, Tabs } from '../ui/LoadingStates';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

interface TeacherAnalyticsData {
  totalCourses: number;
  totalStudents: number;
  totalAssignments: number;
  pendingGrades: number;
  averageRating: number;
  studentEngagement: Array<{ date: string; active: number; submissions: number }>;
  coursePerformance: Array<{ course: string; students: number; avgScore: number }>;
  assignmentCompletion: Array<{ name: string; submitted: number; pending: number }>;
}

interface PendingSubmission {
  id: string;
  studentName: string;
  assignmentTitle: string;
  courseName: string;
  submittedAt: string;
  assignmentType: 'essay' | 'quiz' | 'project';
  points: number;
}

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    studentCount: number;
    lessonCount: number;
    assignmentCount: number;
    averageScore: number;
    isPublished: boolean;
    createdAt: string;
  };
  onEditCourse: (courseId: string) => void;
  onManageLessons: (courseId: string) => void;
  onViewAnalytics: (courseId: string) => void;
  onTogglePublish: (courseId: string, isPublished: boolean) => void;
}

interface TeacherOverviewProps {
  data: {
    analytics: TeacherAnalyticsData;
    pendingSubmissions: PendingSubmission[];
    recentActivity: Array<{
      id: string;
      type: 'student-joined' | 'assignment-submitted' | 'course-published' | 'grade-posted';
      title: string;
      description: string;
      timestamp: string;
    }>;
  };
  isLoading: boolean;
  onViewSubmission: (submissionId: string) => void;
  onGradeSubmission: (submissionId: string) => void;
}

export const TeacherOverview: React.FC<TeacherOverviewProps> = ({ 
  data, 
  isLoading, 
  onViewSubmission, 
  onGradeSubmission 
}) => {
  if (isLoading) {
    return <LoadingState message="Loading teacher dashboard..." size="lg" />;
  }

  if (!data) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message="We couldn't load your dashboard data. Please try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  const { analytics, pendingSubmissions, recentActivity } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Courses"
          value={analytics.totalCourses}
          change={{ value: 8, type: 'increase' }}
          icon={<BookOpen className="h-6 w-6" />}
        />
        <StatCard
          title="Total Students"
          value={analytics.totalStudents}
          change={{ value: 15, type: 'increase' }}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Pending Grades"
          value={analytics.pendingGrades}
          icon={<AlertCircle className="h-6 w-6" />}
        />
        <StatCard
          title="Avg Rating"
          value={`${analytics.averageRating}/5`}
          change={{ value: 2, type: 'increase' }}
          icon={<Award className="h-6 w-6" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Engagement */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Student Engagement</h3>
            <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.studentEngagement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="active" stroke="#3B82F6" strokeWidth={2} name="Active Students" />
              <Line type="monotone" dataKey="submissions" stroke="#10B981" strokeWidth={2} name="Submissions" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Course Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.coursePerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="course" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="students" fill="#3B82F6" name="Students" />
              <Bar dataKey="avgScore" fill="#10B981" name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Pending Submissions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Grading</h3>
          <div className="space-y-4">
            {pendingSubmissions.length > 0 ? (
              pendingSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      submission.assignmentType === 'essay' ? 'bg-blue-100' :
                      submission.assignmentType === 'quiz' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      {submission.assignmentType === 'essay' ? <FileText className="h-5 w-5 text-blue-600" /> :
                       submission.assignmentType === 'quiz' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                       <Award className="h-5 w-5 text-purple-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{submission.assignmentTitle}</p>
                      <p className="text-sm text-gray-600">{submission.studentName} • {submission.courseName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{submission.points} pts</span>
                    <button
                      onClick={() => onViewSubmission(submission.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No pending submissions</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    activity.type === 'student-joined' ? 'bg-green-100' :
                    activity.type === 'assignment-submitted' ? 'bg-blue-100' :
                    activity.type === 'course-published' ? 'bg-purple-100' : 'bg-yellow-100'
                  }`}>
                    {activity.type === 'student-joined' ? <Users className="h-4 w-4 text-green-600" /> :
                     activity.type === 'assignment-submitted' ? <FileText className="h-4 w-4 text-blue-600" /> :
                     activity.type === 'course-published' ? <BookOpen className="h-4 w-4 text-purple-600" /> :
                     <Award className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  onEditCourse, 
  onManageLessons, 
  onViewAnalytics,
  onTogglePublish 
}) => {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              course.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {course.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{course.studentCount}</p>
              <p className="text-xs text-gray-600">Students</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{course.lessonCount}</p>
              <p className="text-xs text-gray-600">Lessons</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{course.averageScore}%</p>
              <p className="text-xs text-gray-600">Avg Score</p>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Course Progress</span>
              <span className="font-medium">75%</span>
            </div>
            <ProgressBar value={75} className="h-2" />
          </div>
          
          <p className="text-xs text-gray-500">
            Created: {new Date(course.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEditCourse(course.id)}
            className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Edit className="h-3 w-3" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onManageLessons(course.id)}
            className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <BookOpen className="h-3 w-3" />
            <span>Lessons</span>
          </button>
          <button
            onClick={() => onViewAnalytics(course.id)}
            className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <BarChart3 className="h-3 w-3" />
            <span>Analytics</span>
          </button>
        </div>
        
        <button
          onClick={() => onTogglePublish(course.id, course.isPublished)}
          className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-md ${
            course.isPublished 
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {course.isPublished ? <EyeOff className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
          <span>{course.isPublished ? 'Unpublish' : 'Publish'}</span>
        </button>
      </div>
    </Card>
  );
};

interface AssignmentCardProps {
  assignment: {
    id: string;
    title: string;
    courseName: string;
    dueDate: string;
    submissionCount: number;
    pendingCount: number;
    averageScore: number;
    type: 'quiz' | 'assignment' | 'project';
  };
  onViewSubmissions: (assignmentId: string) => void;
  onEditAssignment: (assignmentId: string) => void;
  onGradeAssignment: (assignmentId: string) => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({ 
  assignment, 
  onViewSubmissions, 
  onEditAssignment, 
  onGradeAssignment 
}) => {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              assignment.type === 'quiz' ? 'bg-blue-100 text-blue-800' :
              assignment.type === 'assignment' ? 'bg-green-100 text-green-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {assignment.type}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">{assignment.courseName}</p>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{assignment.submissionCount}</p>
              <p className="text-xs text-gray-600">Submitted</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-600">{assignment.pendingCount}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{assignment.averageScore}%</p>
              <p className="text-xs text-gray-600">Avg Score</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600">
            Due: {new Date(assignment.dueDate).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewSubmissions(assignment.id)}
            className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Eye className="h-3 w-3" />
            <span>View</span>
          </button>
          <button
            onClick={() => onEditAssignment(assignment.id)}
            className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Edit className="h-3 w-3" />
            <span>Edit</span>
          </button>
        </div>
        
        {assignment.pendingCount > 0 && (
          <button
            onClick={() => onGradeAssignment(assignment.id)}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Award className="h-3 w-3" />
            <span>Grade ({assignment.pendingCount})</span>
          </button>
        )}
      </div>
    </Card>
  );
};
