#!/usr/bin/env python3
"""
Unified Portfolio Monitor for FreqTrade Dual-Bot System
Tracks:
1. BTC Swing Bot (Live Port 8083)
2. Altcoin Regime Pullback Bot (Dry-run Port 8082)
"""

import os
import sys
import json
import urllib.request
import urllib.error
import base64
from datetime import datetime

# Pastikan koneksi localhost tidak diarahkan ke proxy (WARP/VPN)
os.environ["no_proxy"] = "*"
os.environ["NO_PROXY"] = "*"


def fetch_api(port: int, endpoint: str, auth: tuple[str, str]):
    url = f"http://127.0.0.1:{port}/api/v1/{endpoint}"
    # Buat opener tanpa proxy untuk localhost
    proxy_handler = urllib.request.ProxyHandler({})
    opener = urllib.request.build_opener(proxy_handler)

    req = urllib.request.Request(url)
    credentials = f"{auth[0]}:{auth[1]}"
    encoded_credentials = base64.b64encode(credentials.encode("ascii")).decode("ascii")
    req.add_header("Authorization", f"Basic {encoded_credentials}")
    try:
        with opener.open(req, timeout=5) as response:
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

    for b in bots:
        print(f"\n▶ [{b['name']}] (Port {b['port']} - {b['mode']})")

        # 1. Ping Check
        ping_res = fetch_api(b["port"], "ping", b["auth"])
        if "error" in ping_res:
            print(f"  ❌ Status: OFFLINE / Unreachable ({ping_res['error']})")
            continue
        print("  🟢 Status: ONLINE & HEALTHY")

        # 2. Status / Open Trades
        status_res = fetch_api(b["port"], "status", b["auth"])
        if isinstance(status_res, list) and len(status_res) > 0:
            print(f"  📌 Posisi Terbuka: {len(status_res)} trade")
            for t in status_res:
                pair = t.get("pair")
                profit_pct = t.get("profit_pct", 0)
                profit_abs = t.get("profit_abs", 0)
                open_rate = t.get("open_rate", 0)
                current_rate = t.get("current_rate", 0)
                direction = "SHORT" if t.get("is_short") else "LONG"
                lev = t.get("leverage", 1)
                color = "🟢" if profit_pct >= 0 else "🔴"
                print(f"     • {pair} ({direction} {lev}x): Entry ${open_rate:,.2f} -> Current ${current_rate:,.2f}")
                print(f"       Floating: {color} {profit_pct:+.2f}% (${profit_abs:+.2f} USDT)")
        else:
            print("  📌 Posisi Terbuka: 0 (Menunggu sinyal berpeluang tinggi)")

        # 3. Balance / Wallets
        bal_res = fetch_api(b["port"], "balance", b["auth"])
        if "currencies" in bal_res:
            for c in bal_res["currencies"]:
                if c["currency"] == "USDT":
                    print(f"  💰 Wallet: Total ${c.get('est_stake', 0):.2f} USDT (Free: ${c.get('free', 0):.2f})")

        # 4. Profit Summary
        prof_res = fetch_api(b["port"], "profit", b["auth"])
        if "trade_count" in prof_res and prof_res["trade_count"] > 0:
            tc = prof_res["trade_count"]
            win = prof_res["winning_trades"]
            lose = prof_res["losing_trades"]
            wr = (win / tc) * 100 if tc > 0 else 0
            p_abs = prof_res.get("profit_all_coin", 0)
            print(f"  📈 Performa: {tc} Closed Trades | Win Rate: {wr:.1f}% ({win}W / {lose}L) | Net PnL: ${p_abs:+.2f} USDT")

        # 5. Active Locks / Protections
        locks_res = fetch_api(b["port"], "locks", b["auth"])
        if "locks" in locks_res and len(locks_res["locks"]) > 0:
            print(f"  🛡️ Proteksi Aktif ({len(locks_res['locks'])} pair di-lock):")
            for lock in locks_res["locks"]:
                print(f"     - {lock.get('pair')}: Auto lock sampai {lock.get('lock_end_time')[:19]}")
        else:
            print("  🛡️ Proteksi Aktif: Tidak ada pair dalam status cooldown/lock")

    print("\n" + "=" * 72)


if __name__ == "__main__":
    print_dashboard()
