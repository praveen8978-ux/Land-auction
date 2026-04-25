'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function VerifyOTPPage() {
  const router  = useRouter();
  const { login: setUser } = useAuth();

  const [otp,       setOtp]       = useState<string[]>(['', '', '', '', '', '']);
  const [error,     setError]     = useState<string>('');
  const [loading,   setLoading]   = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [timeLeft,  setTimeLeft]  = useState<number>(180); // 3 minutes
  const [resendMsg, setResendMsg] = useState<string>('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Handle each digit input
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only numbers
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only one digit
    setOtp(newOtp);
    // Auto move to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste — fill all boxes at once
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  const otpString = otp.join('');
  if (otpString.length !== 6)
    return setError('Please enter all 6 digits.');

  setError('');
  setLoading(true);

  try {
    const res = await api.post('/api/auth/verify-otp', { otp: otpString });
    // Fetch the user into AuthContext before redirecting
    const meRes = await api.get('/api/auth/me');
    // Force a hard navigation so AuthContext re-initializes with the session
    window.location.href = '/dashboard';
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Verification failed.');
    } else {
      setError('Verification failed. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};
  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      await api.post('/api/auth/resend-otp');
      setTimeLeft(180);
      setOtp(['', '', '', '', '', '']);
      setResendMsg('New OTP sent to your email.');
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Failed to resend OTP.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="text-blue-600 font-bold text-2xl">Land Auction</Link>
          <h2 className="text-gray-800 font-semibold text-lg mt-3">Check your email</h2>
          <p className="text-gray-500 text-sm mt-1">
            We sent a 6-digit code to your email address
          </p>
        </div>

        {/* Countdown */}
        <div className={`text-center mb-6 text-2xl font-bold tabular-nums ${
          timeLeft <= 30 ? 'text-red-500' : 'text-blue-600'
        }`}>
          {timeLeft > 0 ? formatTime(timeLeft) : 'OTP expired'}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {resendMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {resendMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* OTP boxes */}
          <div className="flex gap-3 justify-center mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                disabled={timeLeft <= 0}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || timeLeft <= 0}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        {/* Resend */}
        <div className="text-center mt-4">
          <button
            onClick={handleResend}
            disabled={resending || timeLeft > 150}
            className="text-sm text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
          {timeLeft > 150 && (
            <p className="text-xs text-gray-400 mt-1">
              You can resend after {formatTime(timeLeft - 150)}
            </p>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Wrong account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>

      </div>
    </div>
  );
}