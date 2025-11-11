import React from 'react';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Award, 
  Target, 
  Flame, 
  Medal,
  TrendingUp,
  Play,
  FileText,
  Bell,
  BarChart3,
  Star
} from 'lucide-react';
import { Card, StatCard, LoadingState, ErrorState } from '../ui/LoadingStates';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// @ts-ignore - Recharts type issues

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

interface StudentProgressData {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalLessons: number;
  completedLessons: number;
  averageGrade: string;
  currentStreak: number;
  totalPoints: number;
  level: number;
  nextLevelProgress: number;
}

interface UpcomingAssignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  type: 'quiz' | 'assignment' | 'project';
  status: 'not-started' | 'in-progress' | 'submitted';
  points: number;
}

interface RecentActivity {
  id: string;
  type: 'lesson-completed' | 'assignment-submitted' | 'grade-received' | 'achievement-earned';
  title: string;
  description: string;
  timestamp: string;
  points?: number;
}

interface StudentOverviewProps {
  data: {
    progress: StudentProgressData;
    upcomingAssignments: UpcomingAssignment[];
    recentActivity: RecentActivity[];
    weeklyProgress: Array<{ day: string; minutes: number; lessons: number }>;
  };
  isLoading: boolean;
  onStartAssignment: (assignmentId: string) => void;
  onViewCourse: (courseId: string) => void;
}

export const StudentOverview: React.FC<StudentOverviewProps> = ({ 
  data, 
  isLoading, 
  onStartAssignment, 
  onViewCourse 
}) => {
  if (isLoading) {
    return <LoadingState message="Loading your progress..." size="lg" />;
  }

  if (!data) {
    return (
      <ErrorState
        title="Unable to load progress"
        message="We couldn't load your dashboard data. Please try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  const { progress, upcomingAssignments, recentActivity, weeklyProgress } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Enrolled Courses"
          value={progress.totalCourses}
          change={{ value: 12, type: 'increase' }}
          icon={<BookOpen className="h-6 w-6" />}
        />
        <StatCard
          title="Completed Lessons"
          value={progress.completedLessons}
          icon={<CheckCircle className="h-6 w-6" />}
        />
        <StatCard
          title="Average Grade"
          value={progress.averageGrade}
          change={{ value: 5, type: 'increase' }}
          icon={<Award className="h-6 w-6" />}
        />
        <StatCard
          title="Current Streak"
          value={`${progress.currentStreak} days`}
          icon={<Flame className="h-6 w-6" />}
        />
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Learning Progress</h3>
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Course Completion</span>
                <span className="font-medium">
                  {progress.completedCourses}/{progress.totalCourses}
                </span>
              </div>
              <ProgressBar 
                value={progress.totalCourses > 0 ? (progress.completedCourses / progress.totalCourses) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Level Progress</span>
                <span className="font-medium">
                  {progress.nextLevelProgress}% to Level {progress.level + 1}
                </span>
              </div>
              <ProgressBar 
                value={progress.nextLevelProgress} 
                className="h-2"
                color="bg-purple-600"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Activity</h3>
            <BarChart3 className="h-5 w-5 text-green-600" />
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis hide />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="minutes" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {weeklyProgress.reduce((sum, day) => sum + day.minutes, 0)} min
            </p>
            <p className="text-sm text-gray-600">This week</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
            <Medal className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Quiz Master</p>
                <p className="text-sm text-gray-600">Completed 10 quizzes</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Course Complete</p>
                <p className="text-sm text-gray-600">Finished first course</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Assignments & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Assignments</h3>
          <div className="space-y-4">
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      assignment.type === 'quiz' ? 'bg-blue-100' :
                      assignment.type === 'assignment' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      {assignment.type === 'quiz' ? <Target className="h-5 w-5 text-blue-600" /> :
                       assignment.type === 'assignment' ? <FileText className="h-5 w-5 text-green-600" /> :
                       <Award className="h-5 w-5 text-purple-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{assignment.title}</p>
                      <p className="text-sm text-gray-600">{assignment.course}</p>
                      <p className="text-xs text-gray-500">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{assignment.points} pts</span>
                    {assignment.status === 'not-started' && (
                      <button
                        onClick={() => onStartAssignment(assignment.id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        <Play className="h-3 w-3" />
                        <span>Start</span>
                      </button>
                    )}
                    {assignment.status === 'in-progress' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        In Progress
                      </span>
                    )}
                    {assignment.status === 'submitted' && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Submitted
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming assignments</p>
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
                    activity.type === 'lesson-completed' ? 'bg-green-100' :
                    activity.type === 'assignment-submitted' ? 'bg-blue-100' :
                    activity.type === 'grade-received' ? 'bg-yellow-100' : 'bg-purple-100'
                  }`}>
                    {activity.type === 'lesson-completed' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                     activity.type === 'assignment-submitted' ? <FileText className="h-4 w-4 text-blue-600" /> :
                     activity.type === 'grade-received' ? <Award className="h-4 w-4 text-yellow-600" /> :
                     <Medal className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {activity.points && (
                    <span className="text-sm font-medium text-blue-600">
                      +{activity.points} pts
                    </span>
                  )}
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

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    teacher: string;
    thumbnail?: string;
    progress: number;
    totalLessons: number;
    completedLessons: number;
    lastAccessed: string;
  };
  onViewCourse: (courseId: string) => void;
  onContinueLearning: (courseId: string) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  onViewCourse, 
  onContinueLearning 
}) => {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start space-x-4">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{course.title}</h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{course.description}</p>
          <p className="text-sm text-gray-500 mb-3">By {course.teacher}</p>
          
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <ProgressBar value={course.progress} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {course.completedLessons}/{course.totalLessons} lessons completed
            </p>
          </div>
          
          <p className="text-xs text-gray-500 mb-4">
            Last accessed: {new Date(course.lastAccessed).toLocaleDateString()}
          </p>
          
          <div className="flex items-center space-x-2">
            {course.progress > 0 ? (
              <button
                onClick={() => onContinueLearning(course.id)}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Play className="h-3 w-3" />
                <span>Continue</span>
              </button>
            ) : (
              <button
                onClick={() => onViewCourse(course.id)}
                className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
              >
                <BookOpen className="h-3 w-3" />
                <span>Start Course</span>
              </button>
            )}
            <button
              onClick={() => onViewCourse(course.id)}
              className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
            >
              <FileText className="h-3 w-3" />
              <span>View Details</span>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max = 100, 
  className = '',
  color = 'bg-blue-600'
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full ${color} transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
