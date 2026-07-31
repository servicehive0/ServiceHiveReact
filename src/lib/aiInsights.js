// AI/ML advisory features, two kinds:
//  1. LLM-based (rankAndScoreBids, assessCancellationRisk, analyzeSentiment,
//     predictDemand) — reason over real Supabase data via the Groq
//     chat-completions API already used by AiServiceFinderModal etc.
//  2. Trained-model-based (rankAndScoreBidsML) — calls our own scikit-learn
//     model (see Service-Hive-ML/train.py + app.py), a real classifier we trained
//     ourselves rather than an LLM call.
// Every caller must treat a null/failed result as "no insight available" and
// keep the underlying screen fully functional without it.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// Our own trained model (scikit-learn Logistic Regression, see
// Service-Hive-ML/train.py), served over HTTP by Service-Hive-ML/app.py. Point this at
// the deployed Render URL once live; defaults to the local dev server.
const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://127.0.0.1:8001';

async function callGroq(systemPrompt, userPrompt, { maxTokens = 500, temperature = 0.2 } = {}) {
  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content || '';
  const s = content.indexOf('{');
  const e = content.lastIndexOf('}');
  const sArr = content.indexOf('[');
  const eArr = content.lastIndexOf(']');
  // Some prompts return a top-level array rather than an object — use
  // whichever bracket pair actually wraps the whole response.
  if (sArr !== -1 && (s === -1 || sArr < s)) {
    return JSON.parse(content.slice(sArr, eArr + 1));
  }
  if (s === -1) return null;
  return JSON.parse(content.slice(s, e + 1));
}

// Haversine distance in km between two lat/lng points.
export function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v == null)) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ranks bids on a request and scores each bid's likely job-success chance.
// `bids` items should be enriched with a `distanceKm` and provider stats
// (rating, totalJobs, experience) by the caller before invoking this.
export async function rankAndScoreBids(request, bids) {
  if (!bids?.length) return null;
  try {
    const payload = bids.map(b => ({
      bid_id: b.id,
      provider_name: b.provider_name,
      price: b.price,
      message: b.message,
      rating: b.rating ?? null,
      total_jobs: b.total_jobs ?? null,
      experience: b.experience ?? null,
      distance_km: b.distanceKm != null ? Math.round(b.distanceKm * 10) / 10 : null,
    }));
    const result = await callGroq(
      'You are a service-marketplace ranking assistant. Given a customer job and a list of provider bids, rank the bids best-to-worst and give each a job-success likelihood percentage (0-100). Consider rating, experience, distance (closer is better), total completed jobs (more is better, signals reliability), price fairness, and how well the bid message addresses the job. Respond ONLY with a JSON array, one object per bid, no extra text: [{"bid_id":"...","rank":1,"success_score":87,"reason":"short reason"}]',
      `Job: "${request.service_name}" — ${request.description}\nLocation: ${request.area}, ${request.city}\n\nBids:\n${JSON.stringify(payload)}`,
      { maxTokens: 700 },
    );
    if (!Array.isArray(result)) return null;
    const byId = {};
    result.forEach(r => { if (r?.bid_id) byId[r.bid_id] = r; });
    return byId;
  } catch {
    return null;
  }
}

