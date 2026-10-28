import React, { useState } from 'react';
import { 
  Terminal, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Code2
} from 'lucide-react';
import { LogEntry, BotConfig, Trade, BalanceItem } from '../types/freqtrade';

interface LogViewProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  config: BotConfig;
  openTrades: Trade[];
  closedTrades: Trade[];
  balances: BalanceItem[];
}

export const LogView: React.FC<LogViewProps> = ({
  logs,
  onClearLogs,
  config,
  openTrades,
  closedTrades,
  balances
}) => {
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [searchLog, setSearchLog] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // REST API Explorer state
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/v1/status');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLatency, setApiLatency] = useState<number>(12);

  const filteredLogs = logs.filter(log => {
    const matchLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchSearch = log.message.toLowerCase().includes(searchLog.toLowerCase()) ||
                        log.logger.toLowerCase().includes(searchLog.toLowerCase());
    return matchLevel && matchSearch;
  });

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level}] [${l.logger}]: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteApi = () => {
    const start = performance.now();
    let data: any = {};

    switch (selectedEndpoint) {
      case '/api/v1/ping':
        data = { status: 'pong' };
        break;
      case '/api/v1/version':
        data = { version: config.version };
        break;
      case '/api/v1/status':
        data = {
          bot_name: config.bot_name,
          state: 'running',
          dry_run: config.dry_run,
          strategy: config.strategy,
          timeframe: config.timeframe,
          exchange: config.exchange.name,
          open_trades_count: openTrades.length,
          max_open_trades: config.max_open_trades,
          open_trades: openTrades
        };
        break;
      case '/api/v1/trades':
        data = {
          trades: [...openTrades, ...closedTrades],
          total_trades: openTrades.length + closedTrades.length
        };
        break;
      case '/api/v1/balance':
        data = {
          currencies: balances,
          total: balances.reduce((sum, b) => sum + b.est_usd, 0),
          stake: config.stake_currency,
          symbol: 'USDT'
        };
        break;
      case '/api/v1/profit':
        const closedProfit = closedTrades.reduce((acc, t) => acc + t.profit_abs, 0);
        data = {
          profit_closed_coin: closedProfit,
          profit_closed_percent_mean: closedTrades.length > 0 ? closedProfit / config.dry_run_wallet * 100 : 0,
          profit_closed_fiat: closedProfit,
          profit_all_coin: closedProfit + openTrades.reduce((acc, t) => acc + t.profit_abs, 0),
          trade_count: closedTrades.length,
          first_trade_date: closedTrades[0]?.open_date || new Date().toISOString(),
          latest_trade_date: new Date().toISOString(),
          avg_duration: '45m'
        };
        break;
      case '/api/v1/pairlists':
        data = {
          name: 'VolumePairList',
          whitelist: config.exchange.pair_whitelist,
          blacklist: config.exchange.pair_blacklist
        };
        break;
      case '/api/v1/reload_config':
        data = { status: 'success', message: 'Reloading config initiated.' };
        break;
    }

    setApiLatency(Math.max(4, Math.round(performance.now() - start + 8)));
    setApiResponse(data);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="h-5 w-5 text-emerald-400" />
            Freqtrade System Logs & REST API
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time event streaming and interactive JSON REST API endpoint explorer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Logs'}</span>
          </button>
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Real-time Log Terminal */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
        {/* Terminal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs font-mono text-slate-400 ml-2">freqtrade.log</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="rounded border border-slate-800 bg-slate-950 pl-7 pr-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-36"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">ALL LEVELS</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="p-4 font-mono text-xs max-h-96 overflow-y-auto space-y-1.5 leading-relaxed bg-slate-950/95">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-8 font-sans">
              No matching log records found.
            </div>
          ) : (
            filteredLogs.map(log => {
              const isError = log.level === 'ERROR';
              const isWarning = log.level === 'WARNING';
              return (
                <div key={log.id} className="flex items-start gap-2 text-slate-300 hover:bg-slate-900/40 p-0.5 rounded">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span className={`shrink-0 font-bold px-1.5 rounded text-[10px] ${
                    isError ? 'bg-rose-500/20 text-rose-400' :
                    isWarning ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-800 text-teal-300'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-slate-400 font-semibold shrink-0">[{log.logger}]:</span>
                  <span className={isError ? 'text-rose-300' : isWarning ? 'text-amber-200' : 'text-slate-200'}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* REST API Explorer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Freqtrade REST API v1 Explorer
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Query the internal HTTP REST service matching Freqtrade's FastAPI specifications.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono font-medium text-white focus:outline-none focus:border-emerald-500 flex-1"
          >
            <option value="/api/v1/ping">GET /api/v1/ping - Healthcheck</option>
            <option value="/api/v1/version">GET /api/v1/version - Bot Version</option>
            <option value="/api/v1/status">GET /api/v1/status - Active Bot State</option>
            <option value="/api/v1/trades">GET /api/v1/trades - Open & Closed Trades</option>
            <option value="/api/v1/balance">GET /api/v1/balance - Wallet Balances</option>
            <option value="/api/v1/profit">GET /api/v1/profit - Realized Profit Summary</option>
            <option value="/api/v1/pairlists">GET /api/v1/pairlists - Active Whitelist</option>
            <option value="/api/v1/reload_config">POST /api/v1/reload_config - Trigger Config Reload</option>
          </select>

          <button
            onClick={handleExecuteApi}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 text-xs font-bold transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send Request</span>
          </button>
        </div>

        {apiResponse && (
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2 font-mono">
            <div className="flex items-center justify-between text-[11px] border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5">
                  200 OK
                </span>
                <span className="text-slate-400">Response Time: {apiLatency}ms</span>
              </div>
              <span className="text-slate-500">application/json</span>
            </div>
            <pre className="text-xs text-emerald-400/90 max-h-60 overflow-y-auto pt-2">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
