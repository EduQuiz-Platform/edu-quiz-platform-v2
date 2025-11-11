import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, RefreshCw, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';

interface PasswordResetInfo {
  hasApprovedReset: boolean;
  tempPassword?: string;
  expiresAt?: string;
  status?: string;
  tempPasswordViewed?: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showReRequest, setShowReRequest] = useState(false);
  const [showTempPasswordInfo, setShowTempPasswordInfo] = useState(false);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<PasswordResetInfo | null>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { signIn, user, profile, hasTemporaryPassword, getPasswordResetInfo, markTempPasswordAsViewed } = useAuth();
  const navigate = useNavigate();

  // Redirect already authenticated users to their dashboard
  useEffect(() => {
    if (user && profile) {
      navigate(`/${profile.role}/dashboard`);
    }
  }, [user, profile, navigate]);

  async function checkPasswordResetStatus() {
    if (!email) return;
    
    try {
      const resetInfo = await getPasswordResetInfo(email);
      setTempPasswordInfo(resetInfo);
      
      if (resetInfo.hasApprovedReset && resetInfo.tempPassword) {
        setShowTempPasswordInfo(true);
      }
    } catch (error) {
      console.error('Error checking password reset status:', error);
    }
  }

  // Check password reset status when email changes
  useEffect(() => {
    if (email && email.includes('@')) {
      const timer = setTimeout(() => {
        checkPasswordResetStatus();
      }, 500); // Debounce email input

      return () => clearTimeout(timer);
    }
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Special case: if user has approved reset and password is not the temp password
      if (tempPasswordInfo?.hasApprovedReset && password !== tempPasswordInfo.tempPassword) {
        // User might be trying to log in with their old password or has changed it
        try {
          await signIn(email, password);
          // AuthContext will automatically handle the redirect based on profile role
        } catch (err: any) {
          // If normal login fails, it might be because they need to use temp password
          if (err.message === 'SHOW_TEMP_PASSWORD') {
            setShowTempPasswordInfo(true);
            setError('Please use your temporary password to log in.');
            return;
          }
          throw err;
        }
      } else {
        // Normal sign in process
        await signIn(email, password);
        // AuthContext will automatically handle the redirect based on profile role
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle password reset status errors
      if (err.message === 'PENDING_RESET') {
        setError('Your password reset request is currently pending administrator approval. You will be notified via email when your temporary password is ready.');
      } else if (err.message === 'REJECTED_RESET') {
        setError('Your password reset request was rejected. You can submit a new request using the button below.');
        setShowReRequest(true);
      } else if (err.message === 'INVALID_TEMP_PASSWORD') {
        setError('The temporary password for your approved reset request has expired or been used. Please submit a new password reset request.');
        setShowReRequest(true);
      } else if (err.message === 'SHOW_TEMP_PASSWORD') {
        setShowTempPasswordInfo(true);
        setError('Please use your temporary password to log in.');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReRequest() {
    setError('');
    setShowReRequest(false);
    setShowForgotPassword(true);
  }

  function handleUseTempPassword() {
    if (tempPasswordInfo?.tempPassword) {
      setPassword(tempPasswordInfo.tempPassword);
      setShowTempPasswordInfo(false);
      setError('');
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  function formatExpiryTime(expiryString: string) {
    const expiry = new Date(expiryString);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="bg-blue-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <LogIn className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Welcome Back</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">Sign in to your account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Temporary Password Information Modal */}
          {showTempPasswordInfo && tempPasswordInfo && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="bg-orange-50 border-b border-orange-200 p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-orange-100 rounded-full p-2">
                        <Lock className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-orange-900">Your Temporary Password</h2>
                        <p className="text-sm text-orange-700">Your password reset has been approved</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTempPasswordInfo(false)}
                      className="text-orange-600 hover:text-orange-700 p-1"
                    >
                      <LogIn className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-yellow-800">Important Security Notice</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          You must change your password after using this temporary password.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Your Temporary Password
                      </label>
                      <div className="relative">
                        <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg p-3">
                          <code className="flex-1 font-mono text-sm text-slate-800 bg-transparent border-none p-0 focus:outline-none">
                            {showTempPassword ? tempPasswordInfo.tempPassword : '••••••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => setShowTempPassword(!showTempPassword)}
                            className="ml-2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            {showTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(tempPasswordInfo.tempPassword!)}
                            className="ml-2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            {copied ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {copied && (
                          <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">Expires in:</span>
                        <span className="text-sm font-bold text-blue-900">
                          {formatExpiryTime(tempPasswordInfo.expiresAt!)}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Expires at: {new Date(tempPasswordInfo.expiresAt!).toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h4 className="font-medium text-slate-800 mb-2">How to use:</h4>
                      <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                        <li>Copy the temporary password above</li>
                        <li>Use it as your password in the login form</li>
                        <li>You will be prompted to change your password immediately</li>
                      </ol>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleUseTempPassword}
                        className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
                      >
                        Use This Password
                      </button>
                      <button
                        onClick={() => setShowTempPasswordInfo(false)}
                        className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Forgot Password Modal */}
          {showForgotPassword && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="max-w-lg w-full">
                <ForgotPasswordForm
                  onClose={() => setShowForgotPassword(false)}
                  onSuccess={(email) => {
                    setShowForgotPassword(false);
                    setEmail(email);
                    setError('');
                  }}
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px]"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enter your email address to sign in
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px]"
                  placeholder="Your password or temporary password"
                  required
                  autoComplete="current-password"
                />
              </div>
              
              {/* Show helpful message if user has approved reset */}
              {tempPasswordInfo?.hasApprovedReset && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-700">
                    💡 You have an approved password reset. Use your temporary password to log in.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="h-4 w-4" />
                    <span>Sign in</span>
                  </div>
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign up
                </Link>
              </p>
            </div>

            {showReRequest && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleReRequest}
                  className="text-sm font-medium text-orange-600 hover:text-orange-500"
                >
                  Request new password reset
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}