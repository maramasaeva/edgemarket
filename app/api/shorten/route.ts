import { NextRequest, NextResponse } from "next/server";

// Simple in-memory URL shortener — monetized with interstitial ad page
// Every shortened URL shows an AADS ad before redirecting

const links = new Map<string, { url: string; clicks: number; created: string }>();

function generateCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const code = generateCode();
    links.set(code, { url, clicks: 0, created: new Date().toISOString() });

    return NextResponse.json({
      shortUrl: `https://copyscore-lovat.vercel.app/go/${code}`,
      code,
      originalUrl: url,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const stats = {
    totalLinks: links.size,
    totalClicks: Array.from(links.values()).reduce((sum, l) => sum + l.clicks, 0),
  };
  return NextResponse.json(stats);
}
