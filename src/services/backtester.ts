import { BacktestSettings, BacktestResult, Trade, Candle } from '../types/freqtrade';
import { generateCandles } from '../data/sampleData';
import { enrichCandlesWithIndicators } from './indicators';

export function runBacktest(
  settings: BacktestSettings,
  onProgress?: (pct: number) => void
): BacktestResult {
  const candlesCount = 300;
  const basePrice = settings.pair.includes('BTC')
    ? 80971.30
    : settings.pair.includes('SOL')
      ? 176.40
      : settings.pair.includes('AVAX')
        ? 28.75
        : settings.pair.includes('LINK')
          ? 14.65
          : settings.pair.includes('NEAR')
            ? 5.08
            : settings.pair.includes('SUI')
              ? 2.045
              : settings.pair.includes('XRP')
                ? 0.578
                : 0.1415;
  const volatility = 0.007;

  // Generate extended candles for backtesting
  const rawCandles = generateCandles(basePrice, volatility, candlesCount);
  const candles = enrichCandlesWithIndicators(rawCandles, 32, 68);

  const trades: Trade[] = [];
  let balance = settings.starting_balance;
  let activeTrades: Trade[] = [];
  let nextTradeId = 1;
  const equityCurve: { date: string; balance: number; drawdown: number }[] = [];
  let peakBalance = balance;
  let maxDrawdownAbs = 0;
  let maxDrawdownPct = 0;

  // Sorted ROI ladder descending by duration in minutes
  const roiLadder = Object.entries(settings.minimal_roi)
    .map(([minStr, target]) => ({ min: Number(minStr), target }))
    .sort((a, b) => b.min - a.min);

  for (let i = 25; i < candles.length; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];

    if (onProgress && i % 30 === 0) {
      onProgress(Math.floor((i / candles.length) * 100));
    }

    // 1. Process active trades for exits
    const stillActive: Trade[] = [];

    for (const trade of activeTrades) {
      const durationMinutes = (candle.timestamp - trade.open_timestamp) / (60 * 1000);
      trade.trade_duration = durationMinutes;
      trade.current_rate = candle.close;
      trade.min_rate = Math.min(trade.min_rate, candle.low);
      trade.max_rate = Math.max(trade.max_rate, candle.high);

      const profitRatio = (candle.close - trade.open_rate) / trade.open_rate;
      trade.profit_ratio = profitRatio;
      trade.profit_pct = Number((profitRatio * 100).toFixed(2));
      trade.profit_abs = Number((trade.stake_amount * profitRatio).toFixed(2));

      // Trailing stoploss logic
      if (settings.trailing_stop && profitRatio > 0.015) {
        const potentialNewStop = candle.close * (1 - 0.02);
        if (potentialNewStop > trade.stop_loss_abs) {
          trade.stop_loss_abs = potentialNewStop;
          trade.stop_loss_ratio = (potentialNewStop - trade.open_rate) / trade.open_rate;
        }
      }

      let exited = false;
      let exitReason: Trade['exit_reason'] = undefined;
      let exitRate = candle.close;

      // Check Stoploss hit
      if (candle.low <= trade.stop_loss_abs) {
        exited = true;
        exitReason = trade.stop_loss_abs > trade.open_rate ? 'trailing_stop_loss' : 'stop_loss';
        exitRate = trade.stop_loss_abs;
      }

      // Check Minimal ROI table
      if (!exited) {
        for (const tier of roiLadder) {
          if (durationMinutes >= tier.min && profitRatio >= tier.target) {
            exited = true;
            exitReason = 'roi';
            exitRate = candle.close;
            break;
          }
        }
      }

      // Check Strategy Sell Signal
      if (!exited && candle.sell_signal) {
        exited = true;
        exitReason = 'exit_signal';
        exitRate = candle.close;
      }

      if (exited) {
        trade.is_open = false;
        trade.close_date = candle.date;
        trade.close_timestamp = candle.timestamp;
        trade.close_rate = exitRate;
        const finalRatio = (exitRate - trade.open_rate) / trade.open_rate;
        trade.profit_ratio = finalRatio;
        trade.profit_pct = Number((finalRatio * 100).toFixed(2));
        trade.profit_abs = Number((trade.stake_amount * finalRatio).toFixed(2));
        trade.exit_reason = exitReason;

        balance += trade.profit_abs;
        trades.push(trade);
      } else {
        stillActive.push(trade);
      }
    }

    activeTrades = stillActive;

    // 2. Check for new Buy Entry Signal
    if (activeTrades.length < settings.max_open_trades && balance >= settings.stake_amount) {
      if (candle.buy_signal && !prevCandle.buy_signal) {
        const openRate = candle.close;
        const stoplossPrice = openRate * (1 + settings.stoploss);
        const amount = Number((settings.stake_amount / openRate).toFixed(6));

        const newTrade: Trade = {
          trade_id: nextTradeId++,
          pair: settings.pair,
          is_open: true,
          open_date: candle.date,
          open_timestamp: candle.timestamp,
          open_rate: openRate,
          current_rate: openRate,
          amount,
          stake_amount: settings.stake_amount,
          profit_ratio: 0,
          profit_pct: 0,
          profit_abs: 0,
          stop_loss_abs: stoplossPrice,
          stop_loss_ratio: settings.stoploss,
          initial_stop_loss_abs: stoplossPrice,
          initial_stop_loss_ratio: settings.stoploss,
          enter_tag: 'backtest_entry',
          fee_open: 0.001,
          fee_close: 0.001,
          min_rate: openRate,
          max_rate: openRate,
          is_short: false,
          leverage: 1.0
        };

        activeTrades.push(newTrade);
      }
    }

    // Equity track
    if (balance > peakBalance) {
      peakBalance = balance;
    }
    const currentDrawdownAbs = peakBalance - balance;
    const currentDrawdownPct = peakBalance > 0 ? (currentDrawdownAbs / peakBalance) * 100 : 0;
    if (currentDrawdownAbs > maxDrawdownAbs) maxDrawdownAbs = currentDrawdownAbs;
    if (currentDrawdownPct > maxDrawdownPct) maxDrawdownPct = currentDrawdownPct;

    equityCurve.push({
      date: candle.date.slice(0, 16).replace('T', ' '),
      balance: Number(balance.toFixed(2)),
      drawdown: Number(currentDrawdownPct.toFixed(2))
    });
  }

  // Force close remaining open trades at the end of the backtest
  const lastCandle = candles[candles.length - 1];
  for (const trade of activeTrades) {
    trade.is_open = false;
    trade.close_date = lastCandle.date;
    trade.close_timestamp = lastCandle.timestamp;
    trade.close_rate = lastCandle.close;
    const finalRatio = (lastCandle.close - trade.open_rate) / trade.open_rate;
    trade.profit_ratio = finalRatio;
    trade.profit_pct = Number((finalRatio * 100).toFixed(2));
    trade.profit_abs = Number((trade.stake_amount * finalRatio).toFixed(2));
    trade.exit_reason = 'force_exit';
    balance += trade.profit_abs;
    trades.push(trade);
  }

  // Calculate Metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.profit_abs > 0);
  const losingTrades = trades.filter(t => t.profit_abs < 0);
  const drawTrades = trades.filter(t => t.profit_abs === 0);
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const totalProfitAbs = trades.reduce((sum, t) => sum + t.profit_abs, 0);
  const totalProfitPct = (totalProfitAbs / settings.starting_balance) * 100;
  const avgProfitPct = totalTrades > 0 ? trades.reduce((sum, t) => sum + t.profit_pct, 0) / totalTrades : 0;
  const avgDurationMinutes = totalTrades > 0 ? trades.reduce((sum, t) => sum + (t.trade_duration || 0), 0) / totalTrades : 0;

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.profit_abs, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit_abs, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.0 : 1.0;

  const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.profit_pct)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.profit_pct)) : 0;

  // Sharpe and Sortino ratios
  const returns = trades.map(t => t.profit_ratio);
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 1
    ? returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(365) : 0;

  const downReturns = returns.filter(r => r < 0);
  const downVariance = downReturns.length > 1
    ? downReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downReturns.length
    : 0.0001;
  const sortino = downVariance > 0 ? (meanReturn / Math.sqrt(downVariance)) * Math.sqrt(365) : 0;
  const calmar = maxDrawdownPct > 0 ? (totalProfitPct / maxDrawdownPct) : totalProfitPct > 0 ? 10 : 0;

  // Daily profit aggregation
  const dailyMap: Record<string, { profit_abs: number; profit_pct: number; trades: number }> = {};
  trades.forEach(t => {
    const day = (t.close_date || t.open_date).slice(0, 10);
    if (!dailyMap[day]) {
      dailyMap[day] = { profit_abs: 0, profit_pct: 0, trades: 0 };
    }
    dailyMap[day].profit_abs += t.profit_abs;
    dailyMap[day].profit_pct += t.profit_pct;
    dailyMap[day].trades += 1;
  });

  const dailyProfits = Object.entries(dailyMap).map(([date, d]) => ({
    date,
    profit_abs: Number(d.profit_abs.toFixed(2)),
    profit_pct: Number(d.profit_pct.toFixed(2)),
    trades: d.trades
  }));

  // Exit reasons breakdown
  const exitBreakdown: Record<string, { count: number; profit_abs: number; profit_pct: number }> = {};
  trades.forEach(t => {
    const r = t.exit_reason || 'unknown';
    if (!exitBreakdown[r]) {
      exitBreakdown[r] = { count: 0, profit_abs: 0, profit_pct: 0 };
    }
    exitBreakdown[r].count += 1;
    exitBreakdown[r].profit_abs += t.profit_abs;
    exitBreakdown[r].profit_pct += t.profit_pct;
  });

  return {
    run_id: 'bt_' + Math.random().toString(36).substring(2, 9),
    strategy_name: settings.strategy,
    timeframe: settings.timeframe,
    date_start: candles[0].date,
    date_end: candles[candles.length - 1].date,
    trades: trades.sort((a, b) => (b.close_timestamp || 0) - (a.close_timestamp || 0)),
    metrics: {
      total_trades: totalTrades,
      winning_trades: winningTrades.length,
      losing_trades: losingTrades.length,
      draw_trades: drawTrades.length,
      win_rate: Number(winRate.toFixed(2)),
      total_profit_abs: Number(totalProfitAbs.toFixed(2)),
      total_profit_pct: Number(totalProfitPct.toFixed(2)),
      avg_profit_pct: Number(avgProfitPct.toFixed(2)),
      avg_duration_minutes: Math.round(avgDurationMinutes),
      best_trade_pct: Number(bestTrade.toFixed(2)),
      worst_trade_pct: Number(worstTrade.toFixed(2)),
      max_drawdown_pct: Number(maxDrawdownPct.toFixed(2)),
      max_drawdown_abs: Number(maxDrawdownAbs.toFixed(2)),
      sharpe_ratio: Number(sharpe.toFixed(2)),
      sortino_ratio: Number(sortino.toFixed(2)),
      calmar_ratio: Number(calmar.toFixed(2)),
      profit_factor: Number(profitFactor.toFixed(2)),
      expectancy: Number((winRate / 100 * (bestTrade || 1) - (1 - winRate / 100) * Math.abs(worstTrade || 1)).toFixed(2)),
      cagr: Number((totalProfitPct * 1.5).toFixed(2)),
      start_balance: settings.starting_balance,
      final_balance: Number(balance.toFixed(2))
    },
    equity_curve: equityCurve,
    daily_profits: dailyProfits,
    exit_reasons_breakdown: exitBreakdown
  };
}
