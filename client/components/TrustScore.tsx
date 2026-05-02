'use client';

interface Props {
  score:     number;
  documents: {
    type:     string;
    verified: boolean;
  }[];
  compact?: boolean;
}

const DOC_LABELS: Record<string, string> = {
  patta:                   'Patta',
  encumbrance_certificate: 'Encumbrance Certificate',
  survey_record:           'Survey Record',
  sale_deed:               'Sale Deed',
  other:                   'Other Document'
};

const DOC_SCORES: Record<string, number> = {
  patta:                   30,
  encumbrance_certificate: 25,
  survey_record:           25,
  sale_deed:               15,
  other:                   5
};

export default function TrustScore({ score, documents, compact = false }: Props) {
  const getColor = (s: number) => {
    if (s >= 80) return { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  label: 'Highly verified' };
    if (s >= 50) return { bar: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'Partially verified' };
    if (s >= 20) return { bar: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Minimal documents' };
    return               { bar: 'bg-gray-300',  text: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',   label: 'No documents' };
  };

  const colors = getColor(score);

  if (compact) return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${colors.bg} ${colors.border} ${colors.text}`}>
      <span>{score >= 80 ? '✓' : score >= 50 ? '◑' : '○'}</span>
      Trust score: {score}/100
    </div>
  );

  const uploadedTypes = new Set(documents.map(d => d.type));

  return (
    <div className={`border rounded-2xl p-5 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-sm ${colors.text}`}>Document trust score</h3>
        <span className={`text-2xl font-bold ${colors.text}`}>{score}/100</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white rounded-full h-3 mb-2 border border-gray-100">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${colors.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className={`text-xs mb-4 ${colors.text}`}>{colors.label}</p>

      {/* Document checklist */}
      <div className="space-y-2">
        {Object.entries(DOC_LABELS).map(([type, label]) => {
          const uploaded = uploadedTypes.has(type);
          const verified = documents.find(d => d.type === type)?.verified;
          return (
            <div key={type} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${uploaded ? colors.text : 'text-gray-300'}`}>
                  {verified ? '✓' : uploaded ? '◑' : '○'}
                </span>
                <span className={`text-xs font-medium ${uploaded ? 'text-gray-800' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">+{DOC_SCORES[type]}</span>
                {verified && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Verified
                  </span>
                )}
                {uploaded && !verified && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    Uploaded
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}