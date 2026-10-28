#!/usr/bin/env bash
# ==============================================================================
# SCRIPT BACKTEST STANDAR INDUSTRI FREQTRADE (QUANTITATIVE RIGOR)
# Enforces:
# 1. Intrabar execution simulation via --timeframe-detail 5m
# 2. Native Protections via --enable-protections
# 3. Static Liquid Pairlist via user_data/config_live_15usdt.json
# ==============================================================================

set -euo pipefail

STRATEGY=${1:-"RegimeTrendPullback"}
TIMERANGE=${2:-"20260101-20261017"}
CONFIG=${3:-"user_data/config_live_15usdt.json"}

echo "=========================================================="
echo "🎯 Menjalankan Backtest Standar Kuantitatif"
echo "Strategi   : $STRATEGY"
echo "Timerange  : $TIMERANGE"
echo "Config     : $CONFIG"
echo "Detail TF  : 5m (Standard Industri untuk Futures)"
echo "Protections: AKTIF (--enable-protections)"
echo "=========================================================="

./.venv/bin/freqtrade backtesting \
  --config "$CONFIG" \
  --strategy "$STRATEGY" \
  --strategy-path user_data/strategies/futures \
  --timeframe-detail 5m \
  --enable-protections \
  --timerange "$TIMERANGE"

echo "=========================================================="
echo "✅ Backtest selesai dengan akurasi 5m intrabar & protections."
echo "=========================================================="
