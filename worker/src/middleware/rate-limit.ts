// middleware/rate-limit.ts
export const rateLimitMiddleware = async (c: any, next: any) => {
  // Get the userId that was extracted by your unifiedAuthMiddleware
  const userId = c.get('userId');

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Ask the Cloudflare Edge if this specific user has exceeded their velocity
  const { success } = await c.env.RATE_LIMITER.limit({ key: userId });

  if (!success) {
    return c.json({ 
      error: "Rate limit exceeded.", 
      message: "You are scanning too fast. Please wait a moment." 
    }, 429);
  }

  return next();
};
