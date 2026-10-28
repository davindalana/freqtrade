import React from 'react';
import { 
  Play, 
  Square, 
  RotateCw, 
  ListFilter, 
  Wallet, 
  Terminal, 
  Settings as SettingsIcon
} from 'lucide-react';
import { BotRunState, BotConfig, BotInstance } from '../types/freqtrade';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  botState: BotRunState;
  setBotState: (state: BotRunState) => void;
  config: BotConfig;
  onOpenSettings: () => void;
  onOpenManualTrade: () => void;
  openTradesCount: number;
  selectedBotId: string;
  setSelectedBotId: (id: string) => void;
  bots: BotInstance[];
  warpStatus: string;
  caffeinateActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  botState,
  setBotState,
  config,
  onOpenSettings,
  onOpenManualTrade,
  openTradesCount,
  selectedBotId,
  setSelectedBotId,
  bots,
  warpStatus,
  caffeinateActive
}) => {
  const isRunning = botState === 'running';
  const totalWallet = bots.reduce((sum, b) => sum + b.wallet_balance, 0);

  const primaryNavItems = [
    { id: 'dashboard', label: `Portfolio${openTradesCount > 0 ? ` (${openTradesCount})` : ''}` },
    { id: 'intelligence', label: 'Market Intelligence' },
    { id: 'chart', label: 'Market Chart' },
    { id: 'backtest', label: 'Backtesting' },
    { id: 'strategy', label: 'Strategy Studio' },
  ];

  const secondaryNavItems = [
    { id: 'pairlist', label: 'Pairlists', icon: ListFilter },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'logs', label: 'Logs & API', icon: Terminal },
  ];

  return (
    <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 h-14">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-emerald-400 transition-colors cursor-pointer"
        >
          Freqtrade Studio
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {primaryNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-emerald-400 text-white font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenManualTrade}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            New Manual Order
          </button>
        </div>
      </header>

      {/* Secondary Workspace Toolbar */}
      <div className="border-t border-slate-900 bg-slate-900/40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2">
          {/* Left: Interactive Segmented Bot Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
              <button
                onClick={() => setSelectedBotId('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedBotId === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Bots (${totalWallet.toFixed(2)})
              </button>
              {bots.map((bot) => {
                const isSelected = selectedBotId === bot.id;
                return (
                  <button
                    key={bot.id}
                    onClick={() => setSelectedBotId(bot.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {bot.name} · :{bot.port}
                  </button>
                );
              })}
            </div>

            {/* Clean Unboxed Telemetry Metadata */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 pl-2 font-mono tabular-nums whitespace-nowrap">
              <span className="text-slate-300">{config.strategy}</span>
              <span aria-hidden="true">·</span>
              <span>{config.timeframe}</span>
              <span aria-hidden="true">·</span>
              <span>WARP {warpStatus === 'Connected & Healthy' ? 'Connected' : warpStatus}</span>
              {caffeinateActive && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Caffeinate Active</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Mobile View Links + Utility & Bot Execution Controls */}
          <div className="flex items-center gap-2">
            {/* Mobile Nav Fallback */}
            <div className="flex md:hidden items-center gap-1 overflow-x-auto">
              {primaryNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${
                    activeTab === item.id ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Secondary Views (Pairlists, Wallet & Logs) */}
            <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-emerald-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Bot Execution State Controls */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setBotState('running')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isRunning
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Play className="h-3 w-3" />
                <span>Running</span>
              </button>
              <button
                onClick={() => setBotState('stopped')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  !isRunning
                    ? 'bg-rose-500/20 text-rose-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Square className="h-3 w-3" />
                <span>Paused</span>
              </button>
              <button
                onClick={() => {
                  setBotState('reload');
                  setTimeout(() => setBotState('running'), 500);
                }}
                title="Reload Strategy Configuration"
                className="p-1 text-slate-400 hover:text-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <RotateCw className={`h-3.5 w-3.5 ${botState === 'reload' ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            <button
              onClick={onOpenSettings}
              title="Bot Configuration (config.json)"
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Config</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
