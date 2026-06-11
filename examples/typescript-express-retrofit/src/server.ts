import express, { Request, Response } from "express";

const QUOTA_LIMIT = 100;
const WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function take(apiKey: string, now: number): { allowed: boolean; remaining: number } {
  let bucket = buckets.get(apiKey);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(apiKey, bucket);
  }
  if (bucket.count >= QUOTA_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  bucket.count += 1;
  return { allowed: true, remaining: QUOTA_LIMIT - bucket.count };
}

const app = express();

app.post("/quota/:apiKey", (req: Request, res: Response) => {
  const apiKey = req.params.apiKey;
  if (!apiKey || apiKey.length < 8) {
    res.status(400).json({ error: "api key must be at least 8 characters" });
    return;
  }
  const result = take(apiKey, Date.now());
  if (!result.allowed) {
    res.status(429).json({ error: "quota exceeded", remaining: 0 });
    return;
  }
  res.status(200).json({ allowed: true, remaining: result.remaining });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`server listening on :${port}`);
});
