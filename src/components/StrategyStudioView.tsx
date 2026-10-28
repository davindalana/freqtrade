import React, { useState } from 'react';
import { 
  Sliders, 
  Code, 
  Play, 
  CheckCircle, 
  Copy, 
  Sparkles, 
  HelpCircle,
  FileCode,
  Gauge
} from 'lucide-react';
import { BotConfig } from '../types/freqtrade';
import { sampleStrategies } from '../data/sampleData';

interface StrategyStudioViewProps {
  config: BotConfig;
  onUpdateStrategy: (strategyName: string, updatedParams: Partial<BotConfig>) => void;
}

export const StrategyStudioView: React.FC<StrategyStudioViewProps> = ({
  config,
  onUpdateStrategy
}) => {
  const [selectedStrategyIndex, setSelectedStrategyIndex] = useState<number>(0);
  const currentStrategy = sampleStrategies[selectedStrategyIndex];

  // Tunable Hyperparameters
  const [rsiBuy, setRsiBuy] = useState<number>(30);
  const [rsiSell, setRsiSell] = useState<number>(70);
  const [stoploss, setStoploss] = useState<number>(currentStrategy.stoploss);
  const [roi0, setRoi0] = useState<number>(0.05);
  const [roi20, setRoi20] = useState<number>(0.03);
  const [roi30, setRoi30] = useState<number>(0.015);
  const [copied, setCopied] = useState<boolean>(false);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  const handleApplyToBot = () => {
    onUpdateStrategy(currentStrategy.name, {
      strategy: currentStrategy.name,
      timeframe: currentStrategy.timeframe,
      stoploss,
      minimal_roi: {
        '30': roi30,
        '20': roi20,
        '0': roi0
      }
    });
    setSimulationStatus('Parameters successfully compiled and applied to live bot!');
    setTimeout(() => setSimulationStatus(null), 3000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentStrategy.codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-emerald-400" />
            Freqtrade Strategy Studio & Hyperopt Tuner
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Develop, inspect, tune indicator thresholds, and optimize minimal ROI tables.
          </p>
        </div>

        <button
          onClick={handleApplyToBot}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 text-xs font-bold transition-colors shadow-sm"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>Apply Parameters to Bot</span>
        </button>
      </div>

      {simulationStatus && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{simulationStatus}</span>
        </div>
      )}

      {/* Strategy Selector Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sampleStrategies.map((strat, idx) => (
          <button
            key={strat.name}
            onClick={() => {
              setSelectedStrategyIndex(idx);
              setStoploss(strat.stoploss);
            }}
            className={`text-left p-3.5 rounded-xl border transition-all ${
              selectedStrategyIndex === idx
                ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white text-xs">{strat.name}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                {strat.timeframe}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2">
              {strat.description}
            </p>
          </button>
        ))}
      </div>

      {/* Main Two Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Hyperopt & Parameter Tuner (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-teal-400" />
                Hyperopt Space Tuner
              </span>
              <span className="text-[11px] font-mono text-emerald-400">{currentStrategy.name}</span>
            </div>

            {/* RSI Thresholds */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">RSI Buy Threshold (Oversold)</span>
                <span className="font-mono text-emerald-400 font-bold">{rsiBuy}</span>
              </div>
              <input
                type="range"
                min="15"
                max="45"
                value={rsiBuy}
                onChange={(e) => setRsiBuy(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>15 (Strict)</span>
                <span>30 (Default)</span>
                <span>45 (Loose)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">RSI Sell Threshold (Overbought)</span>
                <span className="font-mono text-rose-400 font-bold">{rsiSell}</span>
              </div>
              <input
                type="range"
                min="55"
                max="85"
                value={rsiSell}
                onChange={(e) => setRsiSell(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>55 (Early exit)</span>
                <span>70 (Default)</span>
                <span>85 (Late exit)</span>
              </div>
            </div>

            {/* Stoploss Slider */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Hard Stoploss Ratio</span>
                <span className="font-mono text-rose-400 font-bold">{(stoploss * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="-0.15"
                max="-0.01"
                step="0.005"
                value={stoploss}
                onChange={(e) => setStoploss(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-15% (Wide)</span>
                <span>-5% (Standard)</span>
                <span>-1% (Tight)</span>
              </div>
            </div>

            {/* ROI Steps */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300 block">
                Minimal ROI Ladder Targets
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">0 min (Instant)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={roi0}
                    onChange={(e) => setRoi0(Number(e.target.value))}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-1.5 font-mono text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">20 min target</span>
                  <input
                    type="number"
                    step="0.01"
                    value={roi20}
                    onChange={(e) => setRoi20(Number(e.target.value))}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-1.5 font-mono text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">30 min target</span>
                  <input
                    type="number"
                    step="0.01"
                    value={roi30}
                    onChange={(e) => setRoi30(Number(e.target.value))}
                    className="w-full rounded border border-slate-700 bg-slate-950 p-1.5 font-mono text-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Strategy Source Code & Logic (7 cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-200">
                  {currentStrategy.name}.py (IStrategy Interface)
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-3 bg-slate-900/60 rounded-lg text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed border border-slate-800/80">
              {currentStrategy.codeSnippet}
            </pre>

            <div className="mt-4 p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400">
              <strong className="text-slate-200">Freqtrade IStrategy Conventions:</strong>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-400">
                <li><code className="text-teal-300">populate_indicators()</code> calculates TA indicators on pandas / polars DataFrames.</li>
                <li><code className="text-teal-300">populate_entry_trend()</code> assigns <code className="text-emerald-400">enter_long = 1</code> on buy conditions.</li>
                <li><code className="text-teal-300">populate_exit_trend()</code> signals proactive strategy exits.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
