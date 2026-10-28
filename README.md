# Freqtrade Web Dashboard & Strategy Studio

A modern, high-performance React application rewriting and porting the core capabilities of **Freqtrade** and **FreqUI** into an interactive web dashboard, backtesting engine, technical indicator charting suite, and portfolio management workstation.

## Overview

Freqtrade is the premier algorithmic crypto trading platform. This application brings Freqtrade's features directly to the web:

1. **Live Trading & Bot Dashboard (FreqUI Parity)**:
   - Monitor real-time open positions, unrealized PnL, current entry price vs current market rate.
   - Adjust active stoploss levels on the fly or trigger manual Force Exit.
   - Real-time bot controls: Start, Stop, Reload configuration, and Manual Force Buy.
   - Closed trades history log with exit reasons (`roi`, `stop_loss`, `trailing_stop_loss`, `force_exit`, `exit_signal`).

2. **Interactive Candlestick & Technical Plotting (FreqUI Plot)**:
   - Candlestick bars with volume histograms.
   - Real-time technical indicators computed on the fly: EMA 20, EMA 50, Bollinger Bands (Upper, Middle, Lower), and RSI (14) subplot.
   - Visual trade markers placed directly on candles (Buy entries and Sell exits).
   - Dynamic cursor crosshair showing timestamp, Open, High, Low, Close, Volume, and indicator values.

3. **Quantitative Strategy Backtesting Engine**:
   - Client-side backtesting engine simulating candle-by-candle strategy execution.
   - Minimal ROI ladder table enforcement (step-down profit taking over time).
   - Trailing stoploss simulation and risk management.
   - Comprehensive performance metrics: Win Rate %, Profit Factor, Max Drawdown % (with peak-to-trough curve), Sharpe Ratio, Sortino Ratio, Calmar Ratio, Expectancy, and Average Trade Duration.
   - Interactive Cumulative Portfolio Equity growth chart.
   - Trade-by-trade breakdown table and standard Freqtrade JSON export.

4. **Dynamic Pairlist & Market Filter Pipeline**:
   - Configurable filter pipeline: `VolumePairList`, `SpreadFilter`, `PriceFilter`.
   - Whitelist and Blacklist management with instant additions and deletions.
   - Live exchange market scanner with real-time 24h ticker prices, 24h volume, spread %, and volatility.

5. **Strategy Studio & Hyperopt Tuner**:
   - Inspect standard Freqtrade strategies (`SampleStrategy`, `BBRSIStrategy`, `MomentumTrendStrategy`, `FreqaiHybridStrategy`).
   - Hyperparameter sliders: RSI Buy (oversold), RSI Sell (overbought), Hard Stoploss ratio, Minimal ROI ladder targets.
   - One-click application of tuned parameters to the running bot.

6. **Exchange Wallet & Balances**:
   - Multi-asset token balance overview (USDT, BTC, ETH, SOL, BNB).
   - Free vs In-Trade allocation breakdown with visual percentage bars.
   - Dry-run capital simulator: inject simulated funds or reset balance.

7. **System Logs & REST API v1 Explorer**:
   - Live log stream matching `freqtrade.worker`, `freqtrade.freqtradebot`, `freqtrade.strategy`, and `freqtrade.pairlistmanager`.
   - Interactive REST API explorer testing standard Freqtrade v1 endpoints (`/api/v1/ping`, `/api/v1/version`, `/api/v1/status`, `/api/v1/trades`, `/api/v1/balance`, `/api/v1/profit`, etc.).

## Development

- Built with **React 19**, **Vite 6**, **TypeScript**, and **Tailwind CSS v4**.
- Start dev server: `npm run dev` (runs on port 3000)
- Build production bundle: `npm run build`
