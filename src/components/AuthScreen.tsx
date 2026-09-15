import React, { useState } from 'react';
import {
  ChevronRight,
  ArrowLeft,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { FlowerLogo } from './landing/FlowerLogo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthScreenProps {
  initialMode?: 'signin' | 'signup';
  onLogin: (email: string, userId?: string, userName?: string) => void;
  onBackToLanding?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'signin',
  onLogin,
  onBackToLanding,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setAuthError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAuthError('Please enter your work email address.');
      return;
    }

    if (!password) {
      setAuthError('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setAuthError(
        'Workspace authentication service is currently initializing. Please try again in a few moments.'
      );
      return;
    }

    setIsLoading(true);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setAuthError('Please enter your full name.');
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setAuthError('Passwords do not match. Please re-enter your password.');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return;
        }

        // Auto-confirmed or session granted immediately
        if (data.session && data.user) {
          onLogin(data.user.email || cleanEmail, data.user.id, fullName.trim());
          setIsLoading(false);
          return;
        }

        // Account registered
        if (data.user) {
          // If the user already existed in Supabase, try direct sign-in or advise
          if (data.user.identities && data.user.identities.length === 0) {
            setAuthError('An account with this email already exists. Please switch to Sign In.');
            setIsLoading(false);
            return;
          }

          // Attempt immediate sign-in (works when email confirm is disabled)
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (!signInErr && signInData?.user) {
            onLogin(signInData.user.email || cleanEmail, signInData.user.id, fullName.trim());
            setIsLoading(false);
            return;
          }

          // Notice for projects requiring email verification
          setSuccessMessage(
            'Account created successfully! Please check your email inbox to confirm your account, or try signing in below.'
          );
          setMode('signin');
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        console.error('Registration error:', err);
        setAuthError(err.message || 'An unexpected error occurred during sign up.');
        setIsLoading(false);
        return;
      }
    } else {
      // Sign In mode
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (
            error.message.toLowerCase().includes('invalid login credentials') ||
            error.message.toLowerCase().includes('user not found')
          ) {
            setAuthError(
              'Invalid email or password. New user? Click the "Create Account" tab above to register.'
            );
          } else {
            setAuthError(error.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          const userName =
            data.user.user_metadata?.full_name ||
            data.user.email?.split('@')[0] ||
            'User';
          onLogin(data.user.email || cleanEmail, data.user.id, userName);
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        console.error('Sign in error:', err);
        setAuthError(err.message || 'Authentication failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#ededed] p-3 sm:p-4 font-inter antialiased flex flex-col justify-center items-center">
      {/* Container (matching hero frame) */}
      <div className="relative w-full h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] overflow-hidden bg-[#d9d9d9] rounded-2xl sm:rounded-3xl shadow-sm flex flex-col items-center justify-center">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disableRemotePlayback
          poster="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4"
            type="video/mp4"
          />
        </video>

        {/* Video overlay */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] pointer-events-none" />

        {/* Top back button */}
        {onBackToLanding && (
          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20">
            <button
              id="auth-back-to-home-btn"
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-2 rounded-full bg-white/85 hover:bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-800 shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          </div>
        )}

        {/* Auth Card */}
        <div className="relative z-10 w-full max-w-md mx-auto px-4 my-auto">
          <div className="rounded-3xl border border-white/60 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-xl text-center">
            {/* Logo */}
            <div className="flex flex-col items-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-neutral-950 flex items-center justify-center mb-3 shadow-md">
                <div className="scale-75">
                  <FlowerLogo />
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
                {mode === 'signin' ? (
                  <>
                    Log in to <span className="text-[#ef4d23]">IntentWrite</span>
                  </>
                ) : (
                  <>
                    Create your <span className="text-[#ef4d23]">Account</span>
                  </>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 font-normal">
                {mode === 'signin'
                  ? 'Enter your credentials to access your dashboard'
                  : 'Start publishing high-ranking AI content for your business'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-neutral-100/90 rounded-2xl mb-5 border border-neutral-200/50">
              <button
                type="button"
                id="auth-tab-signin"
                onClick={() => switchMode('signin')}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-neutral-950 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="auth-tab-signup"
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-neutral-950 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error banner */}
            {authError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-left text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed flex-1">
                  <span>{authError}</span>
                  {authError.includes('Create Account') && (
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="ml-1.5 underline font-semibold text-rose-900 hover:text-rose-950"
                    >
                      Sign Up Now
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success banner */}
            {successMessage && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-left text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">{successMessage}</p>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
              {/* Full Name field only for Sign Up */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-name-input"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ankit Shah"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Work Email field */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-neutral-700">
                    Password
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    Min. 6 characters
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password field only for Sign Up */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-confirm-password-input"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full !mt-5 inline-flex items-center justify-center gap-2 bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] text-white rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm font-medium shadow-sm transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
                  </>
                ) : mode === 'signin' ? (
                  <>
                    <span>Sign In & Enter Dashboard</span>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white/90" />
                    <span>Create Account & Get Started</span>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Toggle Prompt */}
            <div className="mt-5 pt-4 border-t border-neutral-100 text-center">
              {mode === 'signin' ? (
                <p className="text-xs text-neutral-500">
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    id="auth-switch-to-signup"
                    onClick={() => switchMode('signup')}
                    className="text-[#ef4d23] hover:text-[#d03d15] font-semibold hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-xs text-neutral-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    id="auth-switch-to-signin"
                    onClick={() => switchMode('signin')}
                    className="text-[#ef4d23] hover:text-[#d03d15] font-semibold hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>

            {/* Footer Trust Indicator */}
            <p className="text-center text-[11px] text-neutral-400 mt-4">
              Protected by secure authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
