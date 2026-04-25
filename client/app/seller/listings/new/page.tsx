'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import ValuationCard from '@/components/ValuationCard';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal'
];

export default function NewListingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title:         '',
    description:   '',
    location:      '',
    state:         '',
    area:          '',
    areaUnit:      'acres',
    surveyNumber:  '',
    landType:      '',
    startingPrice: '',
    facing:        '',
    roadAccess:    false,
    waterSource:   false,
    electricity:   false,
  });

  const [photos,         setPhotos]         = useState<File[]>([]);
  const [previews,       setPreviews]       = useState<string[]>([]);
  const [error,          setError]          = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [success,        setSuccess]        = useState(false);
  const [valuation,      setValuation]      = useState<any>(null);
  const [valuating,      setValuating]      = useState<boolean>(false);
  const [valuationError, setValuationError] = useState<string>('');

  useEffect(() => {
    if (!loading && !user)                  router.push('/login');
    if (!loading && user?.role === 'buyer') router.push('/dashboard');
    if (!loading && user?.role === 'seller') {
    const paid = sessionStorage.getItem('listingFeePaid');
    if (!paid) {
      router.push('/seller/pay');
    }
  }
  }, [user, loading, router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handlePhotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 6)
      return setError('Maximum 6 photos allowed.');
    setPhotos(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
    setError('');
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleValuate = async () => {
    if (!formData.location || !formData.state || !formData.area || !formData.landType) {
      return setValuationError('Please fill in location, state, area and land type first.');
    }
    setValuating(true);
    setValuationError('');
    setValuation(null);

    try {
      const res = await api.post('/api/lands/valuate', {
        location:    formData.location,
        state:       formData.state,
        area:        formData.area,
        areaUnit:    formData.areaUnit,
        landType:    formData.landType,
        facing:      formData.facing,
        roadAccess:  formData.roadAccess,
        waterSource: formData.waterSource,
        electricity: formData.electricity,
      });
      setValuation(res.data.valuation);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setValuationError(axiosErr.response?.data?.error || 'Valuation failed.');
      } else {
        setValuationError('Valuation failed. Please try again.');
      }
    } finally {
      setValuating(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.location || !formData.state ||
        !formData.area  || !formData.landType  || !formData.startingPrice) {
      return setError('Please fill in all required fields.');
    }
    if (photos.length === 0)
      return setError('Please upload at least one photo.');

    setSubmitting(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        data.append(key, val.toString());
      });
      photos.forEach(photo => data.append('photos', photo));
      // Attach payment UTR
      const utr = sessionStorage.getItem('listingFeeUTR');
      if (utr) data.append('listingFeeUTR', utr);

      if (valuation) {
        data.append('valuationMin',          valuation.minPrice.toString());
        data.append('valuationMax',          valuation.maxPrice.toString());
        data.append('valuationPricePerUnit', valuation.pricePerUnit.toString());
        data.append('valuationConfidence',   valuation.confidence);
        data.append('valuationReasoning',    valuation.reasoning);
        data.append('valuationTrend',        valuation.marketTrend);
      }

      await api.post('/api/lands', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
      setSuccess(true);
      // Clear payment session after successful listing
      sessionStorage.removeItem('listingFeePaid');
      sessionStorage.removeItem('listingFeeUTR');
      sessionStorage.removeItem('listingFeePaidAt');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Failed to submit listing.');
      } else {
        setError('Failed to submit listing. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-10">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing submitted!</h2>
          <p className="text-gray-500 mb-8">
            Your land listing is under review. Our admin team will approve it shortly and it will go live for auction.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/seller/listings"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700">
              My listings
            </Link>
            <Link href="/dashboard"
              className="border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-50">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">

        <div className="mb-8">
          <Link href="/seller/listings" className="text-sm text-blue-600 hover:underline">
            ← My listings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">List your land</h1>
          <p className="text-gray-500 text-sm mt-1">
            Fill in the details below. Your listing will be reviewed before going live.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Basic details ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-5">Basic details</h2>
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Listing title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="title" value={formData.title}
                  onChange={handleChange} required
                  placeholder="e.g. 5 Acre Agricultural Land in Krishna District"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description" value={formData.description}
                  onChange={handleChange} required rows={4}
                  placeholder="Describe the land — soil type, nearby landmarks, access road, legal status..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Land type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="landType" value={formData.landType}
                    onChange={handleChange} required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Select type</option>
                    <option value="agricultural">Agricultural</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="forest">Forest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Survey number</label>
                  <input
                    type="text" name="surveyNumber" value={formData.surveyNumber}
                    onChange={handleChange}
                    placeholder="e.g. 123/4A"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ── Location ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-5">Location</h2>
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="state" value={formData.state}
                    onChange={handleChange} required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Village / Mandal / District <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" name="location" value={formData.location}
                    onChange={handleChange} required
                    placeholder="e.g. Nandyal, Kurnool"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facing direction</label>
                <select
                  name="facing" value={formData.facing}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select facing</option>
                  <option value="north">North</option>
                  <option value="south">South</option>
                  <option value="east">East</option>
                  <option value="west">West</option>
                  <option value="northeast">North East</option>
                  <option value="northwest">North West</option>
                  <option value="southeast">South East</option>
                  <option value="southwest">South West</option>
                </select>
              </div>

            </div>
          </div>

          {/* ── Area and Price ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-5">Area and price</h2>
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" name="area" value={formData.area}
                    onChange={handleChange} required min="0.01" step="0.01"
                    placeholder="e.g. 5"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    name="areaUnit" value={formData.areaUnit}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="acres">Acres</option>
                    <option value="cents">Cents</option>
                    <option value="sq_yards">Sq. Yards</option>
                    <option value="sq_feet">Sq. Feet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starting auction price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" name="startingPrice" value={formData.startingPrice}
                  onChange={handleChange} required min="1"
                  placeholder="e.g. 2500000"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
                {formData.startingPrice && (
                  <p className="text-xs text-gray-400 mt-1">
                    ₹ {Number(formData.startingPrice).toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              {/* ── AI Valuation ── */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">AI Market Valuation</p>
                    <p className="text-xs text-gray-400">
                      Get an AI estimate based on your land details
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleValuate}
                    disabled={valuating}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {valuating ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"/>
                        Analysing...
                      </>
                    ) : (
                      'Get AI estimate'
                    )}
                  </button>
                </div>

                {valuationError && (
                  <p className="text-red-600 text-xs mt-2">{valuationError}</p>
                )}

                {valuation && (
                  <ValuationCard valuation={valuation} areaUnit={formData.areaUnit} />
                )}
              </div>

            </div>
          </div>

          {/* ── Amenities ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-5">Amenities</h2>
            <div className="grid grid-cols-3 gap-4">

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox" name="roadAccess"
                  checked={formData.roadAccess}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Road access</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox" name="waterSource"
                  checked={formData.waterSource}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Water source</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox" name="electricity"
                  checked={formData.electricity}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Electricity</span>
              </label>

            </div>
          </div>

          {/* ── Photos ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Photos</h2>
            <p className="text-xs text-gray-400 mb-5">
              Upload up to 6 photos. JPG, PNG or WEBP. Max 5MB each.
            </p>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square">
                    <img
                      src={src} alt={`Preview ${i + 1}`}
                      className="w-full h-full object-cover rounded-xl border border-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 6 && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <p className="text-sm text-gray-500">Click to upload photos</p>
                <p className="text-xs text-gray-400 mt-1">{6 - photos.length} remaining</p>
                <input
                  type="file" multiple accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotos} className="hidden"
                />
              </label>
            )}
          </div>

          {/* ── Submit ── */}
          <button
            type="submit" disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-base"
          >
            {submitting ? 'Submitting...' : 'Submit listing for review'}
          </button>

        </form>
      </main>
    </div>
  );
}