'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

const UPI_ID        = '8978200779@ybl';
const MERCHANT_NAME = 'LandAuction';
const AMOUNT        = '50';
const NOTE          = 'Land listing fee';

const PHONEPE_LINK = `phonepe://pay?pa=${UPI_ID}&pn=${MERCHANT_NAME}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`;
const GPAY_LINK    = `tez://upi/pay?pa=${UPI_ID}&pn=${MERCHANT_NAME}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`;
const PAYTM_LINK   = `paytmmp://pay?pa=${UPI_ID}&pn=${MERCHANT_NAME}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`;
const GENERIC_UPI  = `upi://pay?pa=${UPI_ID}&pn=${MERCHANT_NAME}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`;

// QR code using Google Charts API — generates a real scannable UPI QR
const QR_URL = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(GENERIC_UPI)}&choe=UTF-8`;

export default function PayListingFeePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step,       setStep]       = useState<'info' | 'paying'>('info');
  const [isMobile,   setIsMobile]   = useState(false);
  const [utrNumber,  setUtrNumber]  = useState('');
  const [utrError,   setUtrError]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft,   setTimeLeft]   = useState(300);
  const [copied,     setCopied]     = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile on mount
  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
    setIsMobile(mobile);
  }, []);

  useEffect(() => {
    if (!loading && !user)                  router.push('/login');
    if (!loading && user?.role === 'buyer') router.push('/dashboard');
  }, [user, loading, router]);

  // Countdown when on paying step
  useEffect(() => {
    if (step === 'paying') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const formatTime = (s: number) => {
    const m   = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mobile: open app directly and move to paying step
  const openApp = (url: string) => {
    setStep('paying');
    window.location.href = url;
  };

  const handleConfirmPayment = () => {
    if (!utrNumber.trim())
      return setUtrError('Please enter your UTR / transaction ID.');
    if (utrNumber.trim().length < 8)
      return setUtrError('Please enter a valid UTR number.');

    setUtrError('');
    setSubmitting(true);

    sessionStorage.setItem('listingFeeUTR',     utrNumber.trim());
    sessionStorage.setItem('listingFeePaid',    'true');
    sessionStorage.setItem('listingFeePaidAt',  new Date().toISOString());

    setTimeout(() => router.push('/seller/listings/new'), 800);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-12">

        {/* ── INFO STEP ── */}
        {step === 'info' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8">

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏷️</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Listing fee</h1>
              <p className="text-gray-500 text-sm mt-2">
                A small fee keeps listings genuine and verified.
              </p>
            </div>

            {/* Fee breakdown */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-600">Land listing fee</span>
                <span className="font-semibold text-gray-900">₹50</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-600">Valid for</span>
                <span className="font-semibold text-gray-900">1 month</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-800">Total</span>
                <span className="text-xl font-bold text-blue-600">₹50</span>
              </div>
            </div>

            {/* Pay to */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <p className="text-xs text-blue-600 font-semibold uppercase mb-2">Pay to</p>
              <p className="text-gray-800 font-semibold">Land Auction Platform</p>
              <p className="text-gray-600 text-sm">UPI: {UPI_ID}</p>
              <p className="text-gray-600 text-sm">Amount: ₹{AMOUNT}</p>
            </div>

            {/* ── MOBILE: show app buttons ── */}
            {isMobile ? (
              <>
                <p className="text-sm font-medium text-gray-700 mb-3">Choose payment app</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => openApp(PHONEPE_LINK)}
                    className="flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                  >
                    <span className="text-lg">📱</span> PhonePe
                  </button>
                  <button
                    onClick={() => openApp(GPAY_LINK)}
                    className="flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                  >
                    <span className="text-lg">💳</span> Google Pay
                  </button>
                  <button
                    onClick={() => openApp(PAYTM_LINK)}
                    className="flex items-center justify-center gap-2 bg-sky-500 text-white py-3 rounded-xl font-semibold hover:bg-sky-600 transition-colors"
                  >
                    <span className="text-lg">💰</span> Paytm
                  </button>
                  <button
                    onClick={() => openApp(GENERIC_UPI)}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                  >
                    <span className="text-lg">🔗</span> Any UPI app
                  </button>
                </div>
              </>
            ) : (
              /* ── DESKTOP: show QR code ── */
              <>
                <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                  Scan with any UPI app to pay
                </p>
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 inline-block shadow-sm">
                    <img
                      src={QR_URL}
                      alt="UPI QR Code"
                      width={200}
                      height={200}
                      className="rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Open PhonePe, GPay, Paytm or any UPI app<br/>
                    and scan this QR code to pay ₹50
                  </p>

                  {/* Supported apps row */}
                  <div className="flex gap-3 mt-4">
                    <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-medium">📱 PhonePe</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">💳 GPay</span>
                    <span className="text-xs bg-sky-50 text-sky-700 px-3 py-1 rounded-full font-medium">💰 Paytm</span>
                  </div>
                </div>
              </>
            )}

            {/* UPI ID copy — shown on both */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 text-center mb-3">
                Or pay manually using UPI ID
              </p>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between mb-3">
                <span className="text-sm font-mono text-gray-800">{UPI_ID}</span>
                <button
                  onClick={copyUPI}
                  className="text-xs text-blue-600 font-medium hover:underline"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <button
                onClick={() => setStep('paying')}
                className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                I already paid — enter transaction ID
              </button>
            </div>

          </div>
        )}

        {/* ── PAYING STEP ── */}
        {step === 'paying' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8">

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⏳</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Enter transaction ID</h2>
              <p className="text-gray-500 text-sm mt-2">
                After paying ₹50 to{' '}
                <span className="font-semibold text-gray-700">{UPI_ID}</span>,
                enter the UTR or transaction ID from your payment receipt.
              </p>
            </div>

            {/* Countdown */}
            <div className={`text-center text-2xl font-bold tabular-nums mb-6 ${
              timeLeft <= 60 ? 'text-red-500' : 'text-blue-600'
            }`}>
              {timeLeft > 0 ? formatTime(timeLeft) : 'Time expired'}
            </div>

            {/* Reminder */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-800">
                Open your UPI app → Payment history → Find the ₹50 payment →
                Copy the UTR or transaction ID and paste it below.
              </p>
            </div>

            {/* Show QR again on desktop for convenience */}
            {!isMobile && (
              <div className="flex flex-col items-center mb-6">
                <p className="text-xs text-gray-500 mb-2">Haven't paid yet? Scan here</p>
                <img
                  src={QR_URL}
                  alt="UPI QR Code"
                  width={140}
                  height={140}
                  className="rounded-xl border border-gray-100"
                />
              </div>
            )}

            {/* Mobile: quick app buttons */}
            {isMobile && (
              <div className="grid grid-cols-4 gap-2 mb-6">
                <button onClick={() => { window.location.href = PHONEPE_LINK; }}
                  className="bg-purple-100 text-purple-700 py-2 rounded-lg text-xs font-semibold hover:bg-purple-200">
                  PhonePe
                </button>
                <button onClick={() => { window.location.href = GPAY_LINK; }}
                  className="bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-semibold hover:bg-blue-200">
                  GPay
                </button>
                <button onClick={() => { window.location.href = PAYTM_LINK; }}
                  className="bg-sky-100 text-sky-700 py-2 rounded-lg text-xs font-semibold hover:bg-sky-200">
                  Paytm
                </button>
                <button onClick={() => { window.location.href = GENERIC_UPI; }}
                  className="bg-green-100 text-green-700 py-2 rounded-lg text-xs font-semibold hover:bg-green-200">
                  UPI
                </button>
              </div>
            )}

            {/* UTR input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UTR / Transaction ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={e => setUtrNumber(e.target.value)}
                placeholder="e.g. 425123456789"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Found in your UPI app under payment history or SMS receipt.
              </p>
              {utrError && (
                <p className="text-red-600 text-xs mt-1">{utrError}</p>
              )}
            </div>

            <button
              onClick={handleConfirmPayment}
              disabled={submitting || timeLeft === 0}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Confirming...' : 'I have paid — continue to listing'}
            </button>

            <button
              onClick={() => setStep('info')}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              ← Go back
            </button>

          </div>
        )}

      </main>
    </div>
  );
}