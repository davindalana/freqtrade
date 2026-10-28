import React, { useState } from 'react';
import { 
  Wallet, 
  Coins, 
  PlusCircle, 
  RotateCcw, 
  ArrowUpRight, 
  ShieldCheck, 
  Percent, 
  PieChart
} from 'lucide-react';
import { BalanceItem, BotConfig } from '../types/freqtrade';

interface WalletViewProps {
  config: BotConfig;
  balances: BalanceItem[];
  onAddFunds: (amount: number) => void;
  onResetBalance: (amount: number) => void;
  walletBalance: number;
}

export const WalletView: React.FC<WalletViewProps> = ({
  config,
  balances,
  onAddFunds,
  onResetBalance,
  walletBalance
}) => {
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [resetAmount, setResetAmount] = useState<number>(10000);

  const totalEstUsd = balances.reduce((sum, b) => sum + b.est_usd, 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Wallet Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            Exchange Wallet & Asset Balances
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track free liquidity, allocated trade capital, and exchange reserves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-mono text-emerald-400 font-bold">
            Tradable Ratio: {(config.tradable_balance_ratio * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-xs text-slate-400 block mb-1">Total Estimated Value</span>
          <div className="text-2xl font-bold font-mono text-white">
            ${totalEstUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            ≈ {totalEstUsd.toFixed(2)} {config.stake_currency}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-xs text-slate-400 block mb-1">Free Stake Capital (USDT)</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {balances.find(b => b.currency === 'USDT')?.free.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <span className="text-[11px] text-slate-500">
            Available for new position entries
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-xs text-slate-400 block mb-1">Capital Locked in Positions</span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {balances.reduce((sum, b) => b.currency !== 'USDT' ? sum + b.est_stake : sum, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500">
            Allocated across active bot trades
          </span>
        </div>
      </div>

      {/* Asset Breakdown Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">
          Account Assets & Token Allocation
        </h2>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 font-sans border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3 text-right">Free Units</th>
                <th className="py-2.5 px-3 text-right">Used In Trades</th>
                <th className="py-2.5 px-3 text-right">Total Balance</th>
                <th className="py-2.5 px-3 text-right">Est. USDT</th>
                <th className="py-2.5 px-3 text-right">Est. USD</th>
                <th className="py-2.5 px-3 text-right">Allocation %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {balances.map(b => {
                const allocationPct = (b.est_usd / totalEstUsd) * 100;
                return (
                  <tr key={b.currency} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2 font-sans">
                      <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-teal-300 font-bold">
                        {b.currency.slice(0, 3)}
                      </div>
                      <span>{b.currency}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{b.free.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{b.used > 0 ? b.used.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '-'}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-100">{b.total.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">${b.est_stake.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">${b.est_usd.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      <div className="flex items-center justify-end gap-2">
                        <span>{allocationPct.toFixed(1)}%</span>
                        <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${allocationPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dry-Run Simulator Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-2">
          Dry-Run Capital Management
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Simulate capital injection or reset your simulated paper-trading balance.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Deposit simulation */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-300 block">Inject Simulated Funds</span>
              <span className="text-[11px] text-slate-500">Adds USDT directly to free balance</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => onAddFunds(depositAmount)}
                className="flex items-center gap-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1 text-xs font-bold transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Reset simulation */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-300 block">Reset Dry-Run Capital</span>
              <span className="text-[11px] text-slate-500">Reset portfolio to starting baseline</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={resetAmount}
                onChange={(e) => setResetAmount(Number(e.target.value))}
                className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => onResetBalance(resetAmount)}
                className="flex items-center gap-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 px-3 py-1 text-xs font-medium transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
