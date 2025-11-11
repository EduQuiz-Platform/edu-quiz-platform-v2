import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase, Assignment, Notification, Grade } from '@/lib/supabase';
import { logApiError } from '@/lib/logger';
import DashboardLayout from '../../components/DashboardLayout';
import { StudentOverview, CourseCard, ProgressBar } from '../../components/student/StudentDashboardComponents';
import { Tabs, PageHeader, LoadingState, ErrorState, EmptyState } from '../../components/ui/LoadingStates';
import { 
  BookOpen, TrendingUp, Clock, CheckCircle, 
  Bell, Calendar, Award, FileText, Bookmark,
  Target, Flame, Medal, BarChart3, Star,
  Plus, Play, RefreshCw, Settings, Download
} from 'lucide-react';

interface AnalyticsData {
  enrolledCourses: number;
  completedLessons: number;
  averageGrade: string;
  currentStreak: number;
  recentActivity: any[];
}

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

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student progress data
  const [studentProgress, setStudentProgress] = useState<StudentProgressData | null>(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState<UpcomingAssignment[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<Array<{ day: string; minutes: number; lessons: number }>>([]);

  // Active tab management
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';

  // Define tabs
  const tabs = [
    { id: 'overview', label: 'Overview', count: undefined },
    { id: 'courses', label: 'My Courses', count: enrolledCourses.length },
    { id: 'assignments', label: 'Assignments', count: assignments.length },
    { id: 'grades', label: 'Grades', count: grades.length },
    { id: 'achievements', label: 'Achievements', count: undefined },
    { id: 'bookmarks', label: 'Bookmarks', count: undefined },
    { id: 'resources', label: 'Resources', count: undefined }
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update URL when tab changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(location.search);
    if (activeTab !== 'overview') {
      newSearchParams.set('tab', activeTab);
    } else {
      newSearchParams.delete('tab');
    }
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  }, [activeTab, navigate, location.pathname]);

  async function loadDashboardData() {
    try {
      setError(null);
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Load all dashboard data
      await Promise.allSettled([
        loadEnrolledCourses(user.id),
        loadAssignments(user.id),
        loadNotifications(user.id),
        loadGrades(user.id),
        loadAnalytics(user.id),
        loadStudentProgress(user.id)
      ]);
    } catch (error: any) {
      setError(`Failed to load dashboard data: ${error.message}`);
      logApiError('StudentDashboard', 'loadDashboardData', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
  };

  async function loadEnrolledCourses(userId: string) {
    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, enrolled_at, progress_percentage')
        .eq('student_id', userId);

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        const { data: courses } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds)
          .eq('is_published', true);

        if (courses && courses.length > 0) {
          const teacherIds = [...new Set(courses.map(c => c.teacher_id))];
          const { data: teachers } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', teacherIds);

          const coursesWithProgress = await Promise.all(
            courses.map(async (course) => {
              const teacherName = teachers?.find(t => t.id === course.teacher_id)?.full_name || 'Unknown';
              const enrollment = enrollments.find(e => e.course_id === course.id);
              
              // Get lesson progress for this course
              const { data: lessons } = await supabase
                .from('lessons')
                .select('id')
                .eq('course_id', course.id);

              const { data: completedLessons } = await supabase
                .from('lesson_progress')
                .select('id')
                .eq('student_id', userId)
                .eq('course_id', course.id)
                .eq('is_completed', true);

              const totalLessons = lessons?.length || 0;
              const completedCount = completedLessons?.length || 0;
              const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

              return {
                ...course,
                teacher: teacherName,
                progress,
                totalLessons,
                completedLessons: completedCount,
                lastAccessed: enrollment?.enrolled_at || course.created_at,
                enrollment: enrollment
              };
            })
          );

          setEnrolledCourses(coursesWithProgress);
        }
      }
    } catch (error) {
      console.error('Error loading enrolled courses:', error);
    }
  }

  async function loadAssignments(userId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', userId);

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        const { data: assignments } = await supabase
          .from('assignments')
          .select(`
            *,
            courses (title),
            submissions (status, submitted_at)
          `)
          .in('course_id', courseIds)
          .order('due_date', { ascending: true });

        if (assignments) {
          // Filter out assignments that are past due and not submitted
          const upcomingAssignments = assignments.filter(assignment => {
            const dueDate = new Date(assignment.due_date);
            const now = new Date();
            const submission = assignment.submissions?.[0];
            
            if (submission && submission.status === 'submitted') {
              return false; // Already submitted
            }
            
            return dueDate > now || !assignment.due_date; // Future or no due date
          });

          setAssignments(assignments);

          // Format for upcoming assignments display
          const formattedUpcoming: UpcomingAssignment[] = upcomingAssignments.slice(0, 5).map(assignment => ({
            id: assignment.id,
            title: assignment.title,
            course: assignment.courses?.title || 'Unknown Course',
            dueDate: assignment.due_date || new Date().toISOString(),
            type: 'assignment' as const,
            status: 'not-started' as const,
            points: assignment.points_possible || 100
          }));

          setUpcomingAssignments(formattedUpcoming);
        }
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  }

  async function loadNotifications(userId: string) {
    try {
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      setNotifications(notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async function loadGrades(userId: string) {
    try {
      const { data: grades } = await supabase
        .from('grades')
        .select(`
          *,
          assignments (title, course_id),
          courses (title)
        `)
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      setGrades(grades || []);
    } catch (error) {
      console.error('Error loading grades:', error);
    }
  }

  async function loadAnalytics(userId: string) {
    try {
      // Mock analytics data for now
      const mockAnalytics = {
        enrolledCourses: enrolledCourses.length,
        completedLessons: enrolledCourses.reduce((sum, course) => sum + course.completedLessons, 0),
        averageGrade: '85%', // Calculate from actual grades
        currentStreak: 7, // Calculate from activity
        recentActivity: []
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  async function loadStudentProgress(userId: string) {
    try {
      // Calculate student progress data
      const totalCourses = enrolledCourses.length;
      const completedCourses = enrolledCourses.filter(c => c.progress === 100).length;
      const inProgressCourses = enrolledCourses.filter(c => c.progress > 0 && c.progress < 100).length;
      const totalLessons = enrolledCourses.reduce((sum, course) => sum + course.totalLessons, 0);
      const completedLessons = enrolledCourses.reduce((sum, course) => sum + course.completedLessons, 0);
      const averageGrade = grades.length > 0 ? 
        Math.round(grades.reduce((sum, grade) => sum + (grade.score || 0), 0) / grades.length) : 0;
      
      // Mock additional data
      const mockProgress: StudentProgressData = {
        totalCourses,
        completedCourses,
        inProgressCourses,
        totalLessons,
        completedLessons,
        averageGrade: `${averageGrade}%`,
        currentStreak: 7,
        totalPoints: 1250,
        level: 3,
        nextLevelProgress: 65
      };

      setStudentProgress(mockProgress);

      // Mock weekly progress
      const mockWeeklyProgress = [
        { day: 'Mon', minutes: 45, lessons: 2 },
        { day: 'Tue', minutes: 60, lessons: 3 },
        { day: 'Wed', minutes: 30, lessons: 1 },
        { day: 'Thu', minutes: 75, lessons: 4 },
        { day: 'Fri', minutes: 50, lessons: 2 },
        { day: 'Sat', minutes: 90, lessons: 5 },
        { day: 'Sun', minutes: 40, lessons: 2 }
      ];

      setWeeklyProgress(mockWeeklyProgress);

      // Mock recent activity
      const mockRecentActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'lesson-completed',
          title: 'Lesson Completed',
          description: 'Completed "Introduction to Algebra"',
          timestamp: new Date().toISOString(),
          points: 10
        },
        {
          id: '2',
          type: 'grade-received',
          title: 'Grade Received',
          description: 'Mathematics Quiz - 95%',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          points: 95
        },
        {
          id: '3',
          type: 'achievement-earned',
          title: 'Achievement Earned',
          description: 'Earned "Quiz Master" badge',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          points: 50
        }
      ];

      setRecentActivity(mockRecentActivity);
    } catch (error) {
      console.error('Error loading student progress:', error);
    }
  }

  const handleStartAssignment = (assignmentId: string) => {
    navigate(`/student/assignments/${assignmentId}`);
  };

  const handleViewCourse = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  const handleContinueLearning = async (courseId: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the first incomplete lesson for this course
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, course_id')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (lessons && lessons.length > 0) {
        // Find the first lesson that's not completed
        const { data: completedLessons } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('student_id', user.id)
          .eq('course_id', courseId)
          .eq('is_completed', true);

        const completedLessonIds = new Set(completedLessons?.map(cl => cl.lesson_id) || []);
        const nextLesson = lessons.find(lesson => !completedLessonIds.has(lesson.id));
        
        if (nextLesson) {
          navigate(`/courses/${courseId}/lessons/${nextLesson.id}`);
        } else {
          // All lessons completed, go to course overview
          navigate(`/courses/${courseId}`);
        }
      } else {
        // No lessons found, go to course overview
        navigate(`/courses/${courseId}`);
      }
    } catch (error) {
      console.error('Error finding next lesson:', error);
      // Fallback to course overview
      navigate(`/courses/${courseId}`);
    }
  };

  // Render tab content
  const renderTabContent = () => {
    if (loading && !studentProgress) {
      return <LoadingState message="Loading your dashboard..." size="lg" />;
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
        if (!studentProgress) {
          return <LoadingState message="Loading progress data..." />;
        }

        return (
          <StudentOverview
            data={{
              progress: studentProgress,
              upcomingAssignments,
              recentActivity,
              weeklyProgress
            }}
            isLoading={loading}
            onStartAssignment={handleStartAssignment}
            onViewCourse={handleViewCourse}
          />
        );

      case 'courses':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
              <Link
                to="/courses"
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Browse Courses</span>
              </Link>
            </div>
            
            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onViewCourse={handleViewCourse}
                    onContinueLearning={handleContinueLearning}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No courses enrolled"
                description="Start learning by enrolling in a course"
                action={
                  <Link
                    to="/courses"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Browse Courses
                  </Link>
                }
              />
            )}
          </div>
        );

      case 'assignments':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
            {assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                        <p className="text-gray-600">{assignment.courses?.title}</p>
                        {assignment.due_date && (
                          <p className="text-sm text-gray-500 mt-1">
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900">
                          {assignment.points_possible || 100} points
                        </span>
                        <button
                          onClick={() => handleStartAssignment(assignment.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          {assignment.submissions?.[0]?.status === 'submitted' ? 'View' : 'Start'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No assignments"
                description="You don't have any assignments yet"
              />
            )}
          </div>
        );

      case 'grades':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Grades</h2>
            {grades.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {grades.map((grade) => (
                      <tr key={grade.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {grade.assignments?.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {grade.courses?.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (grade.score || 0) >= 90 ? 'bg-green-100 text-green-800' :
                            (grade.score || 0) >= 80 ? 'bg-blue-100 text-blue-800' :
                            (grade.score || 0) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade.score || 0}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(grade.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No grades yet"
                description="Complete assignments to see your grades here"
              />
            )}
          </div>
        );

      case 'achievements':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Achievements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'Quiz Master', description: 'Complete 10 quizzes', icon: Target, earned: true },
                { name: 'Course Complete', description: 'Finish your first course', icon: Award, earned: true },
                { name: 'Streak Keeper', description: 'Study for 30 days in a row', icon: Flame, earned: false },
                { name: 'Perfect Score', description: 'Get 100% on an assignment', icon: Star, earned: false }
              ].map((achievement, index) => (
                <div key={index} className={`p-6 rounded-lg border-2 ${
                  achievement.earned ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      achievement.earned ? 'bg-yellow-200' : 'bg-gray-200'
                    }`}>
                      <achievement.icon className={`h-6 w-6 ${
                        achievement.earned ? 'text-yellow-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'bookmarks':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Bookmarks</h2>
            <EmptyState
              title="No bookmarks yet"
              description="Bookmark important lessons and resources to find them easily"
              icon={<Bookmark className="h-12 w-12 text-gray-400" />}
            />
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Study Resources</h2>
            <EmptyState
              title="No resources yet"
              description="Your course materials and study resources will appear here"
              icon={<BookOpen className="h-12 w-12 text-gray-400" />}
            />
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
          title="Student Dashboard"
          description="Track your learning progress and manage your courses"
          breadcrumbs={[
            { label: 'Student' },
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
              <Link
                to="/messages"
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Bell className="h-4 w-4" />
                <span>Messages</span>
              </Link>
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
      </div>
    </DashboardLayout>
  );
}
