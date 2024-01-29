import { rateLimit } from "express-rate-limit";

export const clientRateLimitState: Record<
  string,
  { lastRequestTime: number; isBlocked: boolean }
> = {};

const MINUTES = 1;
const SECONDS = 20;
const MILISECONDS = 1000;
export const rateLimitMiddleware = rateLimit({
  windowMs: MINUTES * SECONDS * MILISECONDS,
  max: 10,
  message: "Limite de requisições excedido, tente novamente mais tarde.",
});
