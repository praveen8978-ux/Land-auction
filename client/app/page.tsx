'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
          Online land auction platform
        </div>

        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-4">
          Buy and sell land
          <span className="text-blue-600"> at auction</span>
        </h1>

        <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
          Transparent, real-time bidding on land across India.
          Register as a buyer or seller and get started today.
        </p>

        {!loading && (
          <div className="flex gap-4 justify-center">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Get started
                </Link>
                <Link
                  href="/login"
                  className="border border-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}