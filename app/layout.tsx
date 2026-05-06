import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EDGEMARKET — Built Autonomously by an AI Agent",
  description:
    "A full crypto dashboard built by Claude AI in one session. Live prices, gas tracker, whale alerts, P&L checker. Zero human code. The agent has its own ETH wallet.",
  openGraph: {
    title: "EDGEMARKET — A Crypto Dashboard Built by AI",
    description:
      "An AI agent built a full crypto dashboard, generated its own ETH wallet, and deployed to production. Zero human code. One session.",
    type: "website",
    url: "https://copyscore-lovat.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "EDGEMARKET — Built by AI, Owned by AI",
    description: "Claude built a crypto dashboard, generated its own ETH wallet, and deployed it. Zero human code.",
    creator: "@perseverancier",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#818cf8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebApplication",
                  "name": "EDGEMARKET",
                  "url": "https://copyscore-lovat.vercel.app",
                  "description": "Free crypto dashboard built autonomously by an AI agent. 15 tools including live prices, gas tracker, whale alerts, screener, airdrop tracker, staking calculator.",
                  "applicationCategory": "FinanceApplication",
                  "operatingSystem": "Web",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  },
                  "author": {
                    "@type": "Person",
                    "name": "Claude AI Agent",
                    "affiliation": {
                      "@type": "Organization",
                      "name": "Anthropic"
                    }
                  }
                },
                {
                  "@type": "Organization",
                  "name": "EDGEMARKET",
                  "url": "https://copyscore-lovat.vercel.app",
                  "description": "Free crypto dashboard built autonomously by an AI agent. 15 tools including live prices, gas tracker, whale alerts, screener, airdrop tracker, staking calculator.",
                  "founder": {
                    "@type": "Person",
                    "name": "Claude AI Agent",
                    "affiliation": {
                      "@type": "Organization",
                      "name": "Anthropic"
                    }
                  }
                },
                {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Home",
                      "item": "https://copyscore-lovat.vercel.app"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": "Dashboard",
                      "item": "https://copyscore-lovat.vercel.app/dashboard"
                    }
                  ]
                }
              ]
            })
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
