import React, { useState } from 'react';
import { X, TrendingUp, DollarSign, ShieldAlert, Check } from 'lucide-react';
import { BotConfig, OrderType } from '../types/freqtrade';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BotConfig;
  availablePairs: string[];
  currentPrices: Record<string, number>;
  onExecuteTrade: (tradeParams: {
    pair: string;
    orderType: OrderType;
    price: number;
    stakeAmount: number;
    tag: string;
  }) => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  config,
  availablePairs,
  currentPrices,
  onExecuteTrade
}) => {
  const [selectedPair, setSelectedPair] = useState<string>(availablePairs[0] || 'BTC/USDT');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [stake, setStake] = useState<number>(typeof config.stake_amount === 'number' ? config.stake_amount : 500);
  const [tag, setTag] = useState<string>('manual_force_buy');

  if (!isOpen) return null;

  const currentPrice = currentPrices[selectedPair] || 67420;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecuteTrade({
      pair: selectedPair,
      orderType,
      price: currentPrice,
      stakeAmount: stake,
      tag
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Force Enter / Manual Order
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Trading Pair</label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
            >
              {availablePairs.map(p => (
                <option key={p} value={p}>{p} (~${currentPrices[p] || '0.00'})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="market">Market Order</option>
                <option value="limit">Limit Order</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Estimated Entry Price</label>
              <div className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-emerald-400 font-mono font-bold">
                {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} {config.stake_currency}
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Stake Amount ({config.stake_currency})</label>
            <input
              type="number"
              min="10"
              step="10"
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Enter Tag / Annotation</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-[11px] flex items-start gap-2">
            <Check className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Order will be executed in {config.dry_run ? 'Dry-Run mode' : 'Live mode'}. Initial stoploss will be automatically placed at {((1 + config.stoploss) * currentPrice).toFixed(2)}.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 text-xs font-bold transition-colors shadow-sm"
            >
              Execute Buy Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
