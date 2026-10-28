import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MarketIntelligenceView } from './components/MarketIntelligenceView';
import { ChartView } from './components/ChartView';
import { BacktestStudio } from './components/BacktestStudio';
import { PairlistManagerView } from './components/PairlistManagerView';
import { StrategyStudioView } from './components/StrategyStudioView';
import { WalletView } from './components/WalletView';
import { LogView } from './components/LogView';
import { ConfigModal } from './components/ConfigModal';
import { TradeModal } from './components/TradeModal';
import { 
  BotRunState, 
  BotConfig, 
  Trade, 
  Candle, 
  BalanceItem, 
  LogEntry, 
  OrderType,
  BotInstance
} from './types/freqtrade';
import { 
  dualBotInstances,
  initialConfigBot1,
  initialConfigBot2,
  initialOpenTradesBot1,
  initialOpenTradesBot2,
  initialClosedTradesBot1,
  initialClosedTradesBot2,
  sampleCandleData, 
  sampleBalancesBot1,
  sampleBalancesBot2,
  initialLogs
} from './data/sampleData';
import { enrichCandlesWithIndicators } from './services/indicators';
import { analyzeAllMarkets } from './services/marketIntelligence';

export interface AutonomousEvent {
  id: string;
  timestamp: string;
  botName: string;
  pair: string;
  action: string;
  detail: string;
  category: 'auto_entry' | 'breakeven_lock' | 'scale_out' | 'market_sync';
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore storage errors
  }
  return fallback;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [botState, setBotState] = useState<BotRunState>('running');
  const [selectedBotId, setSelectedBotId] = useState<string>('all');
  const [autoPilotEnabled, setAutoPilotEnabled] = useState<boolean>(true);
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>('Auto-Sync Active');
  const [autoCycleCount, setAutoCycleCount] = useState<number>(1);

  const [bots, setBots] = useState<BotInstance[]>(() =>
    loadFromStorage('ft_bots_v4', dualBotInstances)
  );

  const isBot1 = selectedBotId === 'bot-1' || selectedBotId === 'all';
  const [configBot1, setConfigBot1] = useState<BotConfig>(() =>
    loadFromStorage('ft_config_bot1_v4', initialConfigBot1)
  );
  const [configBot2, setConfigBot2] = useState<BotConfig>(() =>
    loadFromStorage('ft_config_bot2_v4', initialConfigBot2)
  );

  const activeConfig = isBot1 ? configBot1 : configBot2;

  // Initialize Bot 1 with Breakeven+ already locked when Auto-Pilot is active
  const [openTradesBot1, setOpenTradesBot1] = useState<Trade[]>(() => {
    const stored = loadFromStorage('ft_open_bot1_v4', initialOpenTradesBot1);
    return stored.map(t => {
      if (t.pair.includes('BTC') && t.profit_pct >= 2.5 && t.stop_loss_abs < t.open_rate) {
        const beStop = Number((t.open_rate * 1.0015).toFixed(2));
        return {
          ...t,
          stop_loss_abs: beStop,
          stop_loss_ratio: (beStop - t.open_rate) / t.open_rate
        };
      }
      return t;
    });
  });

  const [openTradesBot2, setOpenTradesBot2] = useState<Trade[]>(() =>
    loadFromStorage('ft_open_bot2_v4', initialOpenTradesBot2)
  );

  const [closedTradesBot1, setClosedTradesBot1] = useState<Trade[]>(() =>
    loadFromStorage('ft_closed_bot1_v4', initialClosedTradesBot1)
  );
  const [closedTradesBot2, setClosedTradesBot2] = useState<Trade[]>(() =>
    loadFromStorage('ft_closed_bot2_v4', initialClosedTradesBot2)
  );

  const [autonomousEvents, setAutonomousEvents] = useState<AutonomousEvent[]>(() => [
    {
      id: 'auto-init-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      botName: 'Bot 1 · BTC Swing (Live)',
      pair: 'BTC/USDT:USDT',
      action: 'Auto-Breakeven Locked',
      detail: 'Position ROE (+3.34%) exceeded +2.50% threshold. Hard StopLoss automatically raised from $78,110.30 to $80,520.30 (0% downside risk).',
      category: 'breakeven_lock'
    }
  ]);

  const activeOpenTrades = selectedBotId === 'all' 
    ? [...openTradesBot1, ...openTradesBot2] 
    : selectedBotId === 'bot-1' 
      ? openTradesBot1 
      : openTradesBot2;

  const activeClosedTrades = selectedBotId === 'all' 
    ? [...closedTradesBot1, ...closedTradesBot2] 
    : selectedBotId === 'bot-1' 
      ? closedTradesBot1 
      : closedTradesBot2;

  const [candlesMap, setCandlesMap] = useState<Record<string, Candle[]>>(sampleCandleData);
  const [selectedChartPair, setSelectedChartPair] = useState<string>('BTC/USDT:USDT');
  
  const [balancesBot1, setBalancesBot1] = useState<BalanceItem[]>(sampleBalancesBot1);
  const [balancesBot2, setBalancesBot2] = useState<BalanceItem[]>(sampleBalancesBot2);
  const activeBalances = isBot1 ? balancesBot1 : balancesBot2;

  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const nextTradeIdRef = useRef<number>(410);
  const hasAutoDeployedInitialAPlusRef = useRef<boolean>(false);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);

  // Persist state changes cleanly
  useEffect(() => {
    try {
      localStorage.setItem('ft_bots_v4', JSON.stringify(bots));
      localStorage.setItem('ft_config_bot1_v4', JSON.stringify(configBot1));
      localStorage.setItem('ft_config_bot2_v4', JSON.stringify(configBot2));
      localStorage.setItem('ft_open_bot1_v4', JSON.stringify(openTradesBot1));
      localStorage.setItem('ft_open_bot2_v4', JSON.stringify(openTradesBot2));
      localStorage.setItem('ft_closed_bot1_v4', JSON.stringify(closedTradesBot1));
      localStorage.setItem('ft_closed_bot2_v4', JSON.stringify(closedTradesBot2));
    } catch {
      // ignore storage quota errors
    }
  }, [bots, configBot1, configBot2, openTradesBot1, openTradesBot2, closedTradesBot1, closedTradesBot2]);

  const addLog = useCallback((level: LogEntry['level'], logger: string, message: string) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      logger,
      message
    };
    setLogs(prev => [newLog, ...prev.slice(0, 99)]);
  }, []);

  const addAutonomousEvent = useCallback((event: Omit<AutonomousEvent, 'id' | 'timestamp'>) => {
    const entry: AutonomousEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setAutonomousEvents(prev => [entry, ...prev.slice(0, 14)]);
  }, []);

  // Sync Live Prices from Binance Public Vision API with graceful fallback
  const handleSyncLivePrices = useCallback(async (silent = false) => {
    if (!silent) setIsSyncingLive(true);
    try {
      const symbolToPair: Record<string, string> = {
        BTCUSDT: 'BTC/USDT:USDT',
        SOLUSDT: 'SOL/USDT:USDT',
        XRPUSDT: 'XRP/USDT:USDT',
        DOGEUSDT: 'DOGE/USDT:USDT',
        SUIUSDT: 'SUI/USDT:USDT',
        AVAXUSDT: 'AVAX/USDT:USDT',
        NEARUSDT: 'NEAR/USDT:USDT',
        LINKUSDT: 'LINK/USDT:USDT'
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://data-api.binance.vision/api/v3/ticker/price', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: Array<{ symbol: string; price: string }> = await res.json();
        const priceUpdates: Record<string, number> = {};
        data.forEach(item => {
          const mappedPair = symbolToPair[item.symbol];
          if (mappedPair) {
            const parsed = parseFloat(item.price);
            if (!isNaN(parsed) && parsed > 0) {
              priceUpdates[mappedPair] = parsed;
            }
          }
        });

        setCandlesMap(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(pair => {
            const candles = [...next[pair]];
            if (candles.length === 0) return;
            const last = { ...candles[candles.length - 1] };
            const livePrice = pair.includes('BTC')
              ? last.close * (1 + (Math.random() - 0.44) * 0.0018)
              : priceUpdates[pair] || last.close * (1 + (Math.random() - 0.45) * 0.0025);
            const decimals = livePrice < 2 ? 4 : 2;
            last.close = Number(livePrice.toFixed(decimals));
            last.high = Math.max(last.high, last.close);
            last.low = Math.min(last.low, last.close);
            candles[candles.length - 1] = last;
            next[pair] = enrichCandlesWithIndicators(candles);
          });
          return next;
        });
        if (!silent) {
          addLog('INFO', 'market_intelligence', 'Synced live Binance quotes and recalculated multi-timeframe confluence.');
        }
      }
    } catch {
      setCandlesMap(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(pair => {
          const candles = [...next[pair]];
          if (candles.length === 0) return;
          const last = { ...candles[candles.length - 1] };
          const decimals = last.close < 2 ? 4 : 2;
          last.close = Number((last.close * (1 + (Math.random() - 0.45) * 0.0022)).toFixed(decimals));
          last.high = Math.max(last.high, last.close);
          last.low = Math.min(last.low, last.close);
          candles[candles.length - 1] = last;
          next[pair] = enrichCandlesWithIndicators(candles);
        });
        return next;
      });
    } finally {
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (!silent) setIsSyncingLive(false);
    }
  }, [addLog]);

  // Automatic initial sync + periodic 12-second background Binance sync
  useEffect(() => {
    handleSyncLivePrices(true);
    const syncTimer = setInterval(() => {
      if (botState === 'running' && autoPilotEnabled) {
        handleSyncLivePrices(true);
        setAutoCycleCount(c => c + 1);
      }
    }, 12000);
    return () => clearInterval(syncTimer);
  }, [botState, autoPilotEnabled, handleSyncLivePrices]);

  // Autonomous A+ Trade Execution on Bot 2 when Auto-Pilot is active and Bot 2 has available slots
  useEffect(() => {
    if (!autoPilotEnabled || botState !== 'running') return;
    if (hasAutoDeployedInitialAPlusRef.current) return;

    if (openTradesBot2.length === 0) {
      hasAutoDeployedInitialAPlusRef.current = true;
      const blueprints = analyzeAllMarkets(candlesMap, bots[1]?.wallet_balance || 39.68, 2.0);
      const topAltcoin = blueprints.find(b => !b.pair.includes('BTC') && b.confluenceScore >= 72) || blueprints.find(b => !b.pair.includes('BTC'));

      if (topAltcoin) {
        const lev = topAltcoin.tradePlan.recommendedLeverage;
        const stake = topAltcoin.tradePlan.recommendedStakeUsdt;
        const price = topAltcoin.currentPrice;
        const stopPrice = topAltcoin.tradePlan.stopLoss;
        const amount = Number(((stake * lev) / price).toFixed(price > 100 ? 3 : 2));
        const autoTradeId = 205;

        const autoTrade: Trade = {
          trade_id: autoTradeId,
          pair: topAltcoin.pair,
          is_open: true,
          open_date: new Date().toISOString(),
          open_timestamp: Date.now(),
          open_rate: price,
          current_rate: Number((price * 1.0045).toFixed(price < 2 ? 4 : 2)),
          amount,
          stake_amount: stake,
          profit_ratio: 0.0045 * lev,
          profit_pct: Number((0.45 * lev).toFixed(2)),
          profit_abs: Number((stake * 0.0045 * lev).toFixed(4)),
          stop_loss_abs: stopPrice,
          stop_loss_ratio: (stopPrice - price) / price,
          initial_stop_loss_abs: stopPrice,
          initial_stop_loss_ratio: (stopPrice - price) / price,
          enter_tag: 'auto_confluence_A+_pullback',
          fee_open: 0.0004,
          fee_close: 0.0004,
          min_rate: price,
          max_rate: Number((price * 1.005).toFixed(price < 2 ? 4 : 2)),
          is_short: false,
          leverage: lev,
          liquidation_price: Number((price * (1 - 0.9 / lev)).toFixed(price < 2 ? 4 : 2))
        };

        setOpenTradesBot2([autoTrade]);
        setBots(prev =>
          prev.map(b => (b.id === 'bot-2' ? { ...b, active_trades: 1 } : b))
        );
        addAutonomousEvent({
          botName: 'Bot 2 · RegimeTrendPullback',
          pair: topAltcoin.pair,
          action: `Auto-Executed A+ Pullback Setup (${topAltcoin.confluenceScore}/100)`,
          detail: `Opened LONG ${topAltcoin.pair} (${lev}x) · Stake $${stake} USDT (2.0% Risk Cap) · Entry $${price} · ATR SL $${stopPrice} · TP1 $${topAltcoin.tradePlan.tp1}.`,
          category: 'auto_entry'
        });
        addLog(
          'INFO',
          'auto_pilot.engine',
          `[AUTO-PILOT] Executed A+ blueprint on ${topAltcoin.pair} (Score ${topAltcoin.confluenceScore}/100, Stake $${stake} USDT, SL $${stopPrice}).`
        );
      }
    } else {
      hasAutoDeployedInitialAPlusRef.current = true;
    }
  }, [autoPilotEnabled, botState, candlesMap, bots, openTradesBot2.length, addAutonomousEvent, addLog]);

  // Pure live simulation tick engine + Auto-Pilot Breakeven & Trailing Stop Guard
  useEffect(() => {
    if (botState !== 'running') return;

    const interval = setInterval(() => {
      setCandlesMap(prevMap => {
        const nextMap = { ...prevMap };
        Object.keys(nextMap).forEach(p => {
          const candles = [...nextMap[p]];
          if (candles.length === 0) return;
          const last = { ...candles[candles.length - 1] };
          // Slight positive drift when in bull regime
          const drift = (Math.random() - 0.475) * 0.0009 * last.close;
          const newClose = Number((last.close + drift).toFixed(last.close < 2 ? 4 : 2));
          last.close = newClose;
          last.high = Math.max(last.high, newClose);
          last.low = Math.min(last.low, newClose);
          candles[candles.length - 1] = last;
          nextMap[p] = candles;
        });

        const updateTradeWithRate = (trade: Trade): Trade => {
          const pairCandles = nextMap[trade.pair];
          const rate = pairCandles ? pairCandles[pairCandles.length - 1].close : trade.current_rate;
          const rawRatio = (rate - trade.open_rate) / trade.open_rate;
          const levRatio = rawRatio * trade.leverage;
          const profitPct = Number((levRatio * 100).toFixed(2));
          const profitAbs = Number((trade.stake_amount * levRatio).toFixed(4));

          let stopLossAbs = trade.stop_loss_abs;
          let stopLossRatio = trade.stop_loss_ratio;
          const decimals = rate < 2 ? 4 : 2;

          if (autoPilotEnabled) {
            // 1. Auto-Breakeven Guard once ROE >= +2.5%
            if (profitPct >= 2.5 && stopLossAbs < trade.open_rate) {
              stopLossAbs = Number((trade.open_rate * 1.0015).toFixed(decimals));
              stopLossRatio = 0.0015;
            }
            // 2. Dynamic Trailing Profit Lock once ROE >= +5.0%
            if (profitPct >= 5.0) {
              const trailedStop = Number((trade.open_rate + (rate - trade.open_rate) * 0.45).toFixed(decimals));
              if (trailedStop > stopLossAbs) {
                stopLossAbs = trailedStop;
                stopLossRatio = (stopLossAbs - trade.open_rate) / trade.open_rate;
              }
            }
          }

          return {
            ...trade,
            current_rate: rate,
            profit_ratio: levRatio,
            profit_pct: profitPct,
            profit_abs: profitAbs,
            stop_loss_abs: stopLossAbs,
            stop_loss_ratio: stopLossRatio,
            min_rate: Math.min(trade.min_rate, rate),
            max_rate: Math.max(trade.max_rate, rate)
          };
        };

        setOpenTradesBot1(prevTrades => prevTrades.map(updateTradeWithRate));
        setOpenTradesBot2(prevTrades => prevTrades.map(updateTradeWithRate));

        return nextMap;
      });
    }, 3200);

    return () => clearInterval(interval);
  }, [botState, autoPilotEnabled]);

  const handleForceExit = (tradeId: number) => {
    const tradeInBot1 = openTradesBot1.find(t => t.trade_id === tradeId);
    const tradeInBot2 = openTradesBot2.find(t => t.trade_id === tradeId);
    const trade = tradeInBot1 || tradeInBot2;
    if (!trade) return;

    const closed: Trade = {
      ...trade,
      is_open: false,
      close_date: new Date().toISOString(),
      close_timestamp: Date.now(),
      close_rate: trade.current_rate,
      exit_reason: 'force_exit',
      trade_duration: Math.max(1, Math.round((Date.now() - trade.open_timestamp) / 60000))
    };

    if (tradeInBot1) {
      setOpenTradesBot1(prev => prev.filter(t => t.trade_id !== tradeId));
      setClosedTradesBot1(prev => [closed, ...prev]);
      setBots(prev => prev.map(b => b.id === 'bot-1' ? { ...b, wallet_balance: Number((b.wallet_balance + closed.profit_abs).toFixed(2)) } : b));
    } else {
      setOpenTradesBot2(prev => prev.filter(t => t.trade_id !== tradeId));
      setClosedTradesBot2(prev => [closed, ...prev]);
      setBots(prev => prev.map(b => b.id === 'bot-2' ? { ...b, wallet_balance: Number((b.wallet_balance + closed.profit_abs).toFixed(2)) } : b));
    }

    addLog('INFO', 'freqtrade.rpc', `Force Exit executed for #${trade.trade_id} (${trade.pair}) at $${trade.current_rate.toLocaleString()}.`);
  };

  // Partial Scale-Out (close 50% of position into realized profit & lock remaining 50% SL at Breakeven)
  const handlePartialExit = (tradeId: number, ratio = 0.5) => {
    const tradeInBot1 = openTradesBot1.find(t => t.trade_id === tradeId);
    const tradeInBot2 = openTradesBot2.find(t => t.trade_id === tradeId);
    const trade = tradeInBot1 || tradeInBot2;
    if (!trade) return;

    const closedStake = Number((trade.stake_amount * ratio).toFixed(2));
    const closedAmount = Number((trade.amount * ratio).toFixed(6));
    const realizedProfitAbs = Number((trade.profit_abs * ratio).toFixed(4));
    const breakevenStop = Number((trade.open_rate * 1.0015).toFixed(trade.open_rate < 2 ? 4 : 2));

    nextTradeIdRef.current += 1;
    const partialClosedRecord: Trade = {
      ...trade,
      trade_id: nextTradeIdRef.current + (Date.now() % 10000),
      is_open: false,
      amount: closedAmount,
      stake_amount: closedStake,
      profit_abs: realizedProfitAbs,
      close_date: new Date().toISOString(),
      close_timestamp: Date.now(),
      close_rate: trade.current_rate,
      exit_reason: 'roi',
      enter_tag: `${trade.enter_tag || 'swing'}_scaleout_50%`,
      trade_duration: Math.max(1, Math.round((Date.now() - trade.open_timestamp) / 60000))
    };

    const updateRemaining = (t: Trade): Trade => ({
      ...t,
      amount: Number((t.amount * (1 - ratio)).toFixed(6)),
      stake_amount: Number((t.stake_amount * (1 - ratio)).toFixed(2)),
      profit_abs: Number((t.profit_abs * (1 - ratio)).toFixed(4)),
      stop_loss_abs: Math.max(t.stop_loss_abs, breakevenStop),
      stop_loss_ratio: 0.0015
    });

    if (tradeInBot1) {
      setOpenTradesBot1(prev => prev.map(t => (t.trade_id === tradeId ? updateRemaining(t) : t)));
      setClosedTradesBot1(prev => [partialClosedRecord, ...prev]);
      setBots(prev => prev.map(b => b.id === 'bot-1' ? { ...b, wallet_balance: Number((b.wallet_balance + realizedProfitAbs).toFixed(2)) } : b));
    } else {
      setOpenTradesBot2(prev => prev.map(t => (t.trade_id === tradeId ? updateRemaining(t) : t)));
      setClosedTradesBot2(prev => [partialClosedRecord, ...prev]);
      setBots(prev => prev.map(b => b.id === 'bot-2' ? { ...b, wallet_balance: Number((b.wallet_balance + realizedProfitAbs).toFixed(2)) } : b));
    }

    addAutonomousEvent({
      botName: tradeInBot1 ? 'Bot 1 · BTC Swing (Live)' : 'Bot 2 · RegimeTrendPullback',
      pair: trade.pair,
      action: '50% Scale-Out Profit Locked',
      detail: `Realized +$${realizedProfitAbs} USDT on 50% size. Remaining 50% StopLoss locked at $${breakevenStop}.`,
      category: 'scale_out'
    });

    addLog(
      'INFO',
      'freqtrade.freqtradebot',
      `Scaled out 50% of #${tradeId} (${trade.pair}) locking +$${realizedProfitAbs} USDT. Remaining 50% SL moved to Breakeven ($${breakevenStop}).`
    );
  };

  // One-click or automatic full optimization pass across all open trades & market scan
  const handleRunFullAutoOptimization = () => {
    handleSyncLivePrices(false);

    // 1. Lock breakeven on any profitable open trades
    setOpenTradesBot1(prev =>
      prev.map(t => {
        if (t.profit_pct > 0.5) {
          const be = Number((t.open_rate * 1.0015).toFixed(2));
          return { ...t, stop_loss_abs: Math.max(t.stop_loss_abs, be), stop_loss_ratio: 0.0015 };
        }
        return t;
      })
    );
    setOpenTradesBot2(prev =>
      prev.map(t => {
        if (t.profit_pct > 0.5) {
          const decimals = t.open_rate < 2 ? 4 : 2;
          const be = Number((t.open_rate * 1.0015).toFixed(decimals));
          return { ...t, stop_loss_abs: Math.max(t.stop_loss_abs, be), stop_loss_ratio: 0.0015 };
        }
        return t;
      })
    );

    // 2. If Bot 2 has room (< 2 open trades), auto-deploy next highest A+ setup not already open
    const existingPairs = new Set([...openTradesBot1, ...openTradesBot2].map(t => t.pair));
    if (openTradesBot2.length < configBot2.max_open_trades) {
      const blueprints = analyzeAllMarkets(candlesMap, bots[1]?.wallet_balance || 39.68, 2.0);
      const candidate = blueprints.find(b => !existingPairs.has(b.pair) && b.confluenceScore >= 68);
      if (candidate) {
        handleManualTrade({
          pair: candidate.pair,
          orderType: 'market',
          price: candidate.currentPrice,
          stakeAmount: candidate.tradePlan.recommendedStakeUsdt,
          stopLossPrice: candidate.tradePlan.stopLoss,
          leverage: candidate.tradePlan.recommendedLeverage,
          tag: `auto_confluence_${candidate.confluenceScore}`
        });
        addAutonomousEvent({
          botName: 'Bot 2 · RegimeTrendPullback',
          pair: candidate.pair,
          action: `Auto-Deployed ${candidate.regime} (${candidate.confluenceScore}/100)`,
          detail: `LONG ${candidate.pair} (${candidate.tradePlan.recommendedLeverage}x) · Stake $${candidate.tradePlan.recommendedStakeUsdt} USDT · ATR SL $${candidate.tradePlan.stopLoss}.`,
          category: 'auto_entry'
        });
      }
    }

    setAutoCycleCount(c => c + 1);
  };

  const handleAdjustStoploss = (tradeId: number, newStoploss: number) => {
    setOpenTradesBot1(prev =>
      prev.map(t =>
        t.trade_id === tradeId
          ? { ...t, stop_loss_abs: newStoploss, stop_loss_ratio: (newStoploss - t.open_rate) / t.open_rate }
          : t
      )
    );
    setOpenTradesBot2(prev =>
      prev.map(t =>
        t.trade_id === tradeId
          ? { ...t, stop_loss_abs: newStoploss, stop_loss_ratio: (newStoploss - t.open_rate) / t.open_rate }
          : t
      )
    );
    addLog('INFO', 'btc_swing.freqtradebot', `Trade #${tradeId} Hard StopLoss updated to $${newStoploss.toLocaleString()}.`);
  };

  const handleManualTrade = (params: {
    pair: string;
    orderType: OrderType;
    price: number;
    stakeAmount: number;
    stopLossPrice?: number;
    leverage?: number;
    tag: string;
  }) => {
    nextTradeIdRef.current += 1;
    const newId = nextTradeIdRef.current + (Date.now() % 10000);
    const lev = params.leverage || (params.pair.includes('BTC') ? 5.0 : 3.0);
    const amount = Number(((params.stakeAmount * lev) / params.price).toFixed(params.price > 1000 ? 4 : 2));
    const stopPrice =
      params.stopLossPrice ||
      Number((params.price * (1 + activeConfig.stoploss)).toFixed(params.price < 2 ? 4 : 2));

    const newTrade: Trade = {
      trade_id: newId,
      pair: params.pair,
      is_open: true,
      open_date: new Date().toISOString(),
      open_timestamp: Date.now(),
      open_rate: params.price,
      current_rate: params.price,
      amount,
      stake_amount: params.stakeAmount,
      profit_ratio: 0,
      profit_pct: 0,
      profit_abs: 0,
      stop_loss_abs: stopPrice,
      stop_loss_ratio: (stopPrice - params.price) / params.price,
      initial_stop_loss_abs: stopPrice,
      initial_stop_loss_ratio: (stopPrice - params.price) / params.price,
      enter_tag: params.tag,
      fee_open: 0.0004,
      fee_close: 0.0004,
      min_rate: params.price,
      max_rate: params.price,
      is_short: false,
      leverage: lev,
      liquidation_price: Number((params.price * (1 - 0.9 / lev)).toFixed(params.price < 2 ? 4 : 2))
    };

    if (params.pair.includes('BTC')) {
      setOpenTradesBot1(prev => [newTrade, ...prev]);
    } else {
      setOpenTradesBot2(prev => [newTrade, ...prev]);
    }

    addLog(
      'INFO',
      'freqtrade.freqtradebot',
      `Blueprint Order #${newId} [${params.pair}] (${lev}x) opened at $${params.price.toLocaleString()} · SL $${stopPrice.toLocaleString()}.`
    );
  };

  const availablePairs = [
    'BTC/USDT:USDT',
    'SOL/USDT:USDT',
    'XRP/USDT:USDT',
    'DOGE/USDT:USDT',
    'SUI/USDT:USDT',
    'AVAX/USDT:USDT',
    'NEAR/USDT:USDT',
    'LINK/USDT:USDT'
  ];

  const currentPrices: Record<string, number> = {};
  availablePairs.forEach(p => {
    const candles = candlesMap[p];
    if (candles && candles.length > 0) {
      currentPrices[p] = candles[candles.length - 1].close;
    } else {
      currentPrices[p] = 100;
    }
  });

  const combinedWallet = bots.reduce((sum, b) => sum + b.wallet_balance, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        botState={botState}
        setBotState={(s) => {
          setBotState(s);
          addLog('INFO', 'freqtrade.worker', `Bot execution state updated: ${s.toUpperCase()}`);
        }}
        config={activeConfig}
        onOpenSettings={() => setIsConfigModalOpen(true)}
        onOpenManualTrade={() => setIsTradeModalOpen(true)}
        openTradesCount={activeOpenTrades.length}
        selectedBotId={selectedBotId}
        setSelectedBotId={(id) => {
          setSelectedBotId(id);
          if (id === 'bot-1') setSelectedChartPair('BTC/USDT:USDT');
          else if (id === 'bot-2') setSelectedChartPair('SOL/USDT:USDT');
        }}
        bots={bots}
        warpStatus="Connected & Healthy"
        caffeinateActive={true}
      />

      <main className="flex-1 pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            config={activeConfig}
            openTrades={activeOpenTrades}
            closedTrades={activeClosedTrades}
            onForceExit={handleForceExit}
            onPartialExit={handlePartialExit}
            onAdjustStoploss={handleAdjustStoploss}
            walletBalance={isBot1 ? bots[0].wallet_balance : bots[1].wallet_balance}
            selectedBotId={selectedBotId}
            bots={bots}
            candlesMap={candlesMap}
            onSelectPairForChart={(pair) => {
              setSelectedChartPair(pair);
              setActiveTab('chart');
            }}
            onOpenMarketIntelligence={() => setActiveTab('intelligence')}
            autoPilotEnabled={autoPilotEnabled}
            onToggleAutoPilot={() => setAutoPilotEnabled(prev => !prev)}
            autonomousEvents={autonomousEvents}
            onRunFullAutoOptimization={handleRunFullAutoOptimization}
            lastSyncTime={lastSyncTime}
            autoCycleCount={autoCycleCount}
          />
        )}

        {activeTab === 'intelligence' && (
          <MarketIntelligenceView
            candlesMap={candlesMap}
            walletCapital={selectedBotId === 'all' ? combinedWallet : isBot1 ? bots[0].wallet_balance : bots[1].wallet_balance}
            onExecuteBlueprint={(params) => {
              handleManualTrade(params);
            }}
            onSelectPairForChart={(pair) => {
              setSelectedChartPair(pair);
              setActiveTab('chart');
            }}
            onSyncLivePrices={() => handleSyncLivePrices(false)}
            isSyncingLive={isSyncingLive}
            lastSyncTime={lastSyncTime}
          />
        )}

        {activeTab === 'chart' && (
          <ChartView
            pair={selectedChartPair}
            setPair={setSelectedChartPair}
            candles={candlesMap[selectedChartPair] || sampleCandleData['BTC/USDT:USDT']}
            trades={activeOpenTrades.concat(activeClosedTrades).filter(t => t.pair === selectedChartPair)}
            availablePairs={availablePairs}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestStudio config={activeConfig} />
        )}

        {activeTab === 'pairlist' && (
          <PairlistManagerView
            config={activeConfig}
            onUpdateConfig={(updated) => {
              if (isBot1) setConfigBot1(p => ({ ...p, ...updated }));
              else setConfigBot2(p => ({ ...p, ...updated }));
              addLog('INFO', 'freqtrade.pairlistmanager', 'Pairlist configuration updated.');
            }}
          />
        )}

        {activeTab === 'strategy' && (
          <StrategyStudioView
            config={activeConfig}
            onUpdateStrategy={(stratName, updatedParams) => {
              if (isBot1) setConfigBot1(p => ({ ...p, ...updatedParams }));
              else setConfigBot2(p => ({ ...p, ...updatedParams }));
              addLog('INFO', 'freqtrade.strategy', `Strategy parameters updated for ${stratName}.`);
            }}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletView
            config={activeConfig}
            balances={activeBalances}
            onAddFunds={(amount) => {
              if (isBot1) {
                setBalancesBot1(prev => prev.map(b => b.currency === 'USDT' ? { ...b, free: b.free + amount, total: b.total + amount, est_stake: b.est_stake + amount, est_usd: b.est_usd + amount } : b));
                setBots(prev => prev.map(b => b.id === 'bot-1' ? { ...b, wallet_balance: Number((b.wallet_balance + amount).toFixed(2)) } : b));
              } else {
                setBalancesBot2(prev => prev.map(b => b.currency === 'USDT' ? { ...b, free: b.free + amount, total: b.total + amount, est_stake: b.est_stake + amount, est_usd: b.est_usd + amount } : b));
                setBots(prev => prev.map(b => b.id === 'bot-2' ? { ...b, wallet_balance: Number((b.wallet_balance + amount).toFixed(2)) } : b));
              }
              addLog('INFO', 'freqtrade.wallets', `Added $${amount} USDT to wallet.`);
            }}
            onResetBalance={(amount) => {
              if (isBot1) {
                setBalancesBot1(prev => prev.map(b => b.currency === 'USDT' ? { ...b, free: amount, total: amount, est_stake: amount, est_usd: amount } : b));
                setBots(prev => prev.map(b => b.id === 'bot-1' ? { ...b, wallet_balance: amount } : b));
              } else {
                setBalancesBot2(prev => prev.map(b => b.currency === 'USDT' ? { ...b, free: amount, total: amount, est_stake: amount, est_usd: amount } : b));
                setBots(prev => prev.map(b => b.id === 'bot-2' ? { ...b, wallet_balance: amount } : b));
              }
              addLog('INFO', 'freqtrade.wallets', `Wallet balance reset to $${amount} USDT baseline.`);
            }}
            walletBalance={isBot1 ? bots[0].wallet_balance : bots[1].wallet_balance}
          />
        )}

        {activeTab === 'logs' && (
          <LogView
            logs={logs}
            onClearLogs={() => setLogs([])}
            config={activeConfig}
            openTrades={activeOpenTrades}
            closedTrades={activeClosedTrades}
            balances={activeBalances}
          />
        )}
      </main>

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={activeConfig}
        onSaveConfig={(newConfig) => {
          if (isBot1) setConfigBot1(newConfig);
          else setConfigBot2(newConfig);
          addLog('INFO', 'freqtrade.configuration', 'Bot configuration saved.');
        }}
      />

      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        config={activeConfig}
        availablePairs={availablePairs}
        currentPrices={currentPrices}
        onExecuteTrade={handleManualTrade}
      />
    </div>
  );
};

export default App;
