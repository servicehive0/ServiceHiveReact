import { supabase } from './supabaseClient';

// Fire-and-forget notification insert. Failures are swallowed — a failed
// notification must never block the real action (bid, accept, complete,
// chat) it's attached to. bidId/requestId let a tapped notification deep-link
// straight to the relevant chat/request instead of just sitting there inert.
export const notify = async (userId, title, body, type = 'system', { bidId, requestId } = {}) => {
  if (!userId) return;
  try {
    await supabase.from('notifications').insert({
      user_id: userId, title, body, type,
      ...(bidId ? { bid_id: bidId } : {}),
      ...(requestId ? { request_id: requestId } : {}),
    });
  } catch { /* best-effort */ }
};
