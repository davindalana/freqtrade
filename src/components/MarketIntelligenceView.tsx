import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  BarChart2, 
  Calculator, 
  Check,
  ArrowUpRight
} from 'lucide-react';
import { Candle, OrderType } from '../types/freqtrade';
import { sampleMarketPairsBot2 } from '../data/sampleData';
import { analyzePairMarketStructure, MarketAnalysisReport } from '../services/marketIntelligence';

interface MarketIntelligenceViewProps {
  candlesMap: Record<string, Candle[]>;
  walletCapital: number;
  onExecuteBlueprint: (params: {
    pair: string;
    orderType: OrderType;
    price: number;
    stakeAmount: number;
    stopLossPrice: number;
    leverage: number;
    tag: string;
  }) => void;
  onSelectPairForChart: (pair: string) => void;
  onSyncLivePrices: () => Promise<void>;
  isSyncingLive: boolean;
  lastSyncTime: string | null;
}

export const MarketIntelligenceView: React.FC<MarketIntelligenceViewProps> = ({
  candlesMap,
  walletCapital,
  onExecuteBlueprint,
  onSelectPairForChart,
  onSyncLivePrices,
  isSyncingLive,
  lastSyncTime
}) => {
  const [selectedPair, setSelectedPair] = useState<string>('BTC/USDT:USDT');
  const [riskPct, setRiskPct] = useState<number>(2.5);
  const [customCapital, setCustomCapital] = useState<number>(Number(walletCapital.toFixed(2)) || 80.67);
  const [executedNotice, setExecutedNotice] = useState<string | null>(null);
  const [regimeFilter, setRegimeFilter] = useState<'all' | 'actionable'>('all');

  // Generate full market analysis reports for all tracked pairs
  const reports: MarketAnalysisReport[] = useMemo(() => {
    return sampleMarketPairsBot2
      .map(item => {
        const pairCandles = candlesMap[item.pair] || [];
        return analyzePairMarketStructure(
          item.pair,
          pairCandles,
          item.change24h,
          item.volume24h,
          customCapital,
          riskPct
        );
      })
      .sort((a, b) => b.confluenceScore - a.confluenceScore);
  }, [candlesMap, customCapital, riskPct]);

  const filteredReports = useMemo(() => {
    if (regimeFilter === 'actionable') {
      return reports.filter(r => r.confluenceScore >= 65 || r.action === 'BUY PULLBACK' || r.action === 'HOLD / TRAIL SL');
    }
    return reports;
  }, [reports, regimeFilter]);

  const activeReport = useMemo(() => {
    return reports.find(r => r.pair === selectedPair) || reports[0];
  }, [reports, selectedPair]);

  const handleSelectBestSetup = () => {
    const bestAlt = reports.find(r => !r.pair.includes('BTC')) || reports[0];
    if (bestAlt) {
      setSelectedPair(bestAlt.pair);
    }
  };

  const handleDeployBlueprint = (report: MarketAnalysisReport) => {
    onExecuteBlueprint({
      pair: report.pair,
      orderType: 'market',
      price: report.currentPrice,
      stakeAmount: report.tradePlan.recommendedStakeUsdt,
      stopLossPrice: report.tradePlan.stopLoss,
      leverage: report.tradePlan.recommendedLeverage,
      tag: `ai_confluence_${report.confluenceScore}`
    });
    setExecutedNotice(
      `Order deployed: LONG ${report.pair} (${report.tradePlan.recommendedLeverage}x) · Stake $${report.tradePlan.recommendedStakeUsdt} · Hard SL $${report.tradePlan.stopLoss}`
    );
    setTimeout(() => setExecutedNotice(null), 4000);
  };

  const decimals = activeReport.currentPrice < 2 ? 4 : 2;

  // Compounding calculator projections (based on 12 trades/month at average R:R)
  const expectedWinRate = 0.58;
  const avgWinUsdt = activeReport.tradePlan.expectedProfitTp1Usdt;
  const avgLossUsdt = activeReport.tradePlan.maxLossUsdt;
  const expectancyPerTradeUsdt = expectedWinRate * avgWinUsdt - (1 - expectedWinRate) * avgLossUsdt;
  const projected30dUsdt = Math.max(0, expectancyPerTradeUsdt * 12);
  const projected90dUsdt = Math.max(0, expectancyPerTradeUsdt * 36 * 1.18);

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header & Live Sync Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white">
            Full Market Intelligence & Confluence Scanner
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated multi-timeframe structure analysis (15m · 1h · 4h · 1d), ATR volatility stoploss calculation, and risk-managed trade blueprints
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {lastSyncTime && (
            <span className="text-xs font-mono tabular-nums text-slate-400 mr-1">
              Synced {lastSyncTime}
            </span>
          )}
          <button
            onClick={handleSelectBestSetup}
            className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Highlight Top Altcoin Setup
          </button>
          <button
            onClick={onSyncLivePrices}
            disabled={isSyncingLive}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingLive ? 'animate-spin' : ''}`} />
            <span>{isSyncingLive ? 'Syncing Binance...' : 'Sync Live Market Prices'}</span>
          </button>
        </div>
      </div>

      {executedNotice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{executedNotice}</span>
          </div>
          <button onClick={() => setExecutedNotice(null)} className="text-slate-400 hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Section 1: Selected Asset Actionable Trade Blueprint & Risk Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Deep-Dive Market Structure & Trade Plan */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-white font-mono tabular-nums">
                    {activeReport.pair}
                  </span>
                  <span className="text-sm font-semibold font-mono tabular-nums text-emerald-400">
                    ${activeReport.currentPrice.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono tabular-nums">
                  <span>Regime: <strong className="text-slate-200 font-sans">{activeReport.regime}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>ATR (14): {activeReport.atrPct}%</span>
                  <span aria-hidden="true">·</span>
                  <span>1h ADX: {activeReport.adx1h}</span>
                  <span aria-hidden="true">·</span>
                  <span>RSI: {activeReport.rsi14}</span>
                </div>
              </div>

              <div className="text-right font-mono tabular-nums">
                <div className="text-xs text-slate-400 font-sans">Confluence Score</div>
                <div className={`text-2xl font-bold ${
                  activeReport.confluenceScore >= 75 ? 'text-emerald-400' : activeReport.confluenceScore >= 55 ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {activeReport.confluenceScore} <span className="text-xs font-normal text-slate-500">/ 100</span>
                </div>
              </div>
            </div>

            {/* Multi-Timeframe Alignment Strip */}
            <div className="grid grid-cols-4 divide-x divide-slate-800 border-b border-slate-800 py-3 text-xs font-mono tabular-nums">
              {activeReport.timeframes.map(tf => (
                <div key={tf.timeframe} className="px-3 first:pl-0 last:pr-0">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-bold text-slate-200">{tf.timeframe}</span>
                    <span className={tf.trend === 'Bullish' ? 'text-emerald-400 font-sans font-medium' : tf.trend === 'Bearish' ? 'text-rose-400 font-sans' : 'text-slate-400 font-sans'}>
                      {tf.trend}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    RSI {tf.rsi} · ADX {tf.adx}
                  </div>
                </div>
              ))}
            </div>

            {/* Exact Calculated Execution Levels */}
            <div className="pt-4">
              <div className="text-xs font-semibold text-slate-300 mb-3">
                Calculated Trade Blueprint (ATR-Protected Levels)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-950/70 border border-slate-800/90 font-mono tabular-nums text-xs">
                <div>
                  <div className="text-slate-400 font-sans">Optimal Entry</div>
                  <div className="text-sm font-bold text-white mt-1">
                    ${activeReport.tradePlan.entryIdeal.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sup: ${activeReport.supportLevel.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-sans">Hard StopLoss</div>
                  <div className="text-sm font-bold text-rose-400 mt-1">
                    ${activeReport.tradePlan.stopLoss.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    -{activeReport.tradePlan.stopLossDistancePct}% (1.8x ATR)
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-sans">TP1 Target ({activeReport.tradePlan.riskRewardTp1}R)</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">
                    ${activeReport.tradePlan.tp1.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                  </div>
                  <div className="text-[11px] text-emerald-400/80 mt-0.5">
                    +${activeReport.tradePlan.expectedProfitTp1Usdt.toFixed(2)} USDT
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-sans">TP2 Target ({activeReport.tradePlan.riskRewardTp2}R)</div>
                  <div className="text-sm font-bold text-teal-300 mt-1">
                    ${activeReport.tradePlan.tp2.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                  </div>
                  <div className="text-[11px] text-teal-300/80 mt-0.5">
                    +${activeReport.tradePlan.expectedProfitTp2Usdt.toFixed(2)} USDT
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Confluence Reasons */}
            <div className="pt-4 space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Technical Confluence Diagnosis</div>
              <ul className="space-y-1 text-xs text-slate-400">
                {activeReport.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-mono">·</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <div className="text-xs font-mono tabular-nums text-slate-400">
              Signal Verdict: <strong className={activeReport.confluenceScore >= 70 ? 'text-emerald-400' : 'text-amber-300'}>{activeReport.action}</strong>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onSelectPairForChart(activeReport.pair)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                <span>Inspect Chart</span>
              </button>
              <button
                onClick={() => handleDeployBlueprint(activeReport)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Execute Blueprint (${activeReport.tradePlan.recommendedStakeUsdt} USDT)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Smart Position Sizing & Compounding Growth Calculator */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Risk & Position Sizing Calculator</h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {activeReport.tradePlan.recommendedLeverage}x Isolated
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Total Portfolio Capital (USDT)</label>
                <input
                  type="number"
                  step="1"
                  value={customCapital}
                  onChange={(e) => setCustomCapital(Math.max(10, Number(e.target.value)))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Max Risk Per Trade (%)</label>
                <select
                  value={riskPct}
                  onChange={(e) => setRiskPct(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={1.0}>1.0% (Conservative)</option>
                  <option value={2.0}>2.0% (Institutional Standard)</option>
                  <option value={2.5}>2.5% (Balanced Swing)</option>
                  <option value={3.5}>3.5% (Aggressive Growth)</option>
                </select>
              </div>
            </div>

            {/* Calculated Sizing Output */}
            <div className="divide-y divide-slate-800 border-t border-b border-slate-800 text-xs font-mono tabular-nums">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Recommended Margin Stake</span>
                <span className="text-white font-bold">${activeReport.tradePlan.recommendedStakeUsdt.toFixed(2)} USDT</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Max Dollar Risk (If StopLoss Hit)</span>
                <span className="text-rose-400 font-semibold">-${activeReport.tradePlan.maxLossUsdt.toFixed(2)} USDT ({riskPct}%)</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Expected Profit at TP1 ({activeReport.tradePlan.riskRewardTp1}R)</span>
                <span className="text-emerald-400 font-bold">+${activeReport.tradePlan.expectedProfitTp1Usdt.toFixed(2)} USDT</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400 font-sans">Expected Profit at TP2 ({activeReport.tradePlan.riskRewardTp2}R)</span>
                <span className="text-teal-300 font-bold">+${activeReport.tradePlan.expectedProfitTp2Usdt.toFixed(2)} USDT</span>
              </div>
            </div>

            {/* Compounding Projection */}
            <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Compounding Growth Projection</span>
                <span className="text-emerald-400 font-mono tabular-nums text-[11px]">58% Win Rate · {activeReport.tradePlan.riskRewardTp1}R</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 font-mono tabular-nums">
                <div>
                  <span className="text-[11px] text-slate-400 block font-sans">Est. 30-Day Balance</span>
                  <span className="text-sm font-bold text-emerald-400">
                    ${(customCapital + projected30dUsdt).toFixed(2)} <span className="text-[11px] font-normal text-slate-400">(+${projected30dUsdt.toFixed(1)})</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-sans">Est. 90-Day Balance</span>
                  <span className="text-sm font-bold text-teal-300">
                    ${(customCapital + projected90dUsdt).toFixed(2)} <span className="text-[11px] font-normal text-slate-400">(+${projected90dUsdt.toFixed(1)})</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Position size is automatically capped so a single StopLoss never risks more than {riskPct}% of your total wallet.</span>
          </div>
        </div>
      </div>

      {/* Section 2: Full Multi-Asset Confluence Leaderboard Table */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">
              Multi-Asset Market Scanner & Confluence Ranking
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any asset row to load its full ATR stoploss blueprint and position sizing plan above
            </p>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setRegimeFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                regimeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All 8 Markets
            </button>
            <button
              onClick={() => setRegimeFilter('actionable')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                regimeFilter === 'actionable' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              High-Confluence Only
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead className="bg-slate-950/60 text-slate-400 font-sans border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Pair</th>
                <th className="py-3 px-4 text-right">Mark Price</th>
                <th className="py-3 px-4 text-right">24h %</th>
                <th className="py-3 px-4 text-right">Confluence</th>
                <th className="py-3 px-4">MTF Alignment (15m/1h/4h/1d)</th>
                <th className="py-3 px-4 text-right">1h ADX</th>
                <th className="py-3 px-4 text-right">RSI (14)</th>
                <th className="py-3 px-4">Market Regime</th>
                <th className="py-3 px-4">Action Signal</th>
                <th className="py-3 px-4 text-right">Blueprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReports.map(r => {
                const isSelected = r.pair === activeReport.pair;
                const isUp = r.change24h >= 0;
                const d = r.currentPrice < 2 ? 4 : 2;
                return (
                  <tr
                    key={r.pair}
                    onClick={() => setSelectedPair(r.pair)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-white font-sans">
                      {r.pair}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-200">
                      ${r.currentPrice.toLocaleString(undefined, { minimumFractionDigits: d })}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? '+' : ''}{r.change24h.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${
                        r.confluenceScore >= 75 ? 'text-emerald-400' : r.confluenceScore >= 58 ? 'text-amber-300' : 'text-slate-400'
                      }`}>
                        {r.confluenceScore}/100
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {r.timeframes.map(tf => (
                          <span
                            key={tf.timeframe}
                            className={
                              tf.trend === 'Bullish'
                                ? 'text-emerald-400 font-semibold'
                                : tf.trend === 'Bearish'
                                  ? 'text-rose-400'
                                  : 'text-slate-500'
                            }
                          >
                            {tf.timeframe}:{tf.trend[0]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-right ${r.adx1h >= 20 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      {r.adx1h.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {r.rsi14.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300">
                      {r.regime}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`font-semibold ${
                        r.action === 'BUY PULLBACK' || r.action === 'HOLD / TRAIL SL'
                          ? 'text-emerald-400'
                          : r.action === 'WAIT FOR PULLBACK'
                            ? 'text-amber-300'
                            : 'text-slate-500'
                      }`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPair(r.pair);
                        }}
                        className="inline-flex items-center gap-0.5 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                      >
                        <span>Load Plan</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
