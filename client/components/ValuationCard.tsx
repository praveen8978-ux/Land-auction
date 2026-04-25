'use client';

interface ValuationResult {
  minPrice:     number;
  maxPrice:     number;
  pricePerUnit: number;
  confidence:   'low' | 'medium' | 'high';
  reasoning:    string;
  factors: {
    positive: string[];
    negative: string[];
  };
  marketTrend: 'rising' | 'stable' | 'falling';
  disclaimer:  string;
}

interface Props {
  valuation: ValuationResult;
  areaUnit:  string;
}

const confidenceColor = {
  low:    'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high:   'bg-green-50 text-green-700 border-green-200',
};

const trendIcon = {
  rising:  '↑',
  stable:  '→',
  falling: '↓',
};

const trendColor = {
  rising:  'text-green-600',
  stable:  'text-gray-500',
  falling: 'text-red-600',
};

export default function ValuationCard({ valuation, areaUnit }: Props) {
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mt-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <h3 className="font-semibold text-blue-900 text-sm">AI Market Valuation</h3>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${confidenceColor[valuation.confidence]}`}>
          {valuation.confidence} confidence
        </span>
      </div>

      {/* Price range */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <p className="text-xs text-gray-400 mb-1">Estimated market value range</p>
        <p className="text-2xl font-bold text-gray-900">
          {fmt(valuation.minPrice)}
          <span className="text-gray-400 font-normal mx-2">—</span>
          {fmt(valuation.maxPrice)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {fmt(valuation.pricePerUnit)} per {areaUnit} &nbsp;·&nbsp;
          <span className={`font-medium ${trendColor[valuation.marketTrend]}`}>
            {trendIcon[valuation.marketTrend]} Market {valuation.marketTrend}
          </span>
        </p>
      </div>

      {/* Reasoning */}
      <p className="text-sm text-blue-800 mb-4 leading-relaxed">{valuation.reasoning}</p>

      {/* Factors */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold text-green-700 mb-2">Positive factors</p>
          <ul className="space-y-1">
            {valuation.factors.positive.map((f, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                <span className="text-green-500 flex-shrink-0">+</span>{f}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-600 mb-2">Risk factors</p>
          <ul className="space-y-1">
            {valuation.factors.negative.map((f, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                <span className="text-red-400 flex-shrink-0">−</span>{f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-blue-600 italic border-t border-blue-200 pt-3">
        {valuation.disclaimer}
      </p>

    </div>
  );
}