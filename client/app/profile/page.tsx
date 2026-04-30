'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [detecting,      setDetecting]      = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [alertsEnabled,  setAlertsEnabled]  = useState(true);
  const [location,       setLocation]       = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [success,        setSuccess]        = useState('');
  const [error,          setError]          = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  const detectLocation = () => {
    setDetecting(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode using OpenStreetMap Nominatim (free)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          setLocation({ lat: latitude, lng: longitude, address });
        } catch {
          setLocation({ lat: latitude, lng: longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setError('Could not get your location. Please allow location access.');
        setDetecting(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!location) return setError('Please detect your location first.');
    setSaving(true);
    setError('');
    try {
      await api.put('/api/auth/location', {
        lat:     location.lat,
        lng:     location.lng,
        address: location.address
      });
      await api.put('/api/auth/location-alerts', { enabled: alertsEnabled });
      setSuccess('Location and alert preferences saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile settings</h1>

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Account details</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-24">Name</span>
              <span className="text-sm font-medium text-gray-800">{user.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-24">Email</span>
              <span className="text-sm text-gray-800">{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-24">Role</span>
              <span className="text-sm text-gray-800 capitalize">{user.role}</span>
            </div>
          </div>
        </div>

        {/* Location alerts — only for buyers */}
        {user.role === 'buyer' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-2">Location alerts</h2>
            <p className="text-sm text-gray-500 mb-6">
              Get notified by email when a new land listing is posted within 50km of your location.
            </p>

            {error   && <p className="text-red-600   text-sm mb-4 bg-red-50   px-3 py-2 rounded-lg">{error}</p>}
            {success && <p className="text-green-600 text-sm mb-4 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

            {/* Enable toggle */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">Enable location alerts</p>
                <p className="text-xs text-gray-500 mt-0.5">Receive email when land is listed near you</p>
              </div>
              <button
                onClick={() => setAlertsEnabled(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  alertsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  alertsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}/>
              </button>
            </div>

            {/* Location detection */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Your location</p>

              {location ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-lg">📍</span>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Location detected</p>
                      <p className="text-xs text-blue-600 mt-0.5 break-all">{location.address}</p>
                      <p className="text-xs text-blue-500 mt-1">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 text-center">
                  <p className="text-sm text-gray-500">No location set yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click below to detect your location</p>
                </div>
              )}

              <button
                onClick={detectLocation}
                disabled={detecting}
                className="w-full border border-blue-200 text-blue-700 bg-blue-50 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-100 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {detecting ? (
                  <><span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>Detecting location...</>
                ) : (
                  <>📍 {location ? 'Update my location' : 'Detect my location'}</>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Your browser will ask for location permission
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !location}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}