import React, { useState } from 'react';
import { X, Save, Settings, Shield, Sliders, Database } from 'lucide-react';
import { BotConfig } from '../types/freqtrade';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BotConfig;
  onSaveConfig: (newConfig: BotConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig
}) => {
  const [formData, setFormData] = useState<BotConfig>(config);
  const [activeTab, setActiveTab] = useState<'general' | 'risk' | 'exchange' | 'json'>('general');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Settings className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Freqtrade Bot Configuration (config.json)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 text-xs font-medium">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 border-b-2 transition-colors ${activeTab === 'general' ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            General & Trading
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`py-3 px-3 border-b-2 transition-colors ${activeTab === 'risk' ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Risk & Stoploss
          </button>
          <button
            onClick={() => setActiveTab('exchange')}
            className={`py-3 px-3 border-b-2 transition-colors ${activeTab === 'exchange' ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Exchange
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`py-3 px-3 border-b-2 transition-colors ${activeTab === 'json' ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Raw JSON
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Bot Name</label>
                  <input
                    type="text"
                    value={formData.bot_name}
                    onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Timeframe</label>
                  <select
                    value={formData.timeframe}
                    onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1m">1m</option>
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1h">1h</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Stake Currency</label>
                  <input
                    type="text"
                    value={formData.stake_currency}
                    onChange={(e) => setFormData({ ...formData, stake_currency: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Stake Amount per Trade</label>
                  <input
                    type="number"
                    value={typeof formData.stake_amount === 'number' ? formData.stake_amount : 500}
                    onChange={(e) => setFormData({ ...formData, stake_amount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Max Open Trades</label>
                  <input
                    type="number"
                    value={formData.max_open_trades}
                    onChange={(e) => setFormData({ ...formData, max_open_trades: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Trading Mode</label>
                  <select
                    value={formData.trading_mode}
                    onChange={(e) => setFormData({ ...formData, trading_mode: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="spot">Spot</option>
                    <option value="futures">Futures</option>
                    <option value="margin">Margin</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.dry_run}
                    onChange={(e) => setFormData({ ...formData, dry_run: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-slate-200 block">Dry-Run Simulation Mode</span>
                    <span className="text-[11px] text-slate-400">
                      When enabled, orders are simulated without risking real exchange funds.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Hard Stoploss Ratio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stoploss}
                    onChange={(e) => setFormData({ ...formData, stoploss: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. -0.05 = -5%</span>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tradable Balance Ratio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tradable_balance_ratio}
                    onChange={(e) => setFormData({ ...formData, tradable_balance_ratio: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">0.99 = reserves 1% for exchange fees</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.trailing_stop}
                    onChange={(e) => setFormData({ ...formData, trailing_stop: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                  />
                  <span className="font-bold text-slate-200">Trailing Stoploss</span>
                </label>

                {formData.trailing_stop && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Positive Trailing Offset</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.trailing_stop_positive_offset}
                        onChange={(e) => setFormData({ ...formData, trailing_stop_positive_offset: Number(e.target.value) })}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Trailing Step</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.trailing_stop_positive}
                        onChange={(e) => setFormData({ ...formData, trailing_stop_positive: Number(e.target.value) })}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'exchange' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 block mb-1">Exchange Name</label>
                <select
                  value={formData.exchange.name}
                  onChange={(e) => setFormData({ ...formData, exchange: { ...formData.exchange, name: e.target.value } })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="Binance">Binance</option>
                  <option value="Kraken">Kraken</option>
                  <option value="Bybit">Bybit</option>
                  <option value="OKX">OKX</option>
                  <option value="Gate.io">Gate.io</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••"
                  value={formData.exchange.key || ''}
                  onChange={(e) => setFormData({ ...formData, exchange: { ...formData.exchange, key: e.target.value } })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">API Secret</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••"
                  value={formData.exchange.secret || ''}
                  onChange={(e) => setFormData({ ...formData, exchange: { ...formData.exchange, secret: e.target.value } })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <pre className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-80">
              {JSON.stringify(formData, null, 2)}
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4 bg-slate-950/60">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 text-xs font-bold transition-colors shadow-sm"
          >
            <Save className="h-4 w-4" />
            <span>Save & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
