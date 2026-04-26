'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';

interface Auction {
  _id:           string;
  currentPrice:  number;
  startingPrice: number;
  startTime:     string;
  endTime:       string;
  status:        'upcoming' | 'live' | 'ended';
  totalBids:     number;
  land: {
    _id:      string;
    title:    string;
    location: string;
    state:    string;
    area:     number;
    areaUnit: string;
    landType: string;
    photos:   string[];
    seller:   { name: string };
  };
}

const statusStyle: Record<string, string> = {
  live:     'bg-green-100 text-green-700',
  upcoming: 'bg-blue-100  text-blue-700',
  ended:    'bg-gray-100  text-gray-500',
};

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'all' | 'live' | 'upcoming'>('all');

  useEffect(() => {
    fetchAuctions();
  }, [filter]);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/api/auctions${params}`);
      setAuctions(res.data.auctions);
    } catch {
      console.error('Failed to fetch auctions');
    } finally {
      setLoading(false);
    }
  };

  const timeLeft = (endTime: string) => {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
    return `${h}h ${m}m left`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Land auctions</h1>
            <p className="text-gray-500 text-sm mt-1">{auctions.length} auctions available</p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['all', 'live', 'upcoming'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'All' : f === 'live' ? 'Live now' : 'Upcoming'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading auctions...</div>
        ) : auctions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
            <p className="text-gray-400 text-lg mb-2">No auctions available</p>
            <p className="text-gray-400 text-sm">Check back soon for new land auctions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {auctions.map(auction => (
              <Link key={auction._id} href={`/auctions/${auction._id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">

                  {/* Photo */}
                  <div className="h-48 bg-gray-100 relative">
                    {auction.land?.photos?.[0] ? (
                      <img
                        src={`http://localhost:3000${auction.land.photos[0]}`}
                        alt={auction.land.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        No photo
                      </div>
                    )}
                    {/* Status badge */}
                    <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[auction.status]}`}>
                      {auction.status === 'live' ? '● Live' : auction.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate mb-1">
                      {auction.land?.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      {auction.land?.location}, {auction.land?.state} · {auction.land?.area} {auction.land?.areaUnit} · {auction.land?.landType}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Current bid</p>
                        <p className="text-lg font-bold text-blue-600">
                          ₹{auction.currentPrice.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{auction.totalBids} bids</p>
                        <p className={`text-xs font-medium ${auction.status === 'live' ? 'text-green-600' : 'text-gray-500'}`}>
                          {auction.status === 'live'
                            ? timeLeft(auction.endTime)
                            : auction.status === 'upcoming'
                            ? `Starts ${new Date(auction.startTime).toLocaleDateString('en-IN')}`
                            : 'Ended'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}