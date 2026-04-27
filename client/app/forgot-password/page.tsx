'use client';

import { useState, FormEvent, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type Step = 'email' | 'otp' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step,            setStep]            = useState<Step>('email');
  const [email,           setEmail]           = useState('');
  const [otp,             setOtp]             = useState(['', '', '', '', '', '']);
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [resending,       setResending]       = useState(false);
  const [error,           setError]           = useState('');
  const [timeLeft,        setTimeLeft]        = useState(180);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef  = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    setTimeLeft(180);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // Step 1 — send OTP
  const handleSendOTP = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setStep('otp');
      startTimer();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify OTP
  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) return setError('Please enter all 6 digits.');
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/verify-reset-otp', { otp: otpString });
      setStep('reset');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await api.post('/api/auth/forgot-password', { email });
      setOtp(['', '', '', '', '', '']);
      startTimer();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  // Step 3 — reset password
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { password, confirmPassword });
      setStep('done');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="text-blue-600 font-bold text-2xl">Land Auction</Link>
          <p className="text-gray-500 mt-1 text-sm">
            {step === 'email' && 'Reset your password'}
            {step === 'otp'   && 'Enter the OTP sent to your email'}
            {step === 'reset' && 'Set your new password'}
            {step === 'done'  && 'Password reset complete'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Step 1 — Email */}
        {step === 'email' && (
          <form onSubmit={handleSendOTP} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Remember your password?{' '}
              <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
            </p>
          </form>
        )}

        {/* Step 2 — OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP}>
            <p className="text-sm text-gray-500 text-center mb-4">
              OTP sent to <span className="font-medium text-gray-700">{email}</span>
            </p>

            <div className={`text-center text-2xl font-bold tabular-nums mb-6 ${
              timeLeft <= 30 ? 'text-red-500' : 'text-blue-600'
            }`}>
              {timeLeft > 0 ? formatTime(timeLeft) : 'OTP expired'}
            </div>

            <div className="flex gap-3 justify-center mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(index, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  disabled={timeLeft <= 0}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || timeLeft <= 0}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors mb-3"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || timeLeft > 150}
                className="text-sm text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>
              {timeLeft > 150 && (
                <p className="text-xs text-gray-400 mt-1">
                  Resend available after {formatTime(timeLeft - 150)}
                </p>
              )}
            </div>
          </form>
        )}

        {/* Step 3 — New password */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        {/* Step 4 — Done */}
        {step === 'done' && (
          <div className="text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Password reset!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              href="/login"
              className="block w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
            >
              Go to sign in
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}