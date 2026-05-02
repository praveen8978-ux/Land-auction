'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';

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
  listingFeeUTR?: string;
  seller: {
    name:  string;
    email: string;
  };
  createdAt: string;
}

interface ApprovedLandForAuction {
  _id:   string;
  title: string;
}

interface Stats {
  totalUsers:    number;
  totalLands:    number;
  pendingLands:  number;
  approvedLands: number;
  totalAuctions: number;
  liveAuctions:  number;
}

const statusStyle: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100  text-green-700',
  rejected: 'bg-red-100    text-red-700',
  sold:     'bg-gray-100   text-gray-600',
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab,             setTab]             = useState<'pending' | 'all' | 'users'>('pending');
  const [lands,           setLands]           = useState<Land[]>([]);
  const [stats,           setStats]           = useState<Stats | null>(null);
  const [fetching,        setFetching]        = useState(true);
  const [rejectId,        setRejectId]        = useState<string | null>(null);
  const [rejectReason,    setRejectReason]    = useState('');
  const [actionLoading,   setActionLoading]   = useState<string | null>(null);
  const [users,           setUsers]           = useState<any[]>([]);
  const [showAuctionForm, setShowAuctionForm] = useState(false);
  const [approvedLands,   setApprovedLands]   = useState<ApprovedLandForAuction[]>([]);
  const [auctionForm,     setAuctionForm]     = useState({ landId: '', startTime: '', endTime: '', reservePrice: '' });
  const [creatingAuction, setCreatingAuction] = useState(false);
  const [auctionMsg,      setAuctionMsg]      = useState('');

  useEffect(() => {
    if (!loading && !user)                  router.push('/login');
    if (!loading && user?.role !== 'admin') router.push('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
      fetchLands('pending');
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/admin/dashboard');
      setStats(res.data.stats);
    } catch {}
  };

  const fetchLands = async (status?: string) => {
    setFetching(true);
    try {
      const url = status ? `/api/admin/lands?status=${status}` : '/api/admin/lands';
      const res = await api.get(url);
      setLands(res.data.lands);
    } catch {} finally {
      setFetching(false);
    }
  };

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data.users);
    } catch {} finally {
      setFetching(false);
    }
  };

  const fetchApprovedLands = async () => {
    try {
      const res = await api.get('/api/admin/lands?status=approved');
      setApprovedLands(res.data.lands);
    } catch {}
  };

  const handleTab = (t: 'pending' | 'all' | 'users') => {
    setTab(t);
    if (t === 'users') fetchUsers();
    else fetchLands(t === 'pending' ? 'pending' : undefined);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.put(`/api/admin/lands/${id}/approve`);
      setLands(prev => prev.map(l => l._id === id ? { ...l, status: 'approved' } : l));
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return alert('Please enter a rejection reason.');
    setActionLoading(id);
    try {
      await api.put(`/api/admin/lands/${id}/reject`, { reason: rejectReason });
      setLands(prev => prev.map(l => l._id === id ? { ...l, status: 'rejected' } : l));
      setRejectId(null);
      setRejectReason('');
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role } : u));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to change role.');
    }
  };

  const handleCreateAuction = async () => {
    if (!auctionForm.landId || !auctionForm.startTime || !auctionForm.endTime)
      return setAuctionMsg('Please fill all fields.');
    setCreatingAuction(true);
    setAuctionMsg('');
    try {
      await api.post('/api/auctions', {
        landId:       auctionForm.landId,
        startTime:    auctionForm.startTime,
        endTime:      auctionForm.endTime,
        reservePrice: auctionForm.reservePrice || null
      });
      setAuctionMsg('Auction created successfully!');
      setAuctionForm({ landId: '', startTime: '', endTime: '', reservePrice: '' });
      setTimeout(() => {
        setShowAuctionForm(false);
        setAuctionMsg('');
      }, 1500);
      fetchStats();
    } catch (err: any) {
      setAuctionMsg(err.response?.data?.error || 'Failed to create auction.');
    } finally {
      setCreatingAuction(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Panel</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Total users',    value: stats.totalUsers    },
              { label: 'Total lands',    value: stats.totalLands    },
              { label: 'Pending',        value: stats.pendingLands,  highlight: true },
              { label: 'Approved',       value: stats.approvedLands  },
              { label: 'Auctions',       value: stats.totalAuctions  },
              { label: 'Live now',       value: stats.liveAuctions   },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-2xl border p-4 ${s.highlight && s.value > 0 ? 'border-yellow-300' : 'border-gray-100'}`}>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.highlight && s.value > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs + Create auction button */}
        <div className="flex items-center gap-2 mb-6">
          {(['pending', 'all', 'users'] as const).map(t => (
            <button
              key={t}
              onClick={() => handleTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'pending' ? 'Pending listings' : t === 'all' ? 'All listings' : 'Users'}
            </button>
          ))}

          <button
            onClick={() => {
              setShowAuctionForm(!showAuctionForm);
              fetchApprovedLands();
              setAuctionMsg('');
            }}
            className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            + Create auction
          </button>
        </div>

        {/* Create auction form */}
        {showAuctionForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Create new auction</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approved land
                </label>
                <select
                  value={auctionForm.landId}
                  onChange={e => setAuctionForm(prev => ({ ...prev, landId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select land</option>
                  {approvedLands.map(l => (
                    <option key={l._id} value={l._id}>{l.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start time
                </label>
                <input
                  type="datetime-local"
                  value={auctionForm.startTime}
                  onChange={e => setAuctionForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End time
                </label>
                <input
                  type="datetime-local"
                  value={auctionForm.endTime}
                  onChange={e => setAuctionForm(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reserve price (₹) <span className="text-gray-400 text-xs font-normal">optional · hidden from buyers</span>
                </label>
                <input
                  type="number"
                  value={auctionForm.reservePrice || ''}
                  onChange={e => setAuctionForm(prev => ({ ...prev, reservePrice: e.target.value }))}
                  placeholder="e.g. 3000000"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

            </div>

            {auctionMsg && (
              <p className={`text-sm mt-3 font-medium ${auctionMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {auctionMsg}
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCreateAuction}
                disabled={creatingAuction}
                className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {creatingAuction ? 'Creating...' : 'Create auction'}
              </button>
              <button
                onClick={() => { setShowAuctionForm(false); setAuctionMsg(''); }}
                className="border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Lands tab */}
        {tab !== 'users' && (
          fetching ? (
            <div className="text-center py-20 text-gray-400">Loading...</div>
          ) : lands.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <p className="text-gray-400">No {tab === 'pending' ? 'pending' : ''} listings found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lands.map(land => (
                <div key={land._id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex gap-5">

                    <div className="w-32 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
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

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{land.title}</h3>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusStyle[land.status]}`}>
                          {land.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {land.location}, {land.state} · {land.area} {land.areaUnit} · {land.landType}
                      </p>
                      <p className="text-blue-600 font-semibold text-sm mt-1">
                        Starting ₹{land.startingPrice.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Seller: {land.seller?.name} ({land.seller?.email})
                      </p>
                      {land.listingFeeUTR && (
                        <p className="text-xs text-green-600 mt-1">
                          Payment UTR: {land.listingFeeUTR}
                        </p>
                      )}
                      {/* Documents */}
                      {(land as any).documents?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            Trust score: <span className="font-semibold text-blue-600">{(land as any).trustScore}/100</span>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(land as any).documents.map((doc: any) => (
                              <div key={doc._id} className="flex items-center gap-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  doc.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {doc.type.replace(/_/g, ' ')} {doc.verified ? '✓' : '○'}
                                </span>
                                {!doc.verified && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.put(`/api/lands/${land._id}/documents/${doc._id}/verify`);
                                        fetchLands(tab === 'pending' ? 'pending' : undefined);
                                      } catch {}
                                    }}
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    Verify
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {land.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(land._id)}
                          disabled={actionLoading === land._id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === land._id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => { setRejectId(land._id); setRejectReason(''); }}
                          disabled={actionLoading === land._id}
                          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {rejectId === land._id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">Rejection reason</p>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Tell the seller why this listing was rejected..."
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 resize-none mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(land._id)}
                          disabled={actionLoading === land._id}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading === land._id ? 'Rejecting...' : 'Confirm reject'}
                        </button>
                        <button
                          onClick={() => setRejectId(null)}
                          className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Users tab */}
        {tab === 'users' && (
          fetching ? (
            <div className="text-center py-20 text-gray-400">Loading...</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-800 font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{u.email}</td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="buyer">buyer</option>
                          <option value="seller">seller</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

      </main>
    </div>
  );
}