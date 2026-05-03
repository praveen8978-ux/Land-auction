'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function AuctionPaymentPage() {
  const { id }              = useParams<{ id: string }>();
  const { user, loading }   = useAuth();
  const router              = useRouter();

  const [auction,    setAuction]    = useState<any>(null);
  const [fetching,   setFetching]   = useState(true);
  const [paying,     setPaying]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [paymentId,  setPaymentId]  = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    fetchAuction();
    loadRazorpayScript();
  }, [id]);

  const loadRazorpayScript = () => {
    if (document.getElementById('razorpay-script')) return;
    const script    = document.createElement('script');
    script.id       = 'razorpay-script';
    script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async    = true;
    document.body.appendChild(script);
  };

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

  const handlePayment = async () => {
    setError('');
    setPaying(true);

    try {
      // Step 1 — create Razorpay order
      const orderRes = await api.post('/api/payments/create-order', {
        auctionId: id
      });

      const { orderId, amount, currency, keyId, prefill, land } = orderRes.data;

      // Step 2 — open Razorpay checkout
      const options = {
        key:      keyId,
        amount:   amount,
        currency: currency,
        name:     'Land Auction',
        description: `Payment for ${land.title}`,
        order_id: orderId,
        prefill: {
          name:  prefill.name,
          email: prefill.email
        },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setError('Payment cancelled.');
          }
        },
        handler: async (response: any) => {
          // Step 3 — verify payment on backend
          try {
            await api.post('/api/payments/verify', {
              auctionId:           id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature
            });

            setPaymentId(response.razorpay_payment_id);
            setSuccess(true);
            setPaying(false);
          } catch (err: any) {
            setError(err.response?.data?.error || 'Payment verification failed.');
            setPaying(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setError(`Payment failed: ${response.error.description}`);
        setPaying(false);
      });
      rzp.open();

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate payment.');
      setPaying(false);
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment received!</h2>
            <p className="text-gray-500 text-sm mb-4">
              Your payment of ₹{auction.currentPrice?.toLocaleString('en-IN')} has been received.
              Admin will confirm ownership transfer within 24 hours.
            </p>
            <p className="text-xs text-gray-400">Payment ID: {auction.paymentId}</p>
          </div>
        )}

        {/* Payment success just now */}
        {isWinner && success && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment successful!</h2>
            <p className="text-gray-500 text-sm mb-4">
              ₹{auction.currentPrice?.toLocaleString('en-IN')} paid successfully.
              You will receive an email confirmation shortly.
            </p>
            <p className="text-xs text-gray-400 mb-6">Payment ID: {paymentId}</p>
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

            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🏆</div>
              <h1 className="text-2xl font-bold text-gray-900">You won!</h1>
              <p className="text-gray-500 text-sm mt-1">
                Complete the payment to claim ownership.
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

            {/* Razorpay info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800 font-medium mb-1">Secure payment via Razorpay</p>
              <p className="text-xs text-blue-600">
                Supports UPI, Credit/Debit cards, Net banking, Wallets.
                Your payment is 100% secure and encrypted.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={paying}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {paying
                ? 'Opening payment...'
                : `Pay ₹${auction.currentPrice?.toLocaleString('en-IN')}`}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              By paying you agree to the land transfer terms and conditions.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}