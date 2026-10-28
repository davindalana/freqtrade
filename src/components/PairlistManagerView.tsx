import React, { useState } from 'react';
import { 
  ListFilter, 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  Sliders, 
  Sparkles, 
  AlertTriangle,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { BotConfig, PairMarketInfo } from '../types/freqtrade';
import { sampleMarketPairsBot2 } from '../data/sampleData';

interface PairlistManagerViewProps {
  config: BotConfig;
  onUpdateConfig: (updated: Partial<BotConfig>) => void;
}

export const PairlistManagerView: React.FC<PairlistManagerViewProps> = ({
  config,
  onUpdateConfig
}) => {
  const [pairs, setPairs] = useState<PairMarketInfo[]>(sampleMarketPairsBot2);
  const [whitelist, setWhitelist] = useState<string[]>(config.exchange.pair_whitelist);
  const [blacklist, setBlacklist] = useState<string[]>(config.exchange.pair_blacklist);
  const [newPairInput, setNewPairInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filter settings
  const [topNVolume, setTopNVolume] = useState<number>(6);
  const [maxSpread, setMaxSpread] = useState<number>(0.05);
  const [minPrice, setMinPrice] = useState<number>(0.0001);

  const toggleWhitelist = (pairName: string) => {
    let updated: string[];
    if (whitelist.includes(pairName)) {
      updated = whitelist.filter(p => p !== pairName);
    } else {
      updated = [...whitelist, pairName];
    }
    setWhitelist(updated);
    onUpdateConfig({
      exchange: {
        ...config.exchange,
        pair_whitelist: updated
      }
    });
  };

  const handleAddWhitelist = () => {
    const trimmed = newPairInput.trim().toUpperCase();
    if (!trimmed || whitelist.includes(trimmed)) return;
    const updated = [...whitelist, trimmed];
    setWhitelist(updated);
    onUpdateConfig({
      exchange: {
        ...config.exchange,
        pair_whitelist: updated
      }
    });
    setNewPairInput('');
  };

  const handleApplyVolumeFilter = () => {
    // Sort all pairs by 24h volume and select top N
    const sorted = [...pairs]
      .filter(p => !blacklist.includes(p.pair))
      .filter(p => p.spread <= maxSpread && p.price >= minPrice)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, topNVolume)
      .map(p => p.pair);

    setWhitelist(sorted);
    onUpdateConfig({
      exchange: {
        ...config.exchange,
        pair_whitelist: sorted
      }
    });
  };

  const filteredMarketPairs = pairs.filter(p => 
    p.pair.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-emerald-400" />
            Freqtrade Pairlist & Market Filters
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic pairlist generator and filter pipeline for active market scanning.
          </p>
        </div>

        <button
          onClick={handleApplyVolumeFilter}
          className="flex items-center gap-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-3.5 py-2 text-xs font-bold transition-colors shadow-sm"
        >
          <Sparkles className="h-4 w-4" />
          <span>Auto-Filter Top {topNVolume} Pairs</span>
        </button>
      </div>

      {/* Filter Pipeline Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-300 mb-2">
            <Filter className="h-4 w-4 text-emerald-400" />
            VolumePairList
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Selects top assets ranked by 24-hour exchange quote volume.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Assets limit:</label>
            <input
              type="number"
              value={topNVolume}
              onChange={(e) => setTopNVolume(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-300 mb-2">
            <Sliders className="h-4 w-4 text-sky-400" />
            SpreadFilter
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Excludes pairs with bid-ask spread wider than max limit to avoid slippage.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Max Spread:</label>
            <input
              type="number"
              step="0.01"
              value={maxSpread}
              onChange={(e) => setMaxSpread(parseFloat(e.target.value) || 0.01)}
              className="w-20 rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-300 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            PriceFilter
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Removes sub-penny micro-cap tokens with low liquidity or precision issues.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Min Price:</label>
            <input
              type="number"
              step="0.001"
              value={minPrice}
              onChange={(e) => setMinPrice(parseFloat(e.target.value) || 0)}
              className="w-24 rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Active Whitelist & Blacklist Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Whitelist Panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Active Whitelist ({whitelist.length})
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. DOT/USDT"
                value={newPairInput}
                onChange={(e) => setNewPairInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWhitelist()}
                className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleAddWhitelist}
                className="rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 p-1.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {whitelist.map(p => (
              <span
                key={p}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-300"
              >
                <span>{p}</span>
                <button
                  onClick={() => toggleWhitelist(p)}
                  className="text-emerald-500 hover:text-emerald-200 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Blacklist Panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400 block mb-3">
            Blacklist (Excluded Pairs) ({blacklist.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {blacklist.map(p => (
              <span
                key={p}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-mono font-semibold text-rose-300"
              >
                <span>{p}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Live Market Scanner Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Live Exchange Market Scanner ({config.exchange.name})
            </h2>
            <p className="text-xs text-slate-500">
              Real-time quotes, 24h volume, spread, and whitelist status
            </p>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-44"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 font-sans border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Pair</th>
                <th className="py-2.5 px-3 text-right">Price</th>
                <th className="py-2.5 px-3 text-right">24h Change</th>
                <th className="py-2.5 px-3 text-right">24h Volume</th>
                <th className="py-2.5 px-3 text-right">Spread</th>
                <th className="py-2.5 px-3 text-right">Volatility</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMarketPairs.map(p => {
                const isWhitelisted = whitelist.includes(p.pair);
                const isUp = p.change24h >= 0;
                return (
                  <tr key={p.pair} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3 font-sans">
                      {isWhitelisted ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-[10px] font-semibold border border-emerald-500/30">
                          <Check className="h-3 w-3" /> In List
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-slate-800 text-slate-400 px-2 py-0.5 text-[10px]">
                          Ignored
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white font-sans">{p.pair}</td>
                    <td className="py-2.5 px-3 text-right text-slate-200">
                      {p.price >= 1 ? p.price.toFixed(2) : p.price.toFixed(5)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? '+' : ''}{p.change24h.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      ${(p.volume24h / 1000000).toFixed(1)}M
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {(p.spread * 100).toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {(p.volatility * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => toggleWhitelist(p.pair)}
                        className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors font-sans ${
                          isWhitelisted
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                        }`}
                      >
                        {isWhitelisted ? 'Remove' : 'Add'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
