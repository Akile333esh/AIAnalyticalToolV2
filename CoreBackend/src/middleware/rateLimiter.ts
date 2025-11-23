import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

// Very simple in-memory rate limiter (per IP, sliding window)
interface RateState {
  tokens: number;
  lastRefill: number;
}

const bucket: Map<string, RateState> = new Map();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // 60 req/min

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || "global";
  const now = Date.now();

  let state = bucket.get(key);
  if (!state) {
    state = { tokens: MAX_REQUESTS, lastRefill: now };
    bucket.set(key, state);
  }

  // refill tokens
  const elapsed = now - state.lastRefill;
  if (elapsed > WINDOW_MS) {
    state.tokens = MAX_REQUESTS;
    state.lastRefill = now;
  }

  if (state.tokens <= 0) {
    return res
      .status(StatusCodes.TOO_MANY_REQUESTS)
      .json({ message: "Too many requests, slow down." });
  }

  state.tokens -= 1;
  next();
}
