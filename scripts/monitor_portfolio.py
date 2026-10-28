#!/usr/bin/env python3
"""
Unified Portfolio Monitor for FreqTrade Dual-Bot System
Tracks:
1. BTC Swing Bot (Live Port 8083)
2. Altcoin Regime Pullback Bot (Dry-run Port 8082)
"""

import sys
import json
import urllib.request
import urllib.error
import base64
from datetime import datetime


def fetch_api(port: int, endpoint: str, auth: tuple[str, str]):
    url = f"http://127.0.0.1:{port}/api/v1/{endpoint}"
    req = urllib.request.Request(url)
    credentials = f"{auth[0]}:{auth[1]}"
    encoded_credentials = base64.b64encode(credentials.encode("ascii")).decode("ascii")
    req.add_header("Authorization", f"Basic {encoded_credentials}")
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return {"error": str(e)}


def print_dashboard():
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 72)
    print(f"📊 FREQTRADE QUANTITATIVE DUAL-BOT DASHBOARD | {now_str}")
    print("=" * 72)

    bots = [
        {
            "name": "Bot 1: BTC Weekly Swing (LIVE)",
            "port": 8083,
            "auth": ("freqtrader", "LocalSecuredDavin2026!"),
            "mode": "LIVE REAL MONEY",
        },
        {
            "name": "Bot 2: RegimeTrendPullback (DRY-RUN)",
            "port": 8082,
            "auth": ("freqtrader", "LocalSecuredDavin2026!"),
            "mode": "DRY-RUN (Forward Testing Target 60 trades)",
        },
    ]

    for bot in bots:
        print(f"\n▶ [{bot['name']}] (Port {bot['port']} - {bot['mode']})")
        ping = fetch_api(bot["port"], "ping", bot["auth"])
        if "error" in ping or ping.get("status") != "pong":
            print(f"  ❌ Status: OFFLINE / Unreachable ({ping.get('error', 'No response')})")
            continue

        print("  🟢 Status: ONLINE & HEALTHY")

        # Status & Open Trades
        status = fetch_api(bot["port"], "status", bot["auth"])
        if isinstance(status, list):
            if len(status) == 0:
                print("  📌 Posisi Terbuka: 0 (Menunggu sinyal berpeluang tinggi)")
            else:
                print(f"  📌 Posisi Terbuka: {len(status)}")
                for t in status:
                    pair = t.get("pair")
                    side = "SHORT" if t.get("is_short") else "LONG"
                    entry = t.get("open_rate")
                    cur = t.get("current_rate")
                    pnl_pct = t.get("profit_pct", 0)
                    pnl_abs = t.get("profit_abs", 0)
                    sl = t.get("stop_loss_abs")
                    lev = t.get("leverage", 1.0)
                    stake = t.get("stake_amount", 0)

                    color = "🟢" if pnl_pct >= 0 else "🔴"
                    print(f"     • {color} {pair} [{side} {lev}x] | Stake: ${stake:.2f} USDT")
                    print(f"       Entry: {entry:.2f} | Current: {cur:.2f} | StopLoss: {sl:.2f}")
                    print(f"       Floating PnL: {pnl_pct:+.2f}% ({pnl_abs:+.4f} USDT)")

        # Balance
        bal = fetch_api(bot["port"], "balance", bot["auth"])
        if isinstance(bal, dict) and "total" in bal:
            total_val = bal.get("total", 0)
            free_val = bal.get("free", 0)
            curr = bal.get("stake", "USDT")
            print(f"  💰 Wallet: Total ${total_val:.2f} {curr} (Free: ${free_val:.2f})")

        # Active Locks / Protections
        locks = fetch_api(bot["port"], "locks", bot["auth"])
        if isinstance(locks, dict) and "locks" in locks:
            active_locks = [lk for lk in locks["locks"] if lk.get("active", False)]
            if active_locks:
                print(f"  🛡️ Proteksi Aktif ({len(active_locks)} pair di-lock):")
                for lk in active_locks:
                    print(f"     - {lk.get('pair')}: {lk.get('reason')} sampai {lk.get('lock_end_time')}")
            else:
                print("  🛡️ Proteksi Aktif: Tidak ada pair dalam status cooldown/lock")

    print("\n" + "=" * 72)


if __name__ == "__main__":
    print_dashboard()
