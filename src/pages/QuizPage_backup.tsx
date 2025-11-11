import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Trophy, Lightbulb, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface QuizQuestion {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  hint?: string;
  points: number;
  time_limit: number;
  difficulty: string;
}

interface QuizSession {
  id: string;
  questions: QuizQuestion[];
  start_time: string;
  total_questions: number;
  hints_used: number;
}

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
}

interface QuizResult {
  score: number;
  max_score: number;
  percentage: number;
  time_taken: number;
  correct_answers: number;
  total_questions: number;
  hints_used: number;
  hint_penalty: number;
  time_bonus: number;
  game_mode: string;
  responses: {
    question_id: number;
    question_text: string;
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
    points_earned: number;
  }[];
}

export default function QuizPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Quiz state
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Question state
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showHint, setShowHint] = useState(false);
  const [hintRequested, setHintRequested] = useState<Set<number>>(new Set());
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  
  // Animation state
  const [showCelebration, setShowCelebration] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  // Initialize quiz
  useEffect(() => {
    if (!authLoading && user) {
      startQuiz();
    } else if (!authLoading && !user) {
      setError('Authentication required. Please log in.');
      setIsLoading(false);
    }
  }, [category, user, authLoading]);

  // Question timer
  useEffect(() => {
    if (!quizSession || !quizSession.questions[currentQuestion]) return;
    
    const question = quizSession.questions[currentQuestion];
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const remaining = Math.max(0, question.time_limit - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        handleNextQuestion();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [currentQuestion, questionStartTime, quizSession]);

  // Create celebratory confetti
  const createConfetti = useCallback(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F39C12', '#E74C3C'];
    const newConfetti = Array.from({length: 50}, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      rotation: Math.random() * 360
    }));
    setConfettiPieces(newConfetti);
  }, []);

  // Launch celebration
  const launchCelebration = useCallback(() => {
    createConfetti();
    setShowCelebration(true);
    
    // Hide celebration after 5 seconds
    setTimeout(() => {
      setShowCelebration(false);
    }, 5000);
  }, [createConfetti]);

  // Map categories to quiz IDs
  const getQuizIdForCategory = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'science': '6',
      'mathematics': '7', 
      'english': '8',
      'computing': '9'
    };
    return categoryMap[category] || '6';
  };

  // Start quiz
  const startQuiz = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Wait for auth loading to complete
      if (authLoading) {
        return;
      }

      // Check if user is authenticated
      if (!user) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Get fresh session for API calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to get authentication session. Please log in again.');
      }

      console.log('Starting quiz with authenticated user:', user.id);

      // Map category to quiz ID and get quiz data
      const quizId = getQuizIdForCategory(category || 'science');
      console.log('Using quiz ID:', quizId, 'for category:', category);

      // Call quiz-service edge function to get quiz with questions
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-service/${quizId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Quiz API error:', errorData);
        throw new Error(errorData.error?.message || `Failed to load quiz for category: ${category}`);
      }

      const result = await response.json();
      
      if (result.data && result.data.questions) {
        const questions = result.data.questions || [];
        if (questions.length === 0) {
          throw new Error('No questions available for this category. Please try another category.');
        }
        
        console.log('Quiz started successfully with', questions.length, 'questions');
        
        // Transform questions to match frontend interface
        const transformedQuestions = questions.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b, 
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          hint: q.hint,
          points: q.points || 10,
          time_limit: q.time_limit || 30,
          difficulty: q.difficulty || 'medium'
        }));
        
        setQuizSession({
          id: quizId,
          questions: transformedQuestions,
          start_time: new Date().toISOString(),
          total_questions: transformedQuestions.length,
          hints_used: 0
        });
        
        setCurrentQuestion(0);
        setSessionStartTime(Date.now());
        setQuestionStartTime(Date.now());
        setTimeLeft(transformedQuestions[0]?.time_limit || 30);
      } else if (result.data && result.data.questions === undefined) {
        // Handle case where we get a quiz list instead of quiz with questions
        throw new Error('Quiz data format error. Please try again.');
      } else {
        throw new Error(result.error?.message || 'Failed to load quiz questions');
      }
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to start quiz');
    } finally {
      setIsLoading(false);
    }
  };

  // Get hint for current question
  const getHint = async () => {
    if (!quizSession || !quizSession.questions[currentQuestion]) return;

    const question = quizSession.questions[currentQuestion];
    if (hintRequested.has(question.id)) return;

    try {
      // Get fresh session for API calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Session error for hint:', sessionError);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-service/questions/${question.id}/hint`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.hint) {
          setShowHint(true);
          setHintRequested(new Set([...hintRequested, question.id]));
          setQuizSession(prev => prev ? {
            ...prev,
            hints_used: prev.hints_used + 1
          } : null);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Hint API error:', errorData);
      }
    } catch (err) {
      console.error('Error getting hint:', err);
    }
  };

  // Submit current answer
  const submitAnswer = () => {
    if (!selectedAnswer || !quizSession) return;

    setUserAnswers(prev => ({
      ...prev,
      [quizSession.questions[currentQuestion].id]: selectedAnswer
    }));

    handleNextQuestion();
  };

  // Move to next question
  const handleNextQuestion = () => {
    if (!quizSession) return;

    if (currentQuestion < quizSession.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowHint(false);
      setQuestionStartTime(Date.now());
      setTimeLeft(quizSession.questions[currentQuestion + 1]?.time_limit || 30);
    } else {
      finishQuiz();
    }
  };

  // Finish quiz
  const finishQuiz = async () => {
    if (!quizSession) return;

    try {
      // Get fresh session for API calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Session error for submit:', sessionError);
        setError('Authentication error. Please try logging in again.');
        return;
      }

      // Transform answers to match backend format
      const formattedAnswers = Object.entries(userAnswers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        user_answer: answer,
        response_time: 0 // Individual question timing not tracked in current implementation
      }));
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-service/${quizSession.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          time_taken: Math.floor((Date.now() - sessionStartTime) / 1000),
          hints_used_list: Array.from(hintRequested)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setQuizResult({
            score: result.data.final_score || 0,
            max_score: result.data.max_possible_score || 100,
            percentage: result.data.percentage || 0,
            time_taken: result.data.time_taken || 0,
            correct_answers: result.data.correct_answers || 0,
            total_questions: result.data.total_questions || 0,
            hints_used: result.data.hints_used || 0,
            hint_penalty: result.data.hint_penalty || 0,
            time_bonus: result.data.time_bonus || 0,
            game_mode: 'practice',
            responses: (result.data.results || []).map((r: any) => ({
              question_id: r.question_id,
              question_text: r.question_text,
              user_answer: r.user_answer,
              correct_answer: r.correct_answer,
              is_correct: r.is_correct,
              explanation: r.explanation,
              points_earned: r.total_points || r.points_earned || 0
            }))
          });
          
          // Trigger celebration for good scores
          if (result.data.percentage >= 70) {
            launchCelebration();
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Submit API error:', errorData);
          setError(errorData.error?.message || 'Failed to submit quiz');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Submit response error:', errorData);
        setError(errorData.error?.message || 'Failed to submit quiz');
      }
    } catch (err) {
      console.error('Error finishing quiz:', err);
      setError('Failed to submit quiz');
    }
  };

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{authLoading ? 'Checking Authentication...' : 'Starting Quiz...'}</h2>
          <p className="text-slate-600">{authLoading ? 'Verifying your session' : 'Preparing your questions'}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Quiz Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={startQuiz}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-700 transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz result screen
  if (quizResult) {
    const percentage = quizResult.percentage;
    const isExcellent = percentage >= 90;
    const isGood = percentage >= 70;
    const isPassing = percentage >= 60;

    return (
      <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-4xl w-full">
          {/* Celebratory Animation */}
          {showCelebration && (
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
              <div className="relative w-full h-full">
                {confettiPieces.map((piece) => (
                  <div
                    key={piece.id}
                    className="absolute animate-confetti"
                    style={{
                      left: `${piece.x}%`,
                      top: '-20px',
                      backgroundColor: piece.color,
                      animationDelay: `${piece.delay}s`,
                      animationDuration: '3s',
                      width: '10px',
                      height: '10px',
                      transform: `rotate(${piece.rotation}deg)`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className={`p-6 sm:p-8 text-white ${
              isExcellent ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
              isGood ? 'bg-gradient-to-r from-green-400 to-blue-500' :
              isPassing ? 'bg-gradient-to-r from-blue-400 to-purple-500' :
              'bg-gradient-to-r from-slate-400 to-slate-600'
            }`}>
              <div className="text-center">
                <div className="bg-white/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  {isExcellent ? <Sparkles className="h-10 w-10" /> : <Trophy className="h-10 w-10" />}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-2">
                  {isExcellent ? 'Outstanding!' : isGood ? 'Well Done!' : isPassing ? 'Good Effort!' : 'Keep Practicing!'}
                </h2>
                <p className="text-xl opacity-90 capitalize">{category} Quiz Complete</p>
              </div>
            </div>

            {/* Score Summary */}
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{percentage}%</p>
                  <p className="text-sm text-slate-600">Score</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{quizResult.correct_answers}</p>
                  <p className="text-sm text-slate-600">Correct</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{quizResult.hints_used}</p>
                  <p className="text-sm text-slate-600">Hints Used</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600">{quizResult.time_bonus}</p>
                  <p className="text-sm text-slate-600">Time Bonus</p>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-4 mb-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Question Review</h3>
                {quizResult.responses.map((response, idx) => (
                  <div
                    key={response.question_id}
                    className={`p-4 rounded-xl border-2 ${
                      response.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {response.is_correct ? (
                        <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 mb-2">{response.question_text}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-4">
                            <span className={`font-medium ${
                              response.is_correct ? 'text-green-700' : 'text-red-700'
                            }`}>
                              Your Answer: {response.user_answer}
                            </span>
                            <span className="text-slate-600">
                              Correct: {response.correct_answer}
                            </span>
                            <span className="text-blue-600 font-medium">
                              Points: {response.points_earned}
                            </span>
                          </div>
                          {response.explanation && (
                            <div className="p-3 bg-blue-100 rounded-lg border-l-4 border-blue-500">
                              <p className="text-blue-800">
                                <strong>Explanation:</strong> {response.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-slate-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-700 transition"
                >
                  Go Home
                </button>
                <button
                  onClick={startQuiz}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Try Another Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  if (!quizSession) return null;

  const question = quizSession.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizSession.questions.length) * 100;

  // CSS for confetti animation
  const confettiKeyframes = `
    @keyframes confetti {
      0% {
        transform: translateY(-100vh) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }
    .animate-confetti {
      animation: confetti 3s ease-in-out forwards;
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 sm:py-12 px-4">
      <style>{confettiKeyframes}</style>
      <div className="max-w-4xl w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4">
              <span className="text-lg sm:text-xl font-semibold capitalize">{category} Quiz</span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white/20 px-3 py-2 rounded-lg">
                  <Clock className="h-5 w-5" />
                  <span className="text-lg font-bold">{timeLeft}s</span>
                </div>
                <div className="bg-white/20 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium">Hints: {quizSession.hints_used}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm">
              <span>Question {currentQuestion + 1} of {quizSession.questions.length}</span>
              <span className="text-blue-100">
                Score: {Object.keys(userAnswers).filter(key => {
                  const answer = userAnswers[parseInt(key)];
                  const q = quizSession.questions.find(q => q.id === parseInt(key));
                  return answer && q && answer === q.correct_answer;
                }).length} correct
              </span>
            </div>
            
            <div className="w-full bg-white/30 rounded-full h-3 mt-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question Content */}
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 flex-1">
                  {question.question_text}
                </h3>
                <button
                  onClick={getHint}
                  disabled={hintRequested.has(question.id)}
                  className={`ml-4 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    hintRequested.has(question.id)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                >
                  <Lightbulb className="h-4 w-4 inline mr-1" />
                  {hintRequested.has(question.id) ? 'Hint Used' : 'Hint'}
                </button>
              </div>
              
              {showHint && question.hint && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg mb-6">
                  <div className="flex">
                    <Lightbulb className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-800">
                      <strong>Hint:</strong> {question.hint}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-8">
              {[
                { key: 'A', value: question.option_a },
                { key: 'B', value: question.option_b },
                { key: 'C', value: question.option_c },
                { key: 'D', value: question.option_d },
              ].filter(option => option.value).map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSelectedAnswer(option.key)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition ${
                    selectedAnswer === option.key
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold text-lg mr-3">{option.key}.</span>
                  <span className="text-base">{option.value}</span>
                </button>
              ))}
            </div>

            <button
              onClick={submitAnswer}
              disabled={!selectedAnswer}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition ${
                selectedAnswer
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {currentQuestion < quizSession.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}