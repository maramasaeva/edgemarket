"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface CoinOption {
  id: string;
  symbol: string;
  name: string;
  coingeckoId: string;
  defaultApy: number;
}

const COINS: CoinOption[] = [
  { id: "eth", symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", defaultApy: 3.5 },
  { id: "sol", symbol: "SOL", name: "Solana", coingeckoId: "solana", defaultApy: 7 },
  { id: "ada", symbol: "ADA", name: "Cardano", coingeckoId: "cardano", defaultApy: 4.5 },
  { id: "dot", symbol: "DOT", name: "Polkadot", coingeckoId: "polkadot", defaultApy: 14 },
  { id: "atom", symbol: "ATOM", name: "Cosmos", coingeckoId: "cosmos", defaultApy: 18 },
  { id: "matic", symbol: "MATIC", name: "Polygon", coingeckoId: "matic-network", defaultApy: 5 },
];

function fmtUsd(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function fmtCrypto(n: number, symbol: string): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(4)}M ${symbol}`;
  if (n >= 1000) return `${n.toFixed(4)} ${symbol}`;
  if (n >= 1) return `${n.toFixed(6)} ${symbol}`;
  return `${n.toFixed(8)} ${symbol}`;
}

export default function StakingPage() {
  const [selectedCoin, setSelectedCoin] = useState<string>("eth");
  const [amount, setAmount] = useState<string>("1");
  const [apy, setApy] = useState<string>("3.5");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceLoading, setPriceLoading] = useState(true);

  const coin = COINS.find((c) => c.id === selectedCoin)!;
  const numAmount = parseFloat(amount) || 0;
  const numApy = parseFloat(apy) || 0;
  const price = prices[coin.coingeckoId] || 0;

  // Simple interest
  const yearlySimple = numAmount * (numApy / 100);
  const monthlySimple = yearlySimple / 12;
  const weeklySimple = yearlySimple / 52;
  const dailySimple = yearlySimple / 365;

  // Compound interest (daily compounding)
  const dailyRate = numApy / 100 / 365;
  const yearlyCompound = numAmount * (Math.pow(1 + dailyRate, 365) - 1);
  const monthlyCompound = numAmount * (Math.pow(1 + dailyRate, 30) - 1);
  const weeklyCompound = numAmount * (Math.pow(1 + dailyRate, 7) - 1);
  const dailyCompound = numAmount * dailyRate;

  const compoundAdvantage = yearlyCompound - yearlySimple;

  const fetchPrices = useCallback(async () => {
    try {
      const ids = COINS.map((c) => c.coingeckoId).join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, number> = {};
        for (const [id, val] of Object.entries(data)) {
          map[id] = (val as { usd: number }).usd;
        }
        setPrices(map);
      }
    } catch {
      // silently fail — prices just won't show
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const handleCoinChange = (coinId: string) => {
    setSelectedCoin(coinId);
    const newCoin = COINS.find((c) => c.id === coinId);
    if (newCoin) setApy(newCoin.defaultApy.toString());
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}body{background:#07070a}
        ::selection{background:#6366f1;color:white}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        a{color:#818cf8;text-decoration:none}a:hover{text-decoration:underline}
        .stk-input{width:100%;padding:12px 16px;background:#07070a;border:1px solid #1a1a2e;border-radius:8px;color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:16px;outline:none;transition:border-color .15s}
        .stk-input:focus{border-color:#818cf8}
        .stk-input::placeholder{color:#334155}
        .stk-select{width:100%;padding:12px 16px;background:#07070a;border:1px solid #1a1a2e;border-radius:8px;color:#e2e8f0;font-family:'Inter',sans-serif;font-size:14px;cursor:pointer;appearance:none;outline:none;transition:border-color .15s}
        .stk-select:focus{border-color:#818cf8}
        .stat-card{background:#0d0d14;border:1px solid #1a1a2e;border-radius:12px;padding:16px 20px}
        .stat-label{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
        .stat-val{font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace}
        .nav-link{font-size:11px;color:#475569;font-family:'JetBrains Mono',monospace;text-decoration:none;padding:4px 8px;border-radius:4px;border:1px solid #1a1a2e;transition:all .15s}
        .nav-link:hover{border-color:#818cf8;color:#818cf8;text-decoration:none}
        @media(max-width:640px){
          .stat-val{font-size:15px}
          .stat-card{padding:12px}
          .rewards-grid{grid-template-columns:1fr!important}
          .comparison-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      <header style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.04em" }}>
            EDGE<span style={{ color: "#818cf8" }}>MARKET</span>
          </Link>
          <span style={{ color: "#1e293b" }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Staking Calculator</span>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
            boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite",
          }} />
        </div>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
          estimate your staking rewards. compare simple vs compound interest. live prices from coingecko.
          <br />
          <span style={{ fontSize: 11, color: "#334155" }}>
            APY rates are typical estimates and vary by validator/protocol. NFA. DYOR.
          </span>
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/" className="nav-link">Dashboard</Link>
          <Link href="/convert" className="nav-link">Convert</Link>
          <Link href="/gas" className="nav-link">Gas</Link>
          <Link href="/pnl" className="nav-link">P&L</Link>
          <Link href="/whales" className="nav-link">Whales</Link>
          <Link href="/il" className="nav-link" style={{ color: "#818cf8", borderColor: "#818cf833" }}>IL Calc</Link>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Input Section */}
        <div style={{
          background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16,
          padding: 24, marginBottom: 24,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {/* Amount */}
            <div>
              <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                AMOUNT
              </label>
              <input
                className="stk-input"
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="1.0"
              />
              {price > 0 && numAmount > 0 && (
                <div style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                  {fmtUsd(numAmount * price)} USD
                </div>
              )}
            </div>

            {/* Coin Selector */}
            <div>
              <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                COIN
              </label>
              <select
                className="stk-select"
                value={selectedCoin}
                onChange={(e) => handleCoinChange(e.target.value)}
              >
                {COINS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.symbol} - {c.name}
                  </option>
                ))}
              </select>
              {price > 0 && (
                <div style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                  {fmtUsd(price)} / {coin.symbol}
                </div>
              )}
            </div>

            {/* APY */}
            <div>
              <label style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                APY %
              </label>
              <input
                className="stk-input"
                type="text"
                value={apy}
                onChange={(e) => setApy(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="3.5"
              />
              <div style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                typical: {coin.defaultApy}%
              </div>
            </div>
          </div>

          {/* Quick APY selectors */}
          <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#334155", alignSelf: "center", marginRight: 4 }}>QUICK:</span>
            {COINS.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCoinChange(c.id)}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
                  border: `1px solid ${selectedCoin === c.id ? "#818cf8" : "#1a1a2e"}`,
                  background: selectedCoin === c.id ? "#818cf815" : "transparent",
                  color: selectedCoin === c.id ? "#818cf8" : "#475569",
                  transition: "all .15s",
                }}
              >
                {c.symbol} {c.defaultApy}%
              </button>
            ))}
          </div>
        </div>

        {/* Rewards Breakdown */}
        {numAmount > 0 && numApy > 0 && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {/* Simple Interest Rewards */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12, textTransform: "uppercase" }}>
                Simple Interest Rewards
              </div>
              <div className="rewards-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Daily", value: dailySimple },
                  { label: "Weekly", value: weeklySimple },
                  { label: "Monthly", value: monthlySimple },
                  { label: "Yearly", value: yearlySimple },
                ].map((item) => (
                  <div key={item.label} className="stat-card">
                    <div className="stat-label">{item.label}</div>
                    <div className="stat-val" style={{ color: "#22c55e", fontSize: 16 }}>
                      +{item.value < 0.0001 ? item.value.toExponential(2) : item.value.toFixed(item.value >= 1 ? 4 : 6)}
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                      {coin.symbol}
                    </div>
                    {price > 0 && (
                      <div style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                        {fmtUsd(item.value * price)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Compound Interest Rewards */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12, textTransform: "uppercase" }}>
                Compound Interest (Daily Compounding)
              </div>
              <div className="rewards-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Daily", value: dailyCompound },
                  { label: "Weekly", value: weeklyCompound },
                  { label: "Monthly", value: monthlyCompound },
                  { label: "Yearly", value: yearlyCompound },
                ].map((item) => (
                  <div key={item.label} className="stat-card">
                    <div className="stat-label">{item.label}</div>
                    <div className="stat-val" style={{ color: "#818cf8", fontSize: 16 }}>
                      +{item.value < 0.0001 ? item.value.toExponential(2) : item.value.toFixed(item.value >= 1 ? 4 : 6)}
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                      {coin.symbol}
                    </div>
                    {price > 0 && (
                      <div style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                        {fmtUsd(item.value * price)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Compound vs Simple Comparison */}
            <div style={{
              background: "#0d0d14", border: "1px solid #1a1a2e", borderRadius: 16,
              padding: 24, marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16, textTransform: "uppercase" }}>
                Compound vs Simple (1 Year)
              </div>

              <div className="comparison-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {/* Simple */}
                <div style={{
                  padding: 16, background: "#07070a", borderRadius: 12,
                  border: "1px solid #111118", textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 8 }}>
                    SIMPLE
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#22c55e" }}>
                    {yearlySimple >= 1 ? yearlySimple.toFixed(4) : yearlySimple.toFixed(6)}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{coin.symbol}</div>
                  {price > 0 && (
                    <div style={{ fontSize: 13, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                      {fmtUsd(yearlySimple * price)}
                    </div>
                  )}
                </div>

                {/* Compound */}
                <div style={{
                  padding: 16, background: "#07070a", borderRadius: 12,
                  border: "1px solid #818cf833", textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, color: "#818cf8", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 8 }}>
                    COMPOUND
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#818cf8" }}>
                    {yearlyCompound >= 1 ? yearlyCompound.toFixed(4) : yearlyCompound.toFixed(6)}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{coin.symbol}</div>
                  {price > 0 && (
                    <div style={{ fontSize: 13, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                      {fmtUsd(yearlyCompound * price)}
                    </div>
                  )}
                </div>

                {/* Advantage */}
                <div style={{
                  padding: 16, background: "#07070a", borderRadius: 12,
                  border: "1px solid #111118", textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 8 }}>
                    COMPOUND BONUS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#f59e0b" }}>
                    +{compoundAdvantage >= 1 ? compoundAdvantage.toFixed(4) : compoundAdvantage.toFixed(6)}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{coin.symbol} extra</div>
                  {price > 0 && (
                    <div style={{ fontSize: 13, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                      +{fmtUsd(compoundAdvantage * price)}
                    </div>
                  )}
                </div>
              </div>

              {/* Visual bar comparison */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "#475569", width: 70, fontFamily: "'JetBrains Mono', monospace" }}>SIMPLE</span>
                  <div style={{ flex: 1, height: 24, background: "#111118", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                    <div style={{
                      width: `${yearlyCompound > 0 ? (yearlySimple / yearlyCompound) * 100 : 0}%`,
                      height: "100%", background: "#22c55e", borderRadius: 6,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 10, color: "#818cf8", width: 70, fontFamily: "'JetBrains Mono', monospace" }}>COMPOUND</span>
                  <div style={{ flex: 1, height: 24, background: "#111118", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                    <div style={{
                      width: "100%",
                      height: "100%", background: "linear-gradient(90deg, #818cf8, #6366f1)", borderRadius: 6,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Value After 1 Year */}
            <div style={{
              background: "linear-gradient(135deg, #0d0d14 0%, #12101f 50%, #0d0d14 100%)",
              border: "1px solid #1a1a2e", borderRadius: 16, padding: 24, textAlign: "center",
              position: "relative", overflow: "hidden", marginBottom: 24,
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 1,
                background: "linear-gradient(90deg, transparent, #818cf844, transparent)",
              }} />
              <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 8 }}>
                TOTAL VALUE AFTER 1 YEAR (COMPOUND)
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>
                {(numAmount + yearlyCompound).toFixed(4)} <span style={{ fontSize: 16, color: "#475569" }}>{coin.symbol}</span>
              </div>
              {price > 0 && (
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#818cf8", marginTop: 4 }}>
                  {fmtUsd((numAmount + yearlyCompound) * price)}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
                {numAmount} {coin.symbol} principal + {yearlyCompound.toFixed(6)} {coin.symbol} rewards
              </div>
            </div>

            {/* Price status */}
            <div style={{ textAlign: "center", fontSize: 10, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace" }}>
              {priceLoading ? "fetching prices..." : price > 0 ? `${coin.symbol} = ${fmtUsd(price)} // live from coingecko` : "prices unavailable // rewards shown in crypto only"}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(numAmount <= 0 || numApy <= 0) && (
          <div style={{
            textAlign: "center", padding: 48, color: "#334155", fontSize: 14,
          }}>
            enter an amount and APY to calculate staking rewards
          </div>
        )}

        {/* AADS ad unit */}
        <div style={{ width: "100%", margin: "24px auto", position: "relative", zIndex: 1 }}>
          <iframe
            data-aa="2436752"
            src="//acceptable.a-ads.com/2436752/?size=Adaptive"
            style={{ border: 0, padding: 0, width: "70%", height: "auto", overflow: "hidden", display: "block", margin: "auto" }}
          />
        </div>

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ fontSize: 12, color: "#475569" }}>&larr; back to dashboard</Link>
        </div>
      </main>

      <footer style={{
        textAlign: "center", padding: 20, color: "#1a1a2e", fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        EDGEMARKET // NFA // staking rewards are estimates only // prices from coingecko
      </footer>
    </div>
  );
}
