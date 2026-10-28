import React, { useState, useMemo } from 'react';
import { Candle, Trade } from '../types/freqtrade';

interface ChartViewProps {
  pair: string;
  setPair: (pair: string) => void;
  candles: Candle[];
  trades: Trade[];
  availablePairs: string[];
}

export const ChartView: React.FC<ChartViewProps> = ({
  pair,
  setPair,
  candles,
  trades,
  availablePairs
}) => {
  const [timeframe, setTimeframe] = useState<string>('4h');
  const [candleLimit, setCandleLimit] = useState<number>(70);
  const [showEMA, setShowEMA] = useState<boolean>(true);
  const [showBB, setShowBB] = useState<boolean>(true);
  const [showRSI, setShowRSI] = useState<boolean>(true);
  const [showPositionLines, setShowPositionLines] = useState<boolean>(true);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const svgWidth = 980;
  const mainHeight = 360;
  const subHeight = 110;
  const padding = { top: 24, right: 86, bottom: 28, left: 16 };

  const visibleCandles = useMemo(() => {
    return candles.slice(-candleLimit);
  }, [candles, candleLimit]);

  const activeOpenTrade = useMemo(() => {
    return trades.find(t => t.is_open && t.pair === pair);
  }, [trades, pair]);

  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (visibleCandles.length === 0) return { minPrice: 0, maxPrice: 100, maxVolume: 100 };
    let min = Math.min(...visibleCandles.map(c => c.low));
    let max = Math.max(...visibleCandles.map(c => c.high));

    if (showBB) {
      const validUpper = visibleCandles.map(c => c.bb_upper || 0).filter(v => v > 0);
      const validLower = visibleCandles.map(c => c.bb_lower || 0).filter(v => v > 0);
      if (validUpper.length) max = Math.max(max, ...validUpper);
      if (validLower.length) min = Math.min(min, ...validLower);
    }

    if (showPositionLines && activeOpenTrade) {
      min = Math.min(min, activeOpenTrade.stop_loss_abs * 0.998);
      max = Math.max(max, activeOpenTrade.open_rate * 1.005);
    }

    const paddingRatio = (max - min) * 0.06 || 1;
    const maxVol = Math.max(...visibleCandles.map(c => c.volume));
    return {
      minPrice: min - paddingRatio,
      maxPrice: max + paddingRatio,
      maxVolume: maxVol || 1
    };
  }, [visibleCandles, showBB, showPositionLines, activeOpenTrade]);

  const chartWidth = svgWidth - padding.left - padding.right;
  const candleStep = chartWidth / Math.max(1, visibleCandles.length);
  const candleWidth = Math.max(2.5, candleStep * 0.68);

  const getY = (val: number) => {
    return mainHeight - padding.bottom - ((val - minPrice) / (maxPrice - minPrice || 1)) * (mainHeight - padding.top - padding.bottom);
  };

  const getRSIY = (rsiVal: number) => {
    return subHeight - 20 - (rsiVal / 100) * (subHeight - 40);
  };

  const ema20Path = useMemo(() => {
    return visibleCandles
      .map((c, i) => {
        if (!c.ema20) return '';
        const x = padding.left + i * candleStep + candleStep / 2;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${getY(c.ema20).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [visibleCandles, candleStep, minPrice, maxPrice]);

  const ema50Path = useMemo(() => {
    return visibleCandles
      .map((c, i) => {
        if (!c.ema50) return '';
        const x = padding.left + i * candleStep + candleStep / 2;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${getY(c.ema50).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [visibleCandles, candleStep, minPrice, maxPrice]);

  const bbUpperPath = useMemo(() => {
    return visibleCandles
      .map((c, i) => {
        if (!c.bb_upper) return '';
        const x = padding.left + i * candleStep + candleStep / 2;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${getY(c.bb_upper).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [visibleCandles, candleStep, minPrice, maxPrice]);

  const bbLowerPath = useMemo(() => {
    return visibleCandles
      .map((c, i) => {
        if (!c.bb_lower) return '';
        const x = padding.left + i * candleStep + candleStep / 2;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${getY(c.bb_lower).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [visibleCandles, candleStep, minPrice, maxPrice]);

  const rsiPath = useMemo(() => {
    return visibleCandles
      .map((c, i) => {
        if (c.rsi === undefined) return '';
        const x = padding.left + i * candleStep + candleStep / 2;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${getRSIY(c.rsi).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [visibleCandles, candleStep]);

  const activeCandle = hoveredCandle || visibleCandles[visibleCandles.length - 1];
  const priceDecimals = activeCandle && activeCandle.close < 2 ? 4 : 2;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-bold font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {availablePairs.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Timeframe Segmented Control */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5">
            {['15m', '1h', '4h', '1d'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-md px-2.5 py-1 text-xs font-mono tabular-nums font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeframe === tf ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Window Zoom Control */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5">
            {[40, 70, 100].map(limit => (
              <button
                key={limit}
                onClick={() => setCandleLimit(limit)}
                className={`rounded-md px-2.5 py-1 text-xs font-mono tabular-nums font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  candleLimit === limit ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {limit} Bars
              </button>
            ))}
          </div>
        </div>

        {/* Indicator Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showEMA ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            EMA 20 / 50
          </button>

          <button
            onClick={() => setShowBB(!showBB)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showBB ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            Bollinger Bands
          </button>

          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showRSI ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            RSI (14)
          </button>

          <button
            onClick={() => setShowPositionLines(!showPositionLines)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showPositionLines ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            Position & Signals
          </button>
        </div>
      </div>

      {/* Main Chart Surface */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        {/* Clean Unboxed Telemetry Header */}
        {activeCandle && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3 text-xs font-mono tabular-nums">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-bold text-white text-sm">{pair}</span>
              <span aria-hidden="true">·</span>
              <span>{timeframe}</span>
              <span aria-hidden="true">·</span>
              <span>{new Date(activeCandle.timestamp).toLocaleString()}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-slate-400">
              <span>O <strong className="text-slate-200">{activeCandle.open.toFixed(priceDecimals)}</strong></span>
              <span>H <strong className="text-emerald-400">{activeCandle.high.toFixed(priceDecimals)}</strong></span>
              <span>L <strong className="text-rose-400">{activeCandle.low.toFixed(priceDecimals)}</strong></span>
              <span>C <strong className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{activeCandle.close.toFixed(priceDecimals)}</strong></span>
              <span>Vol <strong className="text-slate-300">{activeCandle.volume.toLocaleString()}</strong></span>
              {showEMA && activeCandle.ema20 && (
                <span className="text-amber-300">EMA20 <strong>{activeCandle.ema20.toFixed(priceDecimals)}</strong></span>
              )}
              {showRSI && activeCandle.rsi !== undefined && (
                <span className="text-purple-300">RSI <strong>{activeCandle.rsi.toFixed(1)}</strong></span>
              )}
            </div>
          </div>
        )}

        {/* Candlestick SVG */}
        <div className="relative w-full overflow-hidden mt-3">
          <svg
            viewBox={`0 0 ${svgWidth} ${mainHeight}`}
            className="w-full h-auto select-none"
            onMouseLeave={() => setHoveredCandle(null)}
          >
            {/* Horizontal Price Grid */}
            {[0.15, 0.35, 0.55, 0.75, 0.9].map(ratio => {
              const y = padding.top + ratio * (mainHeight - padding.top - padding.bottom);
              const priceVal = maxPrice - ratio * (maxPrice - minPrice);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={svgWidth - padding.right + 8}
                    y={y + 3.5}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {priceVal.toFixed(priceDecimals)}
                  </text>
                </g>
              );
            })}

            {/* Bollinger Bands */}
            {showBB && (
              <>
                <path d={bbUpperPath} fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.65" />
                <path d={bbLowerPath} fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.65" />
              </>
            )}

            {/* EMA 20 & 50 */}
            {showEMA && (
              <>
                <path d={ema20Path} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.9" />
                <path d={ema50Path} fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.85" />
              </>
            )}

            {/* Active Trade Position Overlay Lines (Entry & Hard StopLoss) */}
            {showPositionLines && activeOpenTrade && (
              <>
                {/* Entry Price Line */}
                <g>
                  <line
                    x1={padding.left}
                    y1={getY(activeOpenTrade.open_rate)}
                    x2={svgWidth - padding.right}
                    y2={getY(activeOpenTrade.open_rate)}
                    stroke="#10b981"
                    strokeWidth="1.3"
                    strokeDasharray="6 4"
                  />
                  <text
                    x={padding.left + 6}
                    y={getY(activeOpenTrade.open_rate) - 5}
                    fill="#10b981"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    LONG ENTRY ${activeOpenTrade.open_rate.toLocaleString()}
                  </text>
                </g>

                {/* Hard StopLoss Line */}
                <g>
                  <line
                    x1={padding.left}
                    y1={getY(activeOpenTrade.stop_loss_abs)}
                    x2={svgWidth - padding.right}
                    y2={getY(activeOpenTrade.stop_loss_abs)}
                    stroke="#f43f5e"
                    strokeWidth="1.3"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left + 6}
                    y={getY(activeOpenTrade.stop_loss_abs) - 5}
                    fill="#f43f5e"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    HARD STOPLOSS ${activeOpenTrade.stop_loss_abs.toLocaleString()}
                  </text>
                </g>
              </>
            )}

            {/* Candlesticks & Volume */}
            {visibleCandles.map((c, i) => {
              const xCenter = padding.left + i * candleStep + candleStep / 2;
              const xRect = xCenter - candleWidth / 2;
              const isUp = c.close >= c.open;
              const candleColor = isUp ? '#10b981' : '#f43f5e';

              const yHigh = getY(c.high);
              const yLow = getY(c.low);
              const yOpen = getY(c.open);
              const yClose = getY(c.close);
              const rectY = Math.min(yOpen, yClose);
              const rectHeight = Math.max(1.5, Math.abs(yClose - yOpen));

              const volHeight = (c.volume / maxVolume) * 48;
              const volY = mainHeight - padding.bottom - volHeight;

              return (
                <g
                  key={`${c.timestamp}-${i}`}
                  onMouseEnter={() => setHoveredCandle(c)}
                  className="cursor-crosshair"
                >
                  <rect
                    x={xRect}
                    y={volY}
                    width={candleWidth}
                    height={volHeight}
                    fill={candleColor}
                    opacity="0.18"
                  />

                  <line
                    x1={xCenter}
                    y1={yHigh}
                    x2={xCenter}
                    y2={yLow}
                    stroke={candleColor}
                    strokeWidth="1.2"
                  />

                  <rect
                    x={xRect}
                    y={rectY}
                    width={candleWidth}
                    height={rectHeight}
                    fill={candleColor}
                    rx="0.5"
                  />

                  {showPositionLines && c.buy_signal && (
                    <polygon
                      points={`${xCenter},${yLow + 8} ${xCenter - 4.5},${yLow + 16} ${xCenter + 4.5},${yLow + 16}`}
                      fill="#10b981"
                    />
                  )}

                  {showPositionLines && c.sell_signal && (
                    <polygon
                      points={`${xCenter},${yHigh - 8} ${xCenter - 4.5},${yHigh - 16} ${xCenter + 4.5},${yHigh - 16}`}
                      fill="#f43f5e"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* RSI Subplot */}
        {showRSI && (
          <div className="border-t border-slate-800/80 pt-3 mt-3">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400 mb-1">
              <span className="text-purple-300 font-medium">Relative Strength Index (RSI 14)</span>
              <span>Oversold 30 · Overbought 70</span>
            </div>
            <svg viewBox={`0 0 ${svgWidth} ${subHeight}`} className="w-full h-auto select-none">
              <line
                x1={padding.left}
                y1={getRSIY(70)}
                x2={svgWidth - padding.right}
                y2={getRSIY(70)}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                opacity="0.45"
              />
              <line
                x1={padding.left}
                y1={getRSIY(30)}
                x2={svgWidth - padding.right}
                y2={getRSIY(30)}
                stroke="#10b981"
                strokeDasharray="3 3"
                opacity="0.45"
              />
              <text x={svgWidth - padding.right + 8} y={getRSIY(70) + 3} fill="#f43f5e" fontSize="10" fontFamily="JetBrains Mono, monospace">70</text>
              <text x={svgWidth - padding.right + 8} y={getRSIY(30) + 3} fill="#10b981" fontSize="10" fontFamily="JetBrains Mono, monospace">30</text>
              <path d={rsiPath} fill="none" stroke="#c084fc" strokeWidth="1.6" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
