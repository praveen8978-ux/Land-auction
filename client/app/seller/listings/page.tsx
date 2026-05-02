'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import TrustScore      from '@/components/TrustScore';
import DocumentUpload  from '@/components/DocumentUpload';

interface Land {
  _id:           string;
  title:         string;
  location:      string;
  state:         string;
  area:          number;
  areaUnit:      string;
  landType:      string;
  startingPrice: number;
  status:        string;
  photos:        string[];
  createdAt:     string;
  trustScore:    number;
  documents:     { type: string; verified: boolean }[];
  rejectionReason?: string;
}

const statusStyle: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100  text-green-700',
  rejected: 'bg-red-100    text-red-700',
  sold:     'bg-gray-100   text-gray-600',
};

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [lands,    setLands]    = useState<Land[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedLand, setExpandedLand] = useState<string | null>(null);
  const [landDocs, setLandDocs] = useState<Record<string, { score: number; docs: any[] }>>({});

  useEffect(() => {
    if (!loading && !user)                  router.push('/login');
    if (!loading && user?.role === 'buyer') router.push('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchLands();
  }, [user]);

  const fetchLands = async () => {
    try {
      const res = await api.get('/api/lands/my');
      setLands(res.data.lands);
    } catch {
      console.error('Failed to fetch lands');
    } finally {
      setFetching(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/lands/${id}`);
      setLands(prev => prev.filter(l => l._id !== id));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        alert(axiosErr.response?.data?.error || 'Failed to delete.');
      }
    } finally {
      setDeleting(null);
    }
  };

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My listings</h1>
            <p className="text-gray-500 text-sm mt-1">
              {lands.length} listing{lands.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/seller/pay"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            + New listing
          </Link>
        </div>

        {lands.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <p className="text-gray-400 text-lg mb-2">No listings yet</p>
            <p className="text-gray-400 text-sm mb-6">
              Create your first land listing to get started.
            </p>
            <Link
              href="/seller/pay"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700"
            >
              List your land
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {lands.map(land => (
              <div key={land._id} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-5">

                {/* Photo */}
                <div className="w-28 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {land.photos[0] ? (
                    <img
                      src={`http://localhost:3000${land.photos[0]}`}
                      alt={land.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      No photo
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-gray-900 truncate">{land.title}</h3>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusStyle[land.status]}`}>
                      {land.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    {land.location}, {land.state} &bull; {land.area} {land.areaUnit} &bull; {land.landType}
                  </p>

                  <p className="text-blue-600 font-semibold text-sm mt-1">
                    Starting ₹{land.startingPrice.toLocaleString('en-IN')}
                  </p>

                  {land.status === 'rejected' && land.rejectionReason && (
                    <p className="text-red-600 text-xs mt-1">
                      Rejected: {land.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {land.status === 'pending' && (
                    <button
                      onClick={() => handleDelete(land._id)}
                      disabled={deleting === land._id}
                      className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      {deleting === land._id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>

                {/* Document section */}
                <div className="mt-3 border-t border-gray-50 pt-3">
                  <button
                    onClick={() => setExpandedLand(expandedLand === land._id ? null : land._id)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    {expandedLand === land._id ? 'Hide documents ↑' : 'Manage documents ↓'}
                  </button>

                  {expandedLand === land._id && (
                    <div className="mt-4 space-y-4">
                      <TrustScore
                        score={landDocs[land._id]?.score ?? (land as any).trustScore ?? 0}
                        documents={landDocs[land._id]?.docs ?? (land as any).documents ?? []}
                      />
                      <DocumentUpload
                        landId={land._id}
                        onUpload={(score, docs) => {
                          setLandDocs(prev => ({ ...prev, [land._id]: { score, docs } }));
                        }}
                      />
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}