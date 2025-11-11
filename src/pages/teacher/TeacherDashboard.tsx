import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, Assignment } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import QuestionManager from '@/components/QuestionManager';
import { TeacherOverview, CourseCard, AssignmentCard } from '@/components/teacher/TeacherDashboardComponents';
import { Tabs, PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/ui/LoadingStates';
import { 
  BookOpen, Users, PlusCircle, Edit, Trash2, Eye, EyeOff,
  FileText, Award, Bell, ArrowRight, Settings, TrendingUp, FolderOpen, Megaphone,
  PlayCircle, PauseCircle, BookMarked, X, RefreshCw, Download, BarChart3
} from 'lucide-react';

export default function TeacherDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', category: '' });
  const [assignmentFormData, setAssignmentFormData] = useState({
    course_id: '',
    title: '',
    description: '',
    due_date: '',
    points_possible: 100,
    submission_type: 'text'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonFormData, setLessonFormData] = useState({ 
    title: '', 
    content: '', 
    order: 0, 
    has_quiz: false,
    quiz_pass_score: 70,
    quiz_time_limit: 300
  });
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [showQuestionManager, setShowQuestionManager] = useState(false);
  const [questionManagerLesson, setQuestionManagerLesson] = useState<any>(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradingData, setGradingData] = useState({ points: 0, feedback: '' });

  // Get active tab from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';

  // Define tabs
  const tabs = [
    { id: 'overview', label: 'Overview', count: undefined },
    { id: 'courses', label: 'My Courses', count: courses.length },
    { id: 'assignments', label: 'Assignments', count: assignments.length },
    { id: 'submissions', label: 'Grading', count: pendingSubmissions.length },
    { id: 'resources', label: 'Resources', count: undefined },
    { id: 'announcements', label: 'Announcements', count: undefined }
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
        loadCourses(user.id),
        loadAssignments(user.id),
        loadPendingSubmissions(user.id),
        loadAnalytics()
      ]);
    } catch (error: any) {
      setError(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
  };

  async function loadCourses(userId: string) {
    try {
      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false });

      if (courses) {
        const coursesWithStats = await Promise.all(
          courses.map(async (course) => {
            const { data: lessons } = await supabase
              .from('lessons')
              .select('id')
              .eq('course_id', course.id);

            const { data: enrollments } = await supabase
              .from('enrollments')
              .select('id')
              .eq('course_id', course.id);

            const { data: courseAssignments } = await supabase
              .from('assignments')
              .select('id')
              .eq('course_id', course.id);

            return {
              ...course,
              lessonCount: lessons?.length || 0,
              studentCount: enrollments?.length || 0,
              assignmentCount: courseAssignments?.length || 0,
              averageScore: Math.floor(Math.random() * 20) + 80 // Mock data
            };
          })
        );

        setCourses(coursesWithStats);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  }

  async function loadAssignments(userId: string) {
    try {
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          *,
          courses (title)
        `)
        .in('course_id', courses.map(c => c.id))
        .order('created_at', { ascending: false });

      setAssignments(assignments || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  }

  async function loadPendingSubmissions(userId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get courses taught by this teacher
      const { data: teacherCourses } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', userId);

      if (teacherCourses && teacherCourses.length > 0) {
        const courseIds = teacherCourses.map(c => c.id);
        
        // Get assignments for these courses
        const { data: courseAssignments } = await supabase
          .from('assignments')
          .select('id, title, course_id')
          .in('course_id', courseIds);

        if (courseAssignments && courseAssignments.length > 0) {
          const assignmentIds = courseAssignments.map(a => a.id);
          
          // Get pending submissions
          const { data: submissions } = await supabase
            .from('submissions')
            .select(`
              *,
              assignments (title, course_id),
              profiles (full_name)
            `)
            .in('assignment_id', assignmentIds)
            .eq('status', 'pending')
            .order('submitted_at', { ascending: false });

          // Format submissions
          const formattedSubmissions = submissions?.map(submission => ({
            id: submission.id,
            studentName: submission.profiles?.full_name || 'Unknown Student',
            assignmentTitle: submission.assignments?.title || 'Unknown Assignment',
            courseName: 'Course', // Would need to join with courses table
            submittedAt: submission.submitted_at,
            assignmentType: 'assignment' as const,
            points: 100 // Default points
          })) || [];

          setPendingSubmissions(formattedSubmissions);
        }
      }
    } catch (error) {
      console.error('Error loading pending submissions:', error);
    }
  }

  async function loadAnalytics() {
    try {
      // Mock analytics data for now
      const mockAnalytics = {
        totalCourses: courses.length,
        totalStudents: courses.reduce((sum, course) => sum + course.studentCount, 0),
        totalAssignments: assignments.length,
        pendingGrades: pendingSubmissions.length,
        averageRating: 4.7,
        studentEngagement: [
          { date: '2025-11-03', active: 45, submissions: 32 },
          { date: '2025-11-04', active: 52, submissions: 28 },
          { date: '2025-11-05', active: 38, submissions: 35 },
          { date: '2025-11-06', active: 61, submissions: 42 },
          { date: '2025-11-07', active: 55, submissions: 38 },
          { date: '2025-11-08', active: 48, submissions: 29 },
          { date: '2025-11-09', active: 63, submissions: 45 }
        ],
        coursePerformance: courses.map(course => ({
          course: course.title.substring(0, 20) + (course.title.length > 20 ? '...' : ''),
          students: course.studentCount,
          avgScore: course.averageScore
        })),
        assignmentCompletion: assignments.slice(0, 5).map(assignment => ({
          name: assignment.title.substring(0, 15) + (assignment.title.length > 15 ? '...' : ''),
          submitted: Math.floor(Math.random() * 20) + 10,
          pending: Math.floor(Math.random() * 5)
        }))
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  // Handler functions
  const handleEditCourse = (courseId: string) => {
    setEditingId(courseId);
    setShowForm(true);
  };

  const handleManageLessons = (courseId: string) => {
    setSelectedCourseId(courseId);
    setShowLessonModal(true);
  };

  const handleViewAnalytics = (courseId: string) => {
    navigate(`/teacher/analytics/${courseId}`);
  };

  const handleTogglePublish = async (courseId: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !isPublished })
        .eq('id', courseId);

      if (error) throw error;
      
      // Refresh courses
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadCourses(user.id);
      }
    } catch (error) {
      console.error('Error updating course publish status:', error);
    }
  };

  const handleViewSubmission = (submissionId: string) => {
    navigate(`/teacher/submissions/${submissionId}`);
  };

  const handleGradeSubmission = (submissionId: string) => {
    const submission = pendingSubmissions.find(s => s.id === submissionId);
    if (submission) {
      setSelectedSubmission(submission);
      setShowGradingModal(true);
    }
  };

  const handleViewSubmissions = (assignmentId: string) => {
    navigate(`/teacher/assignments/${assignmentId}/submissions`);
  };

  const handleEditAssignment = (assignmentId: string) => {
    setEditingAssignmentId(assignmentId);
    setShowAssignmentForm(true);
  };

  const handleGradeAssignment = (assignmentId: string) => {
    navigate(`/teacher/assignments/${assignmentId}/grade`);
  };

  // Render tab content
  const renderTabContent = () => {
    if (loading && !analytics) {
      return <LoadingState message="Loading teacher dashboard..." size="lg" />;
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
        if (!analytics) {
          return <LoadingState message="Loading analytics..." />;
        }

        return (
          <TeacherOverview
            data={{
              analytics,
              pendingSubmissions,
              recentActivity: [] // Would be loaded from real data
            }}
            isLoading={loading}
            onViewSubmission={handleViewSubmission}
            onGradeSubmission={handleGradeSubmission}
          />
        );

      case 'courses':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Course</span>
                </button>
              </div>
            </div>
            
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onEditCourse={handleEditCourse}
                    onManageLessons={handleManageLessons}
                    onViewAnalytics={handleViewAnalytics}
                    onTogglePublish={handleTogglePublish}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No courses yet"
                description="Create your first course to start teaching"
                action={
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Course
                  </button>
                }
              />
            )}
          </div>
        );

      case 'assignments':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
              <button
                onClick={() => setShowAssignmentForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create Assignment</span>
              </button>
            </div>
            
            {assignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={{
                      id: assignment.id,
                      title: assignment.title,
                      courseName: assignment.courses?.title || 'Unknown Course',
                      dueDate: assignment.due_date || new Date().toISOString(),
                      submissionCount: Math.floor(Math.random() * 20) + 5, // Mock data
                      pendingCount: Math.floor(Math.random() * 5), // Mock data
                      averageScore: Math.floor(Math.random() * 20) + 80, // Mock data
                      type: 'assignment' as const
                    }}
                    onViewSubmissions={handleViewSubmissions}
                    onEditAssignment={handleEditAssignment}
                    onGradeAssignment={handleGradeAssignment}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No assignments yet"
                description="Create assignments to assess your students"
                action={
                  <button
                    onClick={() => setShowAssignmentForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Assignment
                  </button>
                }
              />
            )}
          </div>
        );

      case 'submissions':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Pending Grading</h2>
            {pendingSubmissions.length > 0 ? (
              <div className="space-y-4">
                {pendingSubmissions.map((submission) => (
                  <div key={submission.id} className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{submission.assignmentTitle}</h3>
                        <p className="text-gray-600">{submission.studentName} • {submission.courseName}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-900">
                          {submission.points} points
                        </span>
                        <button
                          onClick={() => handleGradeSubmission(submission.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Grade
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No pending submissions"
                description="All submissions have been graded"
                icon={<Award className="h-12 w-12 text-gray-400" />}
              />
            )}
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Course Resources</h2>
            <EmptyState
              title="No resources yet"
              description="Upload and organize your course materials"
              icon={<FolderOpen className="h-12 w-12 text-gray-400" />}
            />
          </div>
        );

      case 'announcements':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Megaphone className="h-4 w-4" />
                <span>New Announcement</span>
              </button>
            </div>
            <EmptyState
              title="No announcements yet"
              description="Create announcements to communicate with your students"
              icon={<Megaphone className="h-12 w-12 text-gray-400" />}
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
          title="Teacher Dashboard"
          description="Manage your courses, assignments, and student progress"
          breadcrumbs={[
            { label: 'Teacher' },
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
      </div>
    </DashboardLayout>
  );
}
