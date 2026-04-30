'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const roleBadgeClass: Record<string, string> = {
    admin:  'bg-yellow-100 text-yellow-700',
    seller: 'bg-green-100  text-green-700',
    buyer:  'bg-blue-100   text-blue-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-10">

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Dashboard</h2>

        {/* Account details card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Account details</h3>
          <div className="space-y-3">

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-28">Full name</span>
              <span className="text-sm font-medium text-gray-800">{user.name}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-28">Email</span>
              <span className="text-sm text-gray-800">{user.email}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-28">Role</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadgeClass[user.role]}`}>
                {user.role}
              </span>
            </div>

          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-400">Active auctions</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-400">Bids placed</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-400">Auctions won</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </div>
        </div>

        {/* Seller actions */}
{user.role === 'seller' && (
  <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
    <h3 className="font-semibold text-gray-700 mb-3">Seller actions</h3>
    <div className="flex gap-3 flex-wrap">
      <Link
        href="/seller/listings/new"
        className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        + List new land
      </Link>
      <Link
        href="/seller/listings"
        className="border border-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
      >
        My listings
      </Link>
      <Link
        href="/auctions"
        className="border border-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
      >
        View auctions
      </Link>
    </div>
  </div>
)}
        {/* Buyer actions */}
        {user.role === 'buyer' && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Browse auctions</h3>
            <div className="flex gap-3">
              <Link
                href="/auctions"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                View live auctions
              </Link>
            </div>
          </div>
        )}

        {/* Admin actions */}
        {user.role === 'admin' && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Admin actions</h3>
            <div className="flex gap-3">
              <Link
                href="/admin"
                className="bg-yellow-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-colors"
              >
                Admin panel
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}