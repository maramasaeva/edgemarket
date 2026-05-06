import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://copyscore-lovat.vercel.app";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${base}/gas`, lastModified: new Date(), changeFrequency: "always", priority: 0.8 },
    { url: `${base}/convert`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/agents`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/tip`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/whales`, lastModified: new Date(), changeFrequency: "always", priority: 0.8 },
    { url: `${base}/pnl`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/story`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/screener`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/airdrops`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/dominance`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/staking`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/il`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/api-docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/safety`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/halving`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/yields`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/fear-greed`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/dca`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/rainbow`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/shorten`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/tax`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/exchanges`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/portfolio`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/mining`, lastModified: new Date(), changeFrequency: "always", priority: 0.8 },
    { url: `${base}/faucets`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/donate`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/pro`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/heatmap`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/liquidations`, lastModified: new Date(), changeFrequency: "always", priority: 0.9 },
    { url: `${base}/altseason`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/revenue`, lastModified: new Date(), changeFrequency: "always", priority: 0.9 },
  ];
}
