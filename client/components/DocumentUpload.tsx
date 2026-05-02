'use client';

import { useState, ChangeEvent } from 'react';
import api from '@/lib/api';

interface Props {
  landId:   string;
  onUpload: (trustScore: number, documents: any[]) => void;
}

const DOC_TYPES = [
  { value: 'patta',                   label: 'Patta (Title Deed)',           score: 30 },
  { value: 'encumbrance_certificate', label: 'Encumbrance Certificate (EC)', score: 25 },
  { value: 'survey_record',           label: 'Survey Record',                score: 25 },
  { value: 'sale_deed',               label: 'Sale Deed',                    score: 15 },
  { value: 'other',                   label: 'Other Document',               score: 5  },
];

export default function DocumentUpload({ landId, onUpload }: Props) {
  const [docType,    setDocType]    = useState('');
  const [file,       setFile]       = useState<File | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const handleUpload = async () => {
    if (!docType) return setError('Please select document type.');
    if (!file)    return setError('Please select a file.');

    setError('');
    setUploading(true);

    try {
      const data = new FormData();
      data.append('document', file);
      data.append('docType',  docType);

      const res = await api.post(`/api/lands/${landId}/documents`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onUpload(res.data.trustScore, res.data.documents);
      setSuccess('Document uploaded successfully!');
      setDocType('');
      setFile(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-800 mb-1">Upload documents</h3>
      <p className="text-xs text-gray-400 mb-4">
        Upload land documents to increase your trust score. Accepted: PDF, JPG, PNG. Max 10MB.
      </p>

      {error   && <p className="text-red-600   text-xs mb-3 bg-red-50   px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-green-600 text-xs mb-3 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Document type</label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Select type</option>
            {DOC_TYPES.map(d => (
              <option key={d.value} value={d.value}>
                {d.label} (+{d.score} points)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">File</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setFile(e.target.files?.[0] || null);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || !docType || !file}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload document'}
        </button>
      </div>
    </div>
  );
}