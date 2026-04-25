const Groq = require('groq-sdk');

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const valuateLand = async ({ location, state, area, areaUnit, landType, facing, roadAccess, waterSource, electricity }) => {

  const prompt = `You are an expert Indian land valuation analyst with deep knowledge of real estate markets across all Indian states.

Estimate the fair market value for the following land:

- Location: ${location}, ${state}
- Area: ${area} ${areaUnit}
- Land type: ${landType}
- Facing: ${facing || 'not specified'}
- Road access: ${roadAccess ? 'Yes' : 'No'}
- Water source: ${waterSource ? 'Yes' : 'No'}
- Electricity: ${electricity ? 'Yes' : 'No'}

Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "minPrice": <number in INR>,
  "maxPrice": <number in INR>,
  "pricePerUnit": <number in INR per ${areaUnit}>,
  "confidence": "<low|medium|high>",
  "reasoning": "<2-3 sentences explaining the valuation>",
  "factors": {
    "positive": ["<factor1>", "<factor2>"],
    "negative": ["<factor1>", "<factor2>"]
  },
  "marketTrend": "<rising|stable|falling>",
  "disclaimer": "This is an AI estimate for reference only. Actual value may vary based on legal status, ground conditions, and current market."
}`;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',  // Free, powerful model on Groq
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.choices[0].message.content.trim();

  // Strip any markdown code fences if present
  const clean = text.replace(/```json|```/g, '').trim();
  const result = JSON.parse(clean);

  return result;
};

module.exports = { valuateLand };