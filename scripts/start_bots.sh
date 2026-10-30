#!/usr/bin/env bash
# =============================================================================
# start_bots.sh — Startup Script untuk Kedua Bot FreqTrade
# =============================================================================
# Usage: ./scripts/start_bots.sh
#
# Script ini:
#   1. Cek apakah bot sudah running (hindari duplikat)
#   2. Load .env untuk API keys
#   3. Mulai caffeinate (anti-sleep macOS)
#   4. Mulai BTC Swing bot (live)
#   5. Mulai Dry-Run Altcoin bot
#   6. Health check setelah 15 detik
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON="./.venv/bin/python3.11"
FREQTRADE="freqtrade/main.py"

cd "$PROJECT_DIR"

echo "========================================================"
echo " FreqTrade Bot Startup — $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"

# ── Load .env ─────────────────────────────────────────────────────────────────
if [ -f ".env" ]; then
    echo "[1/6] Loading .env..."
    set -a
    source .env
    set +a
    echo "      ✅ .env loaded"
else
    echo "      ⚠️  .env tidak ditemukan — pastikan API key sudah diset di config"
fi

# ── Anti-sleep (macOS) ────────────────────────────────────────────────────────
echo "[2/6] Starting caffeinate..."
if ! pgrep -x caffeinate > /dev/null 2>&1; then
    caffeinate -dims &
    CAFF_PID=$!
    echo "      ✅ caffeinate PID $CAFF_PID"
else
    echo "      ✅ caffeinate sudah running"
fi

# ── Cek BTC Bot ───────────────────────────────────────────────────────────────
echo "[3/6] Cek BTC Swing bot (port 8083)..."
if curl -s http://127.0.0.1:8083/api/v1/ping > /dev/null 2>&1; then
    echo "      ✅ BTC bot sudah running — skip"
else
    echo "      ⏳ Memulai BTC bot..."
    mkdir -p user_data/logs
    $PYTHON $FREQTRADE trade \
        --config user_data/config_btc_swing.json \
        --strategy BTCWeeklySwingStrategy \
        --strategy-path user_data/strategies/futures \
        --logfile user_data/logs/btc_swing.log \
        > /dev/null 2>&1 &
    BTC_PID=$!
    echo "      ✅ BTC bot PID $BTC_PID"
fi

# ── Cek Dry-Run Bot ───────────────────────────────────────────────────────────
echo "[4/6] Cek Dry-Run Altcoin bot (port 8082)..."
if curl -s http://127.0.0.1:8082/api/v1/ping > /dev/null 2>&1; then
    echo "      ✅ Dry-run bot sudah running — skip"
else
    echo "      ⏳ Memulai Dry-Run bot..."
    $PYTHON $FREQTRADE trade \
        --config user_data/config_live_15usdt.json \
        --strategy RegimeTrendPullback \
        --strategy-path user_data/strategies/futures \
        --logfile user_data/logs/dryrun_altcoins.log \
        > /dev/null 2>&1 &
    DR_PID=$!
    echo "      ✅ Dry-run bot PID $DR_PID"
fi

# ── Tunggu startup ─────────────────────────────────────────────────────────────
echo "[5/6] Menunggu bot startup (20 detik)..."
sleep 20

# ── Health Check ──────────────────────────────────────────────────────────────
echo "[6/6] Health check..."

BTC_STATUS="❌ MATI"
DR_STATUS="❌ MATI"

if curl -s http://127.0.0.1:8083/api/v1/ping > /dev/null 2>&1; then
    BTC_STATUS="✅ RUNNING"
fi

if curl -s http://127.0.0.1:8082/api/v1/ping > /dev/null 2>&1; then
    DR_STATUS="✅ RUNNING"
fi

echo ""
echo "========================================================"
echo " STATUS AKHIR"
echo "========================================================"
echo "  BTC Swing (port 8083) : $BTC_STATUS"
echo "  Dry-Run    (port 8082) : $DR_STATUS"
echo "========================================================"
echo ""
echo "  Monitor: python3 scripts/monitor_portfolio.py"
echo "  Log BTC: tail -f user_data/logs/btc_swing.log"
echo "  Log DR : tail -f user_data/logs/dryrun_altcoins.log"
echo "========================================================"