// Same ranking task as rankAndScoreBids above, but scored by OUR OWN
// trained model (Service-Hive-ML/) instead of an LLM call — a real scikit-learn
// classifier trained on (rating, total_jobs, experience, distance, relative
// price) -> accepted/rejected. Returns the identical {bid_id: {success_score,
// rank}} shape so callers can swap between the two with a one-line change.
export async function rankAndScoreBidsML(request, bids) {
  if (!bids?.length) return null;
  try {
    const payload = {
      bids: bids.map(b => ({
        bid_id: b.id,
        price: b.price,
        rating: b.rating ?? null,
        total_jobs: b.total_jobs ?? null,
        experience: b.experience ?? null,
        distance_km: b.distanceKm ?? null,
      })),
    };
    const resp = await fetch(`${ML_SERVICE_URL}/rank-bids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) return null;
    const result = await resp.json();
    if (!Array.isArray(result)) return null;
    const byId = {};
    result.forEach(r => { if (r?.bid_id) byId[r.bid_id] = r; });
    return byId;
  } catch {
    return null;
  }
}

// Assesses cancellation risk for a provider's in-flight jobs.
export async function assessCancellationRisk(jobs) {
  if (!jobs?.length) return null;
  try {
    const payload = jobs.map(j => ({
      job_id: j.id,
      status: j.status,
      hours_since_accepted: j.hoursSinceAccepted ?? null,
      price: j.agreedPrice ?? null,
      provider_total_jobs: j.providerTotalJobs ?? null,
      otp_verified: j.otp_verified ?? false,
    }));
    const result = await callGroq(
      'You are a booking risk assistant for a home-services marketplace. Given a list of active jobs (accepted or in-progress), estimate the cancellation risk for each as "low", "medium", or "high". A job accepted long ago with no OTP verification (work hasn\'t started) is riskier; a job with recent progress is safer. Respond ONLY with a JSON array: [{"job_id":"...","risk":"low|medium|high","reason":"short reason"}]',
      JSON.stringify(payload),
      { maxTokens: 500 },
    );
    if (!Array.isArray(result)) return null;
    const byId = {};
    result.forEach(r => { if (r?.job_id) byId[r.job_id] = r; });
    return byId;
  } catch {
    return null;
  }
}

// Same task as assessCancellationRisk above, but classified by OUR OWN
// trained model (class-balanced Logistic Regression, see
// Service-Hive-ML/train_risk.py) instead of an LLM call. `jobs` items:
// {id, hoursSinceAccepted, otp_verified, providerTotalJobs, agreedPrice,
// providerAvgPrice?}. Returns the identical {job_id: {risk}} shape.
export async function assessCancellationRiskML(jobs) {
  if (!jobs?.length) return null;
  try {
    const payload = {
      jobs: jobs.map(j => ({
        job_id: j.id,
        hours_since_accepted: j.hoursSinceAccepted ?? null,
        otp_verified: j.otp_verified ?? false,
        provider_total_jobs: j.providerTotalJobs ?? null,
        price: j.agreedPrice ?? null,
        provider_avg_price: j.providerAvgPrice ?? null,
      })),
    };
    const resp = await fetch(`${ML_SERVICE_URL}/assess-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// Classifies a batch of review texts as Positive/Neutral/Negative.
export async function analyzeSentiment(reviews) {
  if (!reviews?.length) return null;
  try {
    const payload = reviews.map(r => ({ id: r.id, text: r.review }));
    const result = await callGroq(
      'You classify customer reviews for a home-services app as exactly one of "Positive", "Neutral", or "Negative". Reviews may be in English, Urdu, or Roman Urdu. Respond ONLY with a JSON array: [{"id":"...","sentiment":"Positive|Neutral|Negative"}]',
      JSON.stringify(payload),
      { maxTokens: Math.min(2000, 60 * reviews.length + 200) },
    );
    if (!Array.isArray(result)) return null;
    const byId = {};
    result.forEach(r => { if (r?.id) byId[r.id] = r.sentiment; });
    return byId;
  } catch {
    return null;
  }
}

// Same task as analyzeSentiment above, but classified by OUR OWN trained
// NLP model (TF-IDF + Naive Bayes, see Service-Hive-ML/train_sentiment.py)
// instead of an LLM call. Returns the identical {id: sentiment} shape.
export async function analyzeSentimentML(reviews) {
  if (!reviews?.length) return null;
  try {
    const payload = { reviews: reviews.map(r => ({ id: r.id, review: r.review })) };
    const resp = await fetch(`${ML_SERVICE_URL}/analyze-sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// Predicts an expected star rating (1.0-5.0) for providers who don't have
// enough real reviews yet, from their track record — OUR OWN trained
// regression model (see Service-Hive-ML/train_rating.py), not an LLM call.
// `providers` items: { provider_id, total_jobs, experience_years,
// avg_response_minutes, cancellations }. Returns { provider_id: predicted_rating }.
export async function predictProviderRatingML(providers) {
  if (!providers?.length) return null;
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/predict-rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers }),
    });
    if (!resp.ok) return null;
    const result = await resp.json();
    if (!Array.isArray(result)) return null;
    const byId = {};
    result.forEach(r => { if (r?.provider_id) byId[r.provider_id] = r.predicted_rating; });
    return byId;
  } catch {
    return null;
  }
}

// Predicts a fair PKR price range for a job from its service type, city,
// and complexity — OUR OWN trained regression model (One-Hot-Encoding +
// Random Forest, see Service-Hive-ML/train_price.py), not an LLM call.
// Returns { min_price, max_price } or null on failure.
export async function predictPriceML(serviceType, city, complexity = 3) {
  if (!serviceType) return null;
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/predict-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: [{ query_id: 'q1', service_type: serviceType, city, complexity }] }),
    });
    if (!resp.ok) return null;
    const result = await resp.json();
    if (!Array.isArray(result) || !result[0]) return null;
    return { min_price: result[0].min_price, max_price: result[0].max_price };
  } catch {
    return null;
  }
}

// Given historical requests grouped by (city, area, service), predicts
// which combos are likely to see rising demand.
export async function predictDemand(grouped) {
  if (!grouped?.length) return null;
  try {
    const result = await callGroq(
      'You are a demand-forecasting assistant for a home-services marketplace. Given historical request counts grouped by area and service type (with recent vs older counts), identify the top trending (area, service) combinations likely to see high demand soon. Respond ONLY with a JSON array, at most 6 items, ranked most-important first: [{"area":"...","service":"...","trend":"rising|steady|falling","insight":"one short actionable sentence"}]',
      JSON.stringify(grouped),
      { maxTokens: 600 },
    );
    return Array.isArray(result) ? result : null;
  } catch {
    return null;
  }
}

// Same task as predictDemand above, but classified by OUR OWN trained
// model (Logistic Regression, see Service-Hive-ML/train_demand.py)
// instead of an LLM call. `grouped` items: {city, area, service,
// recent_count, older_count}. Returns the identical
// [{city, area, service, trend, ...}] shape (ranked, top 6).
export async function predictDemandML(grouped) {
  if (!grouped?.length) return null;
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/predict-demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups: grouped }),
    });
    if (!resp.ok) return null;
    const result = await resp.json();
    return Array.isArray(result) ? result : null;
  } catch {
    return null;
  }
}
