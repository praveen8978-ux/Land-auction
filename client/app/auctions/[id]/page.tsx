'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import { useAuctionVoice } from '@/lib/useAuctionVoice';
import ConsortiumPanel from '@/components/ConsortiumPanel';

interface Bid {
  _id:      string;
  amount:   number;
  bidder:   { name: string };
  placedAt: string;
}

interface Auction {
  _id:           string;
  currentPrice:  number;
  startingPrice: number;
  startTime:     string;
  endTime:       string;
  status:        string;
  totalBids:     number;
  winner?:       { name: string };
  land: {
    title:         string;
    description:   string;
    location:      string;
    state:         string;
    area:          number;
    areaUnit:      string;
    landType:      string;
    facing?:       string;
    roadAccess:    boolean;
    waterSource:   boolean;
    electricity:   boolean;
    surveyNumber?: string;
    photos:        string[];
    seller:        { name: string; email: string };
  };
}

export default function AuctionDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const { user } = useAuth();
  const router   = useRouter();

  const [auction,      setAuction]      = useState<Auction | null>(null);
  const [bids,         setBids]         = useState<Bid[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [bidAmount,    setBidAmount]    = useState('');
  const [bidding,      setBidding]      = useState(false);
  const [bidError,     setBidError]     = useState('');
  const [bidSuccess,   setBidSuccess]   = useState('');
  const [timeLeft,     setTimeLeft]     = useState('');
  const [activePhoto,  setActivePhoto]  = useState(0);
  const [connected,    setConnected]    = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [newBidFlash,  setNewBidFlash]  = useState(false);

  const socketRef      = useRef<Socket | null>(null);
  const minutesLeftRef = useRef<number>(999);
  const auctionRef     = useRef<Auction | null>(null);

  const voice = useAuctionVoice({ enabled: voiceEnabled, rate: 0.88 });

  useEffect(() => {
    fetchAuction();
    return () => { voice.stop(); };
  }, [id]);

  // Keep auctionRef in sync for use inside socket callback
  useEffect(() => {
    auctionRef.current = auction;
  }, [auction]);

  useEffect(() => {
    if (!auction) return;

    const socket = io(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      { withCredentials: true }
    );
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinAuction', id);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('newBid', (data: any) => {
      setAuction(prev =>
        prev ? { ...prev, currentPrice: data.amount, totalBids: data.totalBids } : prev
      );
      setBids(prev => [{
        _id:      Date.now().toString(),
        amount:   data.amount,
        bidder:   { name: data.bidder },
        placedAt: data.timestamp
      }, ...prev].slice(0, 20));

      // Flash animation
      setNewBidFlash(true);
      setTimeout(() => setNewBidFlash(false), 1000);

      // Voice announcement
      voice.announceNewBid(data.amount, data.bidder, data.totalBids);
    });

    return () => { socket.disconnect(); };
  }, [auction?._id]);

  // Countdown timer with voice warnings
  useEffect(() => {
    if (!auction) return;

    const tick = () => {
      const diff = new Date(auction.endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Auction ended');
        voice.announceWarning(0);
        return;
      }

      const totalMinutes = Math.floor(diff / 60000);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (h > 0) setTimeLeft(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
      else       setTimeLeft(`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);

      // Trigger voice warnings at 5 min and 1 min
      if (totalMinutes !== minutesLeftRef.current) {
        minutesLeftRef.current = totalMinutes;
        voice.announceWarning(totalMinutes);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  const fetchAuction = async () => {
    try {
      const res = await api.get(`/api/auctions/${id}`);
      setAuction(res.data.auction);
      setBids(res.data.bids);

      // Announce auction is live when page loads
      if (res.data.auction.status === 'live') {
        setTimeout(() => {
          voice.announceAuctionStart(res.data.auction.land.title);
        }, 1000);
      }
    } catch {
      router.push('/auctions');
    } finally {
      setLoading(false);
    }
  };

  const handleBid = async () => {
    if (!user) return router.push('/login');
    if (!bidAmount) return setBidError('Please enter a bid amount.');
    setBidError('');
    setBidSuccess('');
    setBidding(true);
    try {
      await api.post(`/api/auctions/${id}/bid`, { amount: Number(bidAmount) });
      setBidSuccess(`Bid of ₹${Number(bidAmount).toLocaleString('en-IN')} placed!`);
      setBidAmount('');
      setTimeout(() => setBidSuccess(''), 3000);
    } catch (err: any) {
      setBidError(err.response?.data?.error || 'Failed to place bid.');
    } finally {
      setBidding(false);
    }
  };

  const suggestBid = (increment: number) => {
    if (!auction) return;
    setBidAmount((auction.currentPrice + increment).toString());
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading auction...</p>
    </div>
  );

  if (!auction) return null;

  const isLive  = auction.status === 'live';
  const isEnded = auction.status === 'ended';
  const canBid  = isLive && !!user && user.role === 'buyer';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">

        <Link href="/auctions" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
          ← All auctions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: land details ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Photos */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="h-72 bg-gray-100 relative">
                {auction.land.photos[activePhoto] ? (
                  <img
                    src={`http://localhost:3000${auction.land.photos[activePhoto]}`}
                    alt={auction.land.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    No photo
                  </div>
                )}
                {/* Live badge */}
                {isLive && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"/>
                    Live auction
                  </div>
                )}
              </div>
              {auction.land.photos.length > 1 && (
                <div className="flex gap-2 p-3">
                  {auction.land.photos.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhoto(i)}
                      className={`w-14 h-10 rounded-lg overflow-hidden border-2 ${i === activePhoto ? 'border-blue-500' : 'border-transparent'}`}
                    >
                      <img src={`http://localhost:3000${p}`} alt="" className="w-full h-full object-cover"/>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Land info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h1 className="text-xl font-bold text-gray-900 mb-4">{auction.land.title}</h1>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Location',   value: `${auction.land.location}, ${auction.land.state}` },
                  { label: 'Area',       value: `${auction.land.area} ${auction.land.areaUnit}`   },
                  { label: 'Land type',  value: auction.land.landType                              },
                  { label: 'Survey no.', value: auction.land.surveyNumber || 'N/A'                },
                  { label: 'Facing',     value: auction.land.facing        || 'N/A'                },
                  { label: 'Seller',     value: auction.land.seller?.name                          },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mb-5">
                {[
                  { label: 'Road access',  value: auction.land.roadAccess  },
                  { label: 'Water source', value: auction.land.waterSource  },
                  { label: 'Electricity',  value: auction.land.electricity  },
                ].map(a => (
                  <span key={a.label} className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                    a.value ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
                  }`}>
                    {a.value ? '✓' : '✗'} {a.label}
                  </span>
                ))}
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">{auction.land.description}</p>
            </div>
          </div>

          {/* ── Right: bidding panel ── */}
          <div className="space-y-5">

            {/* Price + timer */}
            <div className={`bg-white rounded-2xl border p-6 transition-all duration-500 ${
              newBidFlash ? 'border-blue-400 shadow-lg shadow-blue-100' : 'border-gray-100'
            }`}>

              {/* Voice toggle */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-400">Auctioneer voice</p>
                <button
                  onClick={() => {
                    setVoiceEnabled(v => !v);
                    if (voiceEnabled) voice.stop();
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    voiceEnabled
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <span>{voiceEnabled ? '🔊' : '🔇'}</span>
                  {voiceEnabled ? 'Voice on' : 'Voice off'}
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-1">Current highest bid</p>
              <p className={`text-3xl font-bold mb-1 transition-colors duration-500 ${
                newBidFlash ? 'text-green-600' : 'text-blue-600'
              }`}>
                ₹{auction.currentPrice.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Starting: ₹{auction.startingPrice.toLocaleString('en-IN')} · {auction.totalBids} bids
              </p>

              {/* Timer */}
              <div className={`text-center py-3 rounded-xl mb-4 ${
                isLive ? 'bg-green-50' : isEnded ? 'bg-gray-50' : 'bg-blue-50'
              }`}>
                <p className={`text-2xl font-bold tabular-nums ${
                  isLive   ? 'text-green-700' :
                  isEnded  ? 'text-gray-500'  : 'text-blue-700'
                }`}>
                  {isLive
                    ? timeLeft
                    : isEnded
                    ? 'Ended'
                    : `Starts ${new Date(auction.startTime).toLocaleDateString('en-IN')}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isLive ? 'Time remaining' : isEnded ? 'Auction closed' : 'Upcoming'}
                </p>
              </div>

              {/* Winner */}
              {isEnded && auction.winner && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-center">
                  <p className="text-xs text-yellow-700 font-semibold">Winner</p>
                  <p className="text-sm font-bold text-yellow-800">{auction.winner.name}</p>
                </div>
              )}

              {/* Bid form */}
              {canBid && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Quick bid increment</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[10000, 25000, 50000].map(inc => (
                      <button
                        key={inc}
                        onClick={() => suggestBid(inc)}
                        className="bg-blue-50 text-blue-700 text-xs font-semibold py-2 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        +₹{inc >= 100000 ? `${inc/100000}L` : `${inc/1000}K`}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleBid()}
                    placeholder={`Min ₹${(auction.currentPrice + 1).toLocaleString('en-IN')}`}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 mb-2"
                  />

                  {bidError && <p className="text-red-600 text-xs mb-2">{bidError}</p>}
                  {bidSuccess && <p className="text-green-600 text-xs mb-2">{bidSuccess}</p>}

                  <button
                    onClick={handleBid}
                    disabled={bidding}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {bidding ? 'Placing bid...' : 'Place bid'}
                  </button>
                </div>
              )}

              {!user && (
                <Link
                  href="/login"
                  className="block w-full text-center bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
                >
                  Login to bid
                </Link>
              )}

              {/* Connection status */}
              <div className="flex items-center gap-2 mt-3">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`}/>
                <p className="text-xs text-gray-400">
                  {connected ? 'Live updates connected' : 'Connecting...'}
                </p>
              </div>
            </div>

            {/* Bid history */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Bid history</h3>
              {bids.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">
                  No bids yet. Be the first!
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bids.map((bid, i) => (
                    <div
                      key={bid._id}
                      className={`flex items-center justify-between py-2 px-3 rounded-xl transition-colors ${
                        i === 0 ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          ₹{bid.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-gray-400">{bid.bidder?.name}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(bid.placedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Group bidding */}
            <ConsortiumPanel
              auctionId={auction._id}
              currentPrice={auction.currentPrice}
              user={user}
              isLive={isLive}
            />

          </div>
        </div>
      </main>
    </div>
  );
}