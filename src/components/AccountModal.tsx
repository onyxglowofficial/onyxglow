import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LogOut, ShieldCheck, X } from 'lucide-react';
import {
  firebaseResendVerification,
  firebaseResetPassword,
  firebaseSignIn,
  firebaseSignInWithGoogle,
  firebaseSignUp,
  firebaseUpdateProfile,
} from '../lib/firebase';
import { FIRESTORE_RULES_SNIPPET } from '../lib/rulesSnippet';
import type { AppRoute, CustomerOrder, CustomerProfile, LaunchBooking } from '../types';

type AuthView = 'login' | 'register' | 'forgot' | 'profile';

interface AccountModalProps {
  open: boolean;
  user: CustomerProfile | null;
  bookings: LaunchBooking[];
  orders: CustomerOrder[];
  promptMessage?: string | null;
  onClose: () => void;
  onAuthSuccess: (user: CustomerProfile) => void;
  onLogout: () => void;
  onNavigate: (route: AppRoute) => void;
}

export function AccountModal({
  open,
  user,
  bookings,
  orders,
  promptMessage,
  onClose,
  onAuthSuccess,
  onLogout,
  onNavigate,
}: AccountModalProps) {
  const [view, setView] = useState<AuthView>(user ? 'profile' : 'login');
  const [showPassword, setShowPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      return localStorage.getItem('onyx_remembered_email') || '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(() => {
    try {
      return Boolean(localStorage.getItem('onyx_remembered_email'));
    } catch {
      return false;
    }
  });

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regTerms, setRegTerms] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');

  // Profile state
  const [editName, setEditName] = useState(user?.fullName ?? '');
  const [editPhone, setEditPhone] = useState(user?.phone ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (user) {
      setEditName(user.fullName);
      setEditPhone(user.phone);
      setView('profile');
    } else if (view === 'profile') {
      setView('login');
    }
  }, [user]);

  if (!open) return null;

  const activeView: AuthView = user ? 'profile' : view === 'profile' ? 'login' : view;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const profile = await firebaseSignIn({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      try {
        if (rememberEmail) {
          localStorage.setItem('onyx_remembered_email', loginEmail.trim());
        } else {
          localStorage.removeItem('onyx_remembered_email');
        }
      } catch {
        // Ignore storage restrictions
      }
      setLoginPassword('');
      onAuthSuccess(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const profile = await firebaseSignInWithGoogle();
      onAuthSuccess(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (regName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[+\d\s\-()]{6,30}$/.test(regPhone.trim())) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!regTerms) {
      setError('Please accept the Terms and Conditions.');
      return;
    }
    setLoading(true);
    try {
      const profile = await firebaseSignUp({
        fullName: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });
      setRegPassword('');
      setRegConfirm('');
      setNotice('Account created and saved to ONYX GLOW. Please check your inbox to verify your email.');
      onAuthSuccess(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await firebaseResetPassword(resetEmail.trim());
      setNotice('A password reset email has been sent via Firebase Authentication.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (editName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (editPhone.trim() && !/^[+\d\s\-()]{6,30}$/.test(editPhone.trim())) {
      setError('Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const updated = await firebaseUpdateProfile({
        fullName: editName.trim(),
        phone: editPhone.trim(),
      });
      onAuthSuccess(updated);
      setNotice('Your profile details have been saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await firebaseResendVerification();
      setNotice('Verification email sent. Check your inbox and reload after verifying.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#080808]/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[#0D0D0D] border border-[#B69A5A]/45 p-6 sm:p-10 text-[#F5F0E8] my-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close account modal"
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-[#D8C9A5] hover:text-[#FFFFFF] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {promptMessage && !user && (
          <div className="mb-5 border border-[#B69A5A]/60 bg-[#B69A5A]/15 px-4 py-3 text-xs text-[#F5F0E8]">
            {promptMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 border border-red-400/50 bg-red-950/40 px-4 py-3 text-xs text-red-200 space-y-2"
          >
            <p>{error}</p>
            {error.includes('Firestore permission denied') && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(FIRESTORE_RULES_SNIPPET);
                    setNotice('Copied firestore.rules to clipboard. Paste into Firebase Console → Firestore → Rules and click Publish.');
                  }}
                  className="px-3 py-1.5 bg-[#B69A5A] text-[#080808] text-[10px] tracking-[0.16em] uppercase font-medium cursor-pointer"
                >
                  Copy firestore.rules
                </button>
                <a
                  href="https://console.firebase.google.com/project/onyx-glow/firestore/rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-[#D8C9A5] text-[11px]"
                >
                  Open onyx-glow Rules
                </a>
              </div>
            )}
          </div>
        )}

        {notice && (
          <div className="mb-5 border border-[#B69A5A]/50 bg-[#B69A5A]/10 px-4 py-3 text-xs text-[#D8C9A5]">
            {notice}
          </div>
        )}

        {activeView === 'login' && (
          <div className="space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2 pr-8">
                <p className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
                  Client Portal
                </p>
                <h2 id="account-modal-title" className="font-serif-editorial text-3xl text-[#FFFFFF]">
                  SIGN IN TO ONYX GLOW
                </h2>
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 pr-11 text-sm text-[#FFFFFF] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#77736D] hover:text-[#F5F0E8] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-[#D8C9A5]/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="accent-[#B69A5A]"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setNotice('');
                    setResetEmail(loginEmail);
                    setView('forgot');
                  }}
                  className="text-[#B69A5A] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#B69A5A] hover:bg-[#D8C9A5] disabled:opacity-50 text-[#080808] text-xs tracking-[0.26em] uppercase font-medium transition-colors cursor-pointer"
              >
                {loading ? 'SIGNING IN...' : 'LOGIN'}
              </button>
            </form>

            <div className="flex items-center gap-3 text-[10px] tracking-[0.22em] uppercase text-[#77736D]">
              <div className="h-px flex-1 bg-[#F5F0E8]/15" />
              <span>Or Continue With</span>
              <div className="h-px flex-1 bg-[#F5F0E8]/15" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 border border-[#F5F0E8]/25 hover:border-[#B69A5A] text-xs tracking-[0.22em] uppercase text-[#F5F0E8] transition-colors cursor-pointer"
            >
              Continue with Google
            </button>

            <div className="pt-3 border-t border-[#F5F0E8]/10 text-center space-y-2">
              <p className="text-xs text-[#77736D]">New to ONYX GLOW?</p>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setNotice('');
                  setView('register');
                }}
                className="text-xs tracking-[0.22em] uppercase text-[#F5F0E8] hover:text-[#B69A5A] underline underline-offset-4 cursor-pointer"
              >
                CREATE AN ACCOUNT
              </button>
            </div>
          </div>
        )}

        {activeView === 'register' && (
          <div className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1 pr-8">
                <p className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
                  Client Registration
                </p>
                <h2 id="account-modal-title" className="font-serif-editorial text-3xl text-[#FFFFFF]">
                  CREATE AN ACCOUNT
                </h2>
              </div>

              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-2.5 text-sm text-[#FFFFFF] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-2.5 text-sm text-[#FFFFFF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+977-98XXXXXXXX"
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-2.5 text-sm text-[#FFFFFF] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-1.5">
                    Password (min 8 chars)
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-2.5 text-sm text-[#FFFFFF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-2.5 text-sm text-[#FFFFFF] outline-none"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[#D8C9A5]/85 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={regTerms}
                  onChange={(e) => setRegTerms(e.target.checked)}
                  className="mt-0.5 accent-[#B69A5A]"
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('/terms');
                    }}
                    className="underline text-[#B69A5A] cursor-pointer"
                  >
                    Terms and Conditions
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('/privacy-policy');
                    }}
                    className="underline text-[#B69A5A] cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#B69A5A] hover:bg-[#D8C9A5] disabled:opacity-50 text-[#080808] text-xs tracking-[0.26em] uppercase font-medium transition-colors cursor-pointer"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 border border-[#F5F0E8]/25 hover:border-[#B69A5A] text-xs tracking-[0.22em] uppercase text-[#F5F0E8] transition-colors cursor-pointer"
            >
              Sign up with Google
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setView('login');
                }}
                className="text-xs tracking-[0.2em] uppercase text-[#D8C9A5] hover:text-[#B69A5A] cursor-pointer"
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>
        )}

        {activeView === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-5">
            <div className="space-y-2 pr-8">
              <p className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
                Account Recovery
              </p>
              <h2 id="account-modal-title" className="font-serif-editorial text-3xl text-[#FFFFFF]">
                RESET PASSWORD
              </h2>
            </div>

            <div>
              <label className="block text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5] mb-2">
                Registered Email Address
              </label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full bg-[#080808] border border-[#F5F0E8]/20 focus:border-[#B69A5A] px-4 py-3 text-sm text-[#FFFFFF] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#B69A5A] text-[#080808] text-xs tracking-[0.24em] uppercase font-medium cursor-pointer"
            >
              {loading ? 'SENDING...' : 'SEND PASSWORD RESET EMAIL'}
            </button>

            <button
              type="button"
              onClick={() => setView('login')}
              className="w-full text-center text-xs tracking-[0.2em] uppercase text-[#D8C9A5] hover:text-[#B69A5A] cursor-pointer"
            >
              Back to Login
            </button>
          </form>
        )}

        {activeView === 'profile' && user && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pr-8">
              <div>
                <p className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
                  My Account
                </p>
                <h2 id="account-modal-title" className="font-serif-editorial text-3xl text-[#FFFFFF]">
                  {user.fullName}
                </h2>
                <p className="mt-1 text-xs text-[#D8C9A5]/80">
                  {user.email} · {user.emailVerified ? 'Verified Email' : 'Verification Pending'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-[#77736D] hover:text-[#B69A5A] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
                {user.email.toLowerCase() === 'onyxglow@gmail.com' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('/admin');
                    }}
                    className="px-3 py-1.5 border border-[#B69A5A]/50 text-[10px] tracking-[0.18em] uppercase text-[#B69A5A] hover:bg-[#B69A5A] hover:text-[#080808] transition-colors cursor-pointer"
                  >
                    Admin Console
                  </button>
                )}
              </div>
            </div>

            {!user.emailVerified && (
              <div className="border border-[#B69A5A]/30 bg-[#080808] p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#D8C9A5]">
                  <ShieldCheck className="w-4 h-4 text-[#B69A5A] shrink-0" />
                  <span>Your email verification is pending.</span>
                </div>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="px-3 py-1.5 bg-[#B69A5A] text-[#080808] text-[10px] tracking-[0.16em] uppercase font-medium shrink-0 cursor-pointer"
                >
                  Resend Email
                </button>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4 border-t border-[#F5F0E8]/10 pt-5">
              <p className="text-[11px] tracking-[0.22em] uppercase text-[#B69A5A]">
                Personal Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-3 py-2.5 text-sm text-[#FFFFFF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.18em] uppercase text-[#D8C9A5] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+977-98XXXXXXXX"
                    className="w-full bg-[#080808] border border-[#F5F0E8]/20 px-3 py-2.5 text-sm text-[#FFFFFF] outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 border border-[#B69A5A] text-[11px] tracking-[0.22em] uppercase text-[#B69A5A] hover:bg-[#B69A5A] hover:text-[#080808] transition-colors cursor-pointer"
              >
                Save Profile
              </button>
            </form>

            {/* Orders Summary */}
            <div className="border-t border-[#F5F0E8]/10 pt-5 space-y-3">
              <p className="text-[11px] tracking-[0.22em] uppercase text-[#B69A5A]">
                My Product Orders ({orders.length})
              </p>
              {orders.length === 0 ? (
                <p className="text-xs text-[#77736D]">No product orders placed yet.</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="border border-[#F5F0E8]/15 bg-[#080808] p-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <p className="text-[#B69A5A] tabular-nums font-medium">{ord.orderReference}</p>
                        <p className="text-[#77736D] tabular-nums">
                          {ord.items.length} item(s) · {new Date(ord.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="uppercase tracking-[0.16em] text-[#D8C9A5]">{ord.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bookings Summary */}
            <div className="border-t border-[#F5F0E8]/10 pt-5 space-y-3">
              <p className="text-[11px] tracking-[0.22em] uppercase text-[#B69A5A]">
                My Launch Event Bookings ({bookings.length})
              </p>
              {bookings.length === 0 ? (
                <p className="text-xs text-[#77736D]">No launch event reservations yet.</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="border border-[#F5F0E8]/15 bg-[#080808] p-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <p className="text-[#B69A5A] tabular-nums font-medium">{b.referenceNumber}</p>
                        <p className="text-[#77736D] tabular-nums">{b.guests} Guests</p>
                      </div>
                      <span className="uppercase tracking-[0.16em] text-[#D8C9A5]">{b.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
