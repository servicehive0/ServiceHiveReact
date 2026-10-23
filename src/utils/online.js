// A provider is "online" only when he switched it on AND his app pinged in the
// last 3 minutes. Before, is_online stayed true after the app was closed.
export const ONLINE_WINDOW_MS = 3 * 60 * 1000;

export const isOnlineNow = (profile) =>
  !!profile?.is_online &&
  !!profile?.last_seen_at &&
  Date.now() - new Date(profile.last_seen_at).getTime() < ONLINE_WINDOW_MS;
