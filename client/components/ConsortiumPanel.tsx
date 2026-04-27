'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { User } from '@/types';

interface Member {
  user:         { _id: string; name: string };
  contribution: number;
  percentage:   number;
  joinedAt:     string;
}

interface Consortium {
  _id:          string;
  name:         string;
  targetAmount: number;
  raisedAmount: number;
  maxMembers:   number;
  status:       string;
  bidPlaced:    boolean;
  members:      Member[];
  createdBy:    { _id: string; name: string };
}

interface Props {
  auctionId:    string;
  currentPrice: number;
  user:         User | null;
  isLive:       boolean;
}

export default function ConsortiumPanel({ auctionId, currentPrice, user, isLive }: Props) {
  const [consortiums,   setConsortiums]   = useState<Consortium[]>([]);
  const [showCreate,    setShowCreate]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');

  const [createForm, setCreateForm] = useState({
    name:         '',
    targetAmount: '',
    contribution: '',
    maxMembers:   '5'
  });

  const [joinAmounts, setJoinAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConsortiums();
  }, [auctionId]);

  const fetchConsortiums = async () => {
    try {
      const res = await api.get(`/api/consortiums/auction/${auctionId}`);
      setConsortiums(res.data.consortiums);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    if (!createForm.name || !createForm.targetAmount || !createForm.contribution)
      return setError('Please fill all fields.');
    if (Number(createForm.contribution) > Number(createForm.targetAmount))
      return setError('Your contribution cannot exceed the target amount.');

    setActionLoading('create');
    try {
      await api.post('/api/consortiums', {
        auctionId,
        name:         createForm.name,
        targetAmount: Number(createForm.targetAmount),
        contribution: Number(createForm.contribution),
        maxMembers:   Number(createForm.maxMembers)
      });
      setSuccess('Consortium created successfully!');
      setShowCreate(false);
      setCreateForm({ name: '', targetAmount: '', contribution: '', maxMembers: '5' });
      fetchConsortiums();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create consortium.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoin = async (consortiumId: string) => {
    const amount = joinAmounts[consortiumId];
    if (!amount) return setError('Please enter your contribution amount.');
    setError('');
    setActionLoading(consortiumId);
    try {
      await api.post(`/api/consortiums/${consortiumId}/join`, {
        contribution: Number(amount)
      });
      setSuccess('Joined consortium successfully!');
      setJoinAmounts(prev => ({ ...prev, [consortiumId]: '' }));
      fetchConsortiums();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGroupBid = async (consortiumId: string) => {
    setError('');
    setActionLoading(consortiumId + '-bid');
    try {
      await api.post(`/api/consortiums/${consortiumId}/bid`);
      setSuccess('Group bid placed successfully!');
      fetchConsortiums();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place group bid.');
    } finally {
      setActionLoading(null);
    }
  };

  const isMyConsortium = (c: Consortium) =>
    user && c.members.some(m => m.user._id === user.id);

  const isCreator = (c: Consortium) =>
    user && c.createdBy._id === user.id;

  const progressPercent = (c: Consortium) =>
    Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100));

  if (!isLive) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Group bidding</h3>
          <p className="text-xs text-gray-400 mt-0.5">Pool money with other buyers and bid together</p>
        </div>
        {user && user.role === 'buyer' && !showCreate &&  (
          <button
            onClick={() => { setShowCreate(true); setError(''); }}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Create group
          </button>
        )}
      </div>

      {error   && <p className="text-red-600   text-xs mb-3 bg-red-50   px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-green-600 text-xs mb-3 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

      {/* Create form */}
      {showCreate && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-3">Create a bidding group</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Group name (e.g. Kurnool Investors)"
              value={createForm.name}
              onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Target bid amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000000"
                  value={createForm.targetAmount}
                  onChange={e => setCreateForm(p => ({ ...p, targetAmount: e.target.value }))}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Your contribution (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 1000000"
                  value={createForm.contribution}
                  onChange={e => setCreateForm(p => ({ ...p, contribution: e.target.value }))}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max members</label>
              <select
                value={createForm.maxMembers}
                onChange={e => setCreateForm(p => ({ ...p, maxMembers: e.target.value }))}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n} members</option>
                ))}
              </select>
            </div>

            {createForm.targetAmount && createForm.contribution && (
              <p className="text-xs text-blue-700">
                Your ownership: {Math.round((Number(createForm.contribution) / Number(createForm.targetAmount)) * 100)}%
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={actionLoading === 'create'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'create' ? 'Creating...' : 'Create group'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setError(''); }}
                className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consortiums list */}
      {loading ? (
        <p className="text-gray-400 text-xs text-center py-4">Loading groups...</p>
      ) : consortiums.length === 0 ? (
        <p className="text-gray-400 text-xs text-center py-4">
          No bidding groups yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {consortiums.map(c => (
            <div key={c._id} className={`border rounded-xl p-4 ${isMyConsortium(c) ? 'border-blue-200 bg-blue-50' : 'border-gray-100'}`}>

              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-400">
                    {c.members.length}/{c.maxMembers} members · by {c.createdBy.name}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  c.status === 'ready'   ? 'bg-green-100 text-green-700' :
                  c.status === 'bidding' ? 'bg-blue-100  text-blue-700'  :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {c.status === 'ready' ? 'Ready to bid' : c.status}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>₹{c.raisedAmount.toLocaleString('en-IN')} raised</span>
                  <span>Target: ₹{c.targetAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      c.status === 'ready' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progressPercent(c)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{progressPercent(c)}% funded</p>
              </div>

              {/* Members */}
              <div className="flex flex-wrap gap-2 mb-3">
                {c.members.map((m, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-lg px-2 py-1">
                    <p className="text-xs font-medium text-gray-700">{m.user.name}</p>
                    <p className="text-xs text-gray-400">{m.percentage}% · ₹{m.contribution.toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {user && user.role === 'buyer' && !isMyConsortium(c) && c.status === 'open' && c.members.length < c.maxMembers && (
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Your contribution (₹)"
                    value={joinAmounts[c._id] || ''}
                    onChange={e => setJoinAmounts(p => ({ ...p, [c._id]: e.target.value }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleJoin(c._id)}
                    disabled={actionLoading === c._id}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading === c._id ? '...' : 'Join group'}
                  </button>
                </div>
              )}

              {/* Place group bid — only creator when ready */}
              {isCreator(c) && c.status === 'ready' && !c.bidPlaced && (
                <button
                  onClick={() => handleGroupBid(c._id)}
                  disabled={actionLoading === c._id + '-bid'}
                  className="w-full mt-2 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === c._id + '-bid'
                    ? 'Placing group bid...'
                    : `Place group bid of ₹${c.raisedAmount.toLocaleString('en-IN')}`}
                </button>
              )}

              {isMyConsortium(c) && !isCreator(c) && c.status === 'ready' && (
                <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg mt-2">
                  Target reached! Waiting for group creator to place the bid.
                </p>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}