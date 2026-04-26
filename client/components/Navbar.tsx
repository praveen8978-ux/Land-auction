'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const roleBadgeClass: Record<string, string> = {
    admin:  'bg-yellow-100 text-yellow-700',
    seller: 'bg-green-100  text-green-700',
    buyer:  'bg-blue-100   text-blue-700',
  };

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

        <Link href="/" className="text-blue-600 font-bold text-xl tracking-tight">
          Land Auction
        </Link>

        {/* Centre links — visible to all logged in users */}
        {user && (
          <div className="flex items-center gap-6">
            <Link
              href="/auctions"
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Live Auctions
            </Link>
            {user.role === 'seller' && (
              <Link
                href="/seller/listings"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                My Listings
              </Link>
            )}
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                Admin Panel
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-600">{user.name}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadgeClass[user.role]}`}>
                {user.role}
              </span>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-blue-600">
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Register
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}