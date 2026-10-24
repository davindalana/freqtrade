#!/usr/bin/env python3
"""
market_structure_analyzer.py
============================
Otomatisasi pemetaan zona struktur pasar BTC/USDT (mirip chart TradingView mingguan):
  - Area Beli (Long / Buy Area)
  - Batas Maksimal Koreksi (Maximum Price Drop / Invalidation)
  - Target 1 & Target 2 (Fibonacci Extension 1.272 & 1.618)
  - Kalkulator Leverage Aman & Harga Likuidasi

Skrip ini berdiri sendiri dan dapat dijalankan berdampingan dengan bot Freqtrade
karena hanya membaca data historis tanpa mengganggu database transaksi.
"""

from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import pandas as pd


def load_btc_weekly(feather_path: Path) -> pd.DataFrame:
    df = pd.read_feather(feather_path)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    df = df.set_index("date").sort_index()

    # Resample ke weekly (W-SUN)
    weekly = df.resample("1W").agg({
        "open": "first",
        "high": "max",
        "low": "min",
        "close": "last",
        "volume": "sum",
    }).dropna()

    weekly.index = weekly.index.tz_localize(None)
    return weekly


def find_swings(df: pd.DataFrame, window: int = 4):
    """Mendeteksi swing highs dan swing lows lokal."""
    df["swing_high"] = False
    df["swing_low"] = False

    for i in range(window, len(df) - window):
        high_i = df["high"].iloc[i]
        low_i = df["low"].iloc[i]

        if high_i == df["high"].iloc[i - window : i + window + 1].max():
            df.loc[df.index[i], "swing_high"] = True

        if low_i == df["low"].iloc[i - window : i + window + 1].min():
            df.loc[df.index[i], "swing_low"] = True

    return df


def calculate_zones_and_targets(df: pd.DataFrame):
    recent = df.tail(52)  # 1 tahun terakhir
    curr_close = recent["close"].iloc[-1]
    curr_high = recent["high"].iloc[-1]

    # Ambil swing highs dan swing lows terbaru
    swing_highs = recent[recent["swing_high"]]["high"]
    swing_lows = recent[recent["swing_low"]]["low"]

    major_low = swing_lows.iloc[-1] if not swing_lows.empty else recent["low"].min()
    major_high = swing_highs.iloc[-1] if not swing_highs.empty else curr_high

    # Jika harga sekarang adalah yang tertinggi, jadikan curr_high sebagai acuan
    if curr_high > major_high:
        major_high = curr_high

    diff = major_high - major_low
    if diff <= 0:
        diff = major_high * 0.2

    # Zona S/R: Retest area konsolidasi/breakout
    buy_area_min = major_high * 0.96
    buy_area_max = major_high * 1.02

    # Maximum price drop: retracement 0.618 atau swing high sebelumnya
    max_drop = major_high - (diff * 0.618)
    first_buy_area_min = major_high - (diff * 0.786)
    first_buy_area_max = max_drop

    # Target Fibonacci Extension
    target_1 = major_high + (diff * 0.272)
    target_2 = major_high + (diff * 0.618)

    return {
        "current_price": curr_close,
        "buy_area": (buy_area_min, buy_area_max),
        "max_drop": max_drop,
        "first_buy_area": (first_buy_area_min, first_buy_area_max),
        "target_1": target_1,
        "target_2": target_2,
    }


def plot_market_structure(df: pd.DataFrame, zones: dict, out_path: Path):
    recent = df.tail(35)  # 35 minggu terakhir
    fig, ax = plt.subplots(figsize=(12, 7))

    dates = range(len(recent))
    opens = recent["open"].values
    highs = recent["high"].values
    lows = recent["low"].values
    closes = recent["close"].values

    # Gambar Candlestick manual
    for i in dates:
        color = "#26a69a" if closes[i] >= opens[i] else "#ef5350"
        ax.plot([i, i], [lows[i], highs[i]], color=color, linewidth=1.2)
        lower = min(opens[i], closes[i])
        height = max(abs(closes[i] - opens[i]), 50)
        rect = patches.Rectangle((i - 0.3, lower), 0.6, height, facecolor=color, edgecolor=color)
        ax.add_patch(rect)

    xmin, xmax = -1, len(dates) + 8

    # Gambar Zona-Zona Warna
    # Target 2 (Kuning Atas)
    t2_min = zones["target_2"] * 0.98
    t2_max = zones["target_2"] * 1.02
    ax.axhspan(t2_min, t2_max, color="#fff3cd", alpha=0.85, label="TARGET 2")
    ax.text(xmax - 6, zones["target_2"], f"TARGET 2 (~${zones['target_2']:,.0f})",
            color="#856404", fontsize=11, fontweight="bold", va="center")

    # Target 1 (Kuning Tengah)
    t1_min = zones["target_1"] * 0.98
    t1_max = zones["target_1"] * 1.02
    ax.axhspan(t1_min, t1_max, color="#ffeeba", alpha=0.85, label="TARGET 1")
    ax.text(xmax - 6, zones["target_1"], f"TARGET 1 (~${zones['target_1']:,.0f})",
            color="#856404", fontsize=11, fontweight="bold", va="center")

    # Long / Buy Area (Hijau Muda)
    ax.axhspan(zones["buy_area"][0], zones["buy_area"][1], color="#d4edda", alpha=0.85)
    ax.text(xmax - 6, (zones["buy_area"][0] + zones["buy_area"][1]) / 2,
            f"Long / Buy Area\n(${zones['buy_area'][0]:,.0f} - ${zones['buy_area'][1]:,.0f})",
            color="#155724", fontsize=10, fontweight="bold", va="center")

    # Maximum Price Drop (Ungu & Garis Hijau)
    ax.axhline(zones["max_drop"], color="#28a745", linewidth=2.0, linestyle="-")
    ax.axhspan(zones["max_drop"] * 0.96, zones["max_drop"], color="#e2d9f3", alpha=0.85)
    ax.text(xmax - 6, zones["max_drop"] * 0.98,
            f"Maximum Price Drop\n(Level: ${zones['max_drop']:,.0f})",
            color="#383d41", fontsize=10, fontweight="bold", va="center")

    # Garis Harga Terkini
    curr = zones["current_price"]
    ax.axhline(curr, color="#e83e8c", linestyle="--", linewidth=1.2)
    ax.text(0, curr, f" Current: ${curr:,.0f}", color="#e83e8c", fontweight="bold", va="bottom")

    ax.set_xlim(xmin, xmax)
    ax.set_title("BTC/USDT Weekly - Algorithmic Market Structure & Key Zones", fontsize=14, fontweight="bold")
    ax.set_ylabel("Price (USDT)", fontsize=11)
    ax.grid(True, linestyle=":", alpha=0.4)

    plt.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)
    print(f"[Grafik Disimpan] -> {out_path}")


def main():
    data_path = Path("user_data/data/binance/futures/BTC_USDT_USDT-1d-futures.feather")
    if not data_path.exists():
        print(f"Error: Data file {data_path} tidak ditemukan.")
        return

    df = load_btc_weekly(data_path)
    df = find_swings(df)
    zones = calculate_zones_and_targets(df)

    print("=" * 75)
    print("  HASIL ANALISIS STRUKTUR PASAR BTC/USDT (ALGORITMIK)")
    print("=" * 75)
    curr = zones["current_price"]
    print(f"  Harga Terkini BTC           : ${curr:,.2f}")
    print(f"  Area Akumulasi (Buy Area)   : ${zones['buy_area'][0]:,.0f} - ${zones['buy_area'][1]:,.0f}")
    print(f"  Batas Maksimal Drop (Support): ${zones['max_drop']:,.0f}  (Jarak: {(zones['max_drop']/curr - 1)*100:+.1f}%)")
    print(f"  TARGET 1                    : ${zones['target_1']:,.0f}  (Kenaikan: {(zones['target_1']/curr - 1)*100:+.1f}%)")
    print(f"  TARGET 2                    : ${zones['target_2']:,.0f}  (Kenaikan: {(zones['target_2']/curr - 1)*100:+.1f}%)")
    print("-" * 75)

    # Analisis Leverage Berdasarkan Jarak Drop
    drop_pct = abs(zones['max_drop'] / curr - 1)
    safe_lev = int(1.0 / (drop_pct + 0.05))  # buffer 5%
    print(f"  Rekomendasi Leverage Aman   : {safe_lev}x")
    print(f"  Likuidasi dengan {safe_lev}x Leverage: ~${curr * (1 - 1/safe_lev + 0.004):,.0f} (Aman di bawah Maximum Drop)")
    print("=" * 75)

    out_img = Path("arsip_evaluasi_lengkap/btc_market_structure_zones.png")
    plot_market_structure(df, zones, out_img)


if __name__ == "__main__":
    main()
