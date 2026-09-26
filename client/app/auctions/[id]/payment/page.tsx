'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';

const UPI_ID        = '8978200779@ybl';
const MERCHANT_NAME = 'LandAuction';

export default function AuctionPaymentPage() {
  const { id }              = useParams<{ id: string }>();
  const { user, loading }   = useAuth();
  const router              = useRouter();

  const [auction,    setAuction]    = useState<any>(null);
  const [fetching,   setFetching]   = useState(true);
  const [isMobile,   setIsMobile]   = useState(false);
  const [step,       setStep]       = useState<'info' | 'paying'>('info');
  const [utrNumber,  setUtrNumber]  = useState('');
  const [utrError,   setUtrError]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');
  const [copied,     setCopied]     = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    fetchAuction();
  }, [id]);

  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
    setIsMobile(mobile);
  }, []);

  const fetchAuction = async () => {
    try {
      const res = await api.get(`/api/auctions/${id}`);
      setAuction(res.data.auction);
    } catch {
      router.push('/auctions');
    } finally {
      setFetching(false);
    }
  };

  const amount = auction?.currentPrice || 0;
  const note   = `Land auction payment - ${auction?.land?.title || ''}`;

  const phonepeLink = `phonepe://pay?pa=${UPI_ID}&pn=${MERCHANT_NAME}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  const gpayLink     = `tez://upi/pay?pa=${UPI_ID}&pn=${MERCHANT_NAME}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  const paytmLink    = `paytmmp://pay?pa=${UPI_ID}&pn=${MERCHANT_NAME}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  const genericUpi   = `upi://pay?pa=${UPI_ID}&pn=${MERCHANT_NAME}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  const qrUrl         = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(genericUpi)}&choe=UTF-8`;

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openApp = (url: string) => {
    setStep('paying');
    window.location.href = url;
  };

  const handleSubmitPayment = async () => {
    if (!utrNumber.trim())
      return setUtrError('Please enter your UTR / transaction ID.');
    if (utrNumber.trim().length < 8)
      return setUtrError('Please enter a valid UTR number.');

    setUtrError('');
    setError('');
    setSubmitting(true);

    try {
      await api.post('/api/payments/submit', {
        auctionId: id,
        utr:       utrNumber.trim()
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  if (!auction) return null;

  const isWinner    = user && auction.winner?._id === user.id;
  const isPaid      = auction.paymentStatus === 'paid';
  const isConfirmed = auction.paymentStatus === 'confirmed';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-12">

        <Link href={`/auctions/${id}`} className="text-sm text-blue-600 hover:underline mb-6 inline-block">
          ← Back to auction
        </Link>

        {/* Not winner */}
        {!isWinner && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-500">You are not the winner of this auction.</p>
          </div>
        )}

        {/* Ownership confirmed */}
        {isWinner && isConfirmed && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Land ownership transferred!</h2>
            <p className="text-gray-500 text-sm">
              Congratulations! The land is now officially yours. Check your email for transfer details.
            </p>
          </div>
        )}

        {/* Payment received, waiting for admin */}
        {isWinner && isPaid && !isConfirmed && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment submitted!</h2>
            <p className="text-gray-500 text-sm mb-4">
              Your payment of ₹{auction.currentPrice?.toLocaleString('en-IN')} has been received.
              Admin will verify and confirm ownership transfer within 24-48 hours.
            </p>
            <p className="text-xs text-gray-400">Transaction ID: {auction.paymentUTR}</p>
          </div>
        )}

        {/* Payment success just now */}
        {isWinner && success && !isPaid && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment submitted!</h2>
            <p className="text-gray-500 text-sm mb-4">
              We've received your transaction details for ₹{auction.currentPrice?.toLocaleString('en-IN')}.
              Our team will verify it and confirm ownership shortly.
            </p>
            <p className="text-xs text-gray-400 mb-6">Transaction ID: {utrNumber}</p>
            <Link
              href="/dashboard"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700"
            >
              Go to dashboard
            </Link>
          </div>
        )}

        {/* Pay now */}
        {isWinner && !isPaid && !isConfirmed && !success && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8">

            {/* ── INFO STEP ── */}
            {step === 'info' && (
              <>
                <div className="text-center mb-8">
                  <div className="text-4xl mb-3">🏆</div>
                  <h1 className="text-2xl font-bold text-gray-900">You won!</h1>
                  <p className="text-gray-500 text-sm mt-1">
                    Pay via UPI to claim ownership.
                  </p>
                </div>

                {/* Auction summary */}
                <div className="bg-gray-50 rounded-xl p-5 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">{auction.land?.title}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium">{auction.land?.location}, {auction.land?.state}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Area</span>
                      <span className="font-medium">{auction.land?.area} {auction.land?.areaUnit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Seller</span>
                      <span className="font-medium">{auction.land?.seller?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                      <span className="text-gray-700 font-semibold">Winning bid</span>
                      <span className="font-bold text-blue-600 text-lg">
                        ₹{auction.currentPrice?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pay to */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                  <p className="text-xs text-blue-600 font-semibold uppercase mb-2">Pay to</p>
                  <p className="text-gray-800 font-semibold">Land Auction Platform</p>
                  <p className="text-gray-600 text-sm">UPI: {UPI_ID}</p>
                  <p className="text-gray-600 text-sm">Amount: ₹{amount?.toLocaleString('en-IN')}</p>
                </div>

                {/* ── MOBILE: app buttons ── */}
                {isMobile ? (
                  <>
                    <p className="text-sm font-medium text-gray-700 mb-3">Choose payment app</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        onClick={() => openApp(phonepeLink)}
                        className="flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                      >
                        <span className="text-lg">📱</span> PhonePe
                      </button>
                      <button
                        onClick={() => openApp(gpayLink)}
                        className="flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                      >
                        <span className="text-lg">💳</span> Google Pay
                      </button>
                      <button
                        onClick={() => openApp(paytmLink)}
                        className="flex items-center justify-center gap-2 bg-sky-500 text-white py-3 rounded-xl font-semibold hover:bg-sky-600 transition-colors"
                      >
                        <span className="text-lg">💰</span> Paytm
                      </button>
                      <button
                        onClick={() => openApp(genericUpi)}
                        className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                      >
                        <span className="text-lg">🔗</span> Any UPI app
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── DESKTOP: QR code ── */
                  <>
                    <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                      Scan with any UPI app to pay
                    </p>
                    <div className="flex flex-col items-center mb-6">
                      <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 inline-block shadow-sm">
                        <img
                          src={qrUrl}
                          alt="UPI QR Code"
                          width={200}
                          height={200}
                          className="rounded-lg"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        Open PhonePe, GPay, Paytm or any UPI app<br/>
                        and scan this QR code to pay ₹{amount?.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </>
                )}

                {/* UPI ID copy */}
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
              </>
            )}

            {/* ── PAYING STEP ── */}
            {step === 'paying' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⏳</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Enter transaction ID</h2>
                  <p className="text-gray-500 text-sm mt-2">
                    After paying ₹{amount?.toLocaleString('en-IN')} to{' '}
                    <span className="font-semibold text-gray-700">{UPI_ID}</span>,
                    enter the UTR or transaction ID from your payment receipt.
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-yellow-800">
                    Open your UPI app → Payment history → Find the payment →
                    Copy the UTR or transaction ID and paste it below.
                  </p>
                </div>

                {!isMobile && (
                  <div className="flex flex-col items-center mb-6">
                    <p className="text-xs text-gray-500 mb-2">Haven't paid yet? Scan here</p>
                    <img
                      src={qrUrl}
                      alt="UPI QR Code"
                      width={140}
                      height={140}
                      className="rounded-xl border border-gray-100"
                    />
                  </div>
                )}

                {isMobile && (
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    <button onClick={() => { window.location.href = phonepeLink; }}
                      className="bg-purple-100 text-purple-700 py-2 rounded-lg text-xs font-semibold hover:bg-purple-200">
                      PhonePe
                    </button>
                    <button onClick={() => { window.location.href = gpayLink; }}
                      className="bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-semibold hover:bg-blue-200">
                      GPay
                    </button>
                    <button onClick={() => { window.location.href = paytmLink; }}
                      className="bg-sky-100 text-sky-700 py-2 rounded-lg text-xs font-semibold hover:bg-sky-200">
                      Paytm
                    </button>
                    <button onClick={() => { window.location.href = genericUpi; }}
                      className="bg-green-100 text-green-700 py-2 rounded-lg text-xs font-semibold hover:bg-green-200">
                      UPI
                    </button>
                  </div>
                )}

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
                  {utrError && <p className="text-red-600 text-xs mt-1">{utrError}</p>}
                  {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
                </div>

                <button
                  onClick={handleSubmitPayment}
                  disabled={submitting}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'I have paid — submit for verification'}
                </button>

                <button
                  onClick={() => setStep('info')}
                  className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Go back
                </button>
              </>
            )}

          </div>
        )}

      </main>
    </div>
  );
}