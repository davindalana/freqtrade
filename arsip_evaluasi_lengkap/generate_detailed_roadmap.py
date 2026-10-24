#!/usr/bin/env python3
"""
generate_detailed_roadmap.py
============================
Menghasilkan grafik analisis teknikal mingguan BTC/USDT dengan:
  1. Candlestick mingguan asli (Okt 2025 - Okt 2026).
  2. Zona-zona warna persis seperti gambar TradingView (Buy Area, Drop Support, Target 1 & 2).
  3. LINTASAN PREDIKSI DETAIL KEDEPAN (Roadmap Proyeksi):
     - Skenario A (Utama / 60%): Retest $79k -> Target 1 ($89k Nov) -> Target 2 ($96k Des).
     - Skenario B (Deep Shakeout / 30%): Sweep garis hijau $72k -> V-shape rebound -> Target 1.
     - Skenario C (Invalidasi / 10%): Jebol di bawah $68k (Stop Loss).
"""

from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path as MPath
import numpy as np
import pandas as pd


def generate_roadmap_chart(feather_path: Path, out_path: Path):
    df = pd.read_feather(feather_path)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    df = df.set_index("date").sort_index()

    weekly = df.resample("1W").agg({
        "open": "first",
        "high": "max",
        "low": "min",
        "close": "last",
        "volume": "sum",
    }).dropna()

    weekly.index = weekly.index.tz_localize(None)

    # Ambil 45 minggu terakhir
    recent = weekly.tail(45).copy()
    n_candles = len(recent)

    fig, ax = plt.subplots(figsize=(15, 8.5), dpi=130)

    # Styling background ala TradingView Dark/Modern Slate
    fig.patch.set_facecolor("#131722")
    ax.set_facecolor("#131722")

    # Gambar Candlestick Mingguan
    for i in range(n_candles):
        o = recent["open"].iloc[i]
        c = recent["close"].iloc[i]
        h = recent["high"].iloc[i]
        l = recent["low"].iloc[i]

        color = "#089981" if c >= o else "#f23645"
        ax.plot([i, i], [l, h], color=color, linewidth=1.5, zorder=3)

        lower = min(o, c)
        height = max(abs(c - o), 100)
        rect = patches.Rectangle((i - 0.32, lower), 0.64, height,
                                 facecolor=color, edgecolor=color, zorder=3)
        ax.add_patch(rect)

    # Rentang X: candle asli (0..44) + proyeksi masa depan (45..62 = ~17 minggu kedepan)
    total_len = n_candles + 18
    ax.set_xlim(-1, total_len)
    ax.set_ylim(55000, 105000)

    # -------------------------------------------------------------
    # 1. ZONA-ZONA WARNA PERSIS GAMBAR TRADINGVIEW
    # -------------------------------------------------------------
    # TARGET 2 ($93,500 - $97,000)
    ax.axhspan(93500, 97000, color="#f59e0b", alpha=0.25, zorder=1)
    ax.text(total_len - 1, 95250, " TARGET 2  ($94,000 - $96,000)\n [Major Resistance / ATH Retest]",
            color="#fbbf24", fontsize=10.5, fontweight="bold", va="center", ha="right")

    # TARGET 1 ($87,000 - $90,500)
    ax.axhspan(87000, 90500, color="#f59e0b", alpha=0.32, zorder=1)
    ax.text(total_len - 1, 88750, " TARGET 1  ($87,000 - $90,000)\n [Previous Impulse High]",
            color="#fde047", fontsize=10.5, fontweight="bold", va="center", ha="right")

    # LONG / BUY AREA ($78,000 - $82,500)
    ax.axhspan(78000, 82500, color="#10b981", alpha=0.22, zorder=1)
    ax.text(total_len - 1, 80250, " Long / Buy Area  ($78,000 - $82,000)\n [Bullish Order Block / S-R Flip]",
            color="#34d399", fontsize=10.5, fontweight="bold", va="center", ha="right")

    # MAXIMUM PRICE DROP ($68,000 - $72,058)
    ax.axhspan(68000, 72058, color="#8b5cf6", alpha=0.20, zorder=1)
    ax.axhline(72057.93, color="#10b981", linewidth=2.0, linestyle="-", zorder=2)
    ax.text(1, 72300, " 72,057.93 (Maximum Price Drop Support)", color="#10b981", fontsize=9.5, fontweight="bold")
    ax.text(total_len - 1, 70000, " Maximum Price Drop Zone\n ($68,000 - $72,058)",
            color="#c4b5fd", fontsize=10, fontweight="bold", va="center", ha="right")

    # FIRST BUY AREA ($61,500 - $65,500)
    ax.axhspan(61500, 65500, color="#059669", alpha=0.20, zorder=1)
    ax.text(total_len - 1, 63500, " First Buy Area ($62,000 - $65,000)\n [Original Demand Base]",
            color="#6ee7b7", fontsize=10, fontweight="bold", va="center", ha="right")

    # Harga Sekarang ($82,195)
    curr_x = n_candles - 1
    curr_y = recent["close"].iloc[-1]
    ax.plot(curr_x, curr_y, marker="o", color="#38bdf8", markersize=7, zorder=5)
    ax.text(curr_x - 1, curr_y + 1200, f"Harga Terkini:\n${curr_y:,.0f}",
            color="#38bdf8", fontsize=10, fontweight="bold", ha="right")

    # -------------------------------------------------------------
    # 2. PROYEKSI LINTASAN PREDIKSI MASA DEPAN (ROADMAP ARROWS)
    # -------------------------------------------------------------
    # Skenario A (Hijau: Bullish Continuation, Probabilitas 60%)
    path_a_x = [curr_x, curr_x + 2, curr_x + 6, curr_x + 9, curr_x + 14]
    path_a_y = [curr_y, 79200, 89500, 86800, 96000]
    ax.plot(path_a_x, path_a_y, color="#22c55e", linestyle="-", linewidth=2.8, alpha=0.9, zorder=4)
    ax.scatter(path_a_x[1:], path_a_y[1:], color="#22c55e", s=45, zorder=5)
    ax.annotate("SKENARIO A (Utama ~60%)\n1. Retest $79k (Akhir Okt)\n2. Hit Target 1 $89k (Pertengahan Nov)\n3. Pullback $86k -> Target 2 $96k (Des)",
                xy=(path_a_x[-1], path_a_y[-1]), xytext=(path_a_x[-1] - 4, 101000),
                arrowprops=dict(facecolor="#22c55e", shrink=0.08, width=1.5, headwidth=7),
                color="#86efac", fontsize=9.5, fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.5", facecolor="#14532d", edgecolor="#22c55e", alpha=0.9))

    # Skenario B (Biru: Deep Shakeout Rebound, Probabilitas 30%)
    path_b_x = [curr_x, curr_x + 3, curr_x + 7, curr_x + 13]
    path_b_y = [curr_y, 72500, 81000, 89000]
    ax.plot(path_b_x, path_b_y, color="#38bdf8", linestyle="--", linewidth=2.2, alpha=0.85, zorder=4)
    ax.scatter(path_b_x[1:], path_b_y[1:], color="#38bdf8", s=35, zorder=5)
    ax.annotate("SKENARIO B (Deep Shakeout ~30%)\nTurun ke $72k lalu V-Shape Rebound",
                xy=(path_b_x[1], path_b_y[1]), xytext=(path_b_x[1] - 2, 66500),
                arrowprops=dict(facecolor="#38bdf8", shrink=0.08, width=1.2, headwidth=6),
                color="#bae6fd", fontsize=9, fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.4", facecolor="#0c4a6e", edgecolor="#38bdf8", alpha=0.85))

    # Skenario C (Merah: Invalidation / Stop Loss, Probabilitas 10%)
    path_c_x = [curr_x + 3, curr_x + 7]
    path_c_y = [72500, 64000]
    ax.plot(path_c_x, path_c_y, color="#ef4444", linestyle=":", linewidth=2.0, alpha=0.8, zorder=4)
    ax.annotate("SKENARIO C (Invalidasi ~10%)\nJebol < $68k -> CUT LOSS",
                xy=(path_c_x[-1], path_c_y[-1]), xytext=(path_c_x[-1] + 1, 60000),
                color="#fca5a5", fontsize=8.5, fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.3", facecolor="#7f1d1d", edgecolor="#ef4444", alpha=0.85))

    # Garis Pembatas "Hari Ini / Masa Depan"
    ax.axvline(curr_x, color="#94a3b8", linestyle="--", linewidth=1.0, alpha=0.6)
    ax.text(curr_x - 0.5, 57000, "DATA HISTORIS", color="#94a3b8", fontsize=9, ha="right")
    ax.text(curr_x + 0.5, 57000, "PROYEKSI PREDIKSI MASA DEPAN", color="#38bdf8", fontsize=9, ha="left")

    # Label Sumbu Waktu
    tick_locs = [0, 8, 16, 25, 34, 44, 49, 57]
    tick_labels = ["Des 2025", "Feb 2026", "Apr 2026", "Jun 2026", "Agt 2026", "Okt 2026", "Nov 2026 (P)", "Des 2026 (P)"]
    ax.set_xticks(tick_locs)
    ax.set_xticklabels(tick_labels, color="#94a3b8", fontsize=9.5)
    ax.tick_params(colors="#94a3b8")

    # Format Harga di Sumbu Y
    ax.yaxis.set_major_formatter("${x:,.0f}")
    ax.grid(True, color="#1e293b", linestyle="--", linewidth=0.7, alpha=0.7)

    # Header Title & Watermark
    ax.set_title("BTC/USDT SPOT - 1W | Roadmap Prediksi Detail Struktur Pasar & Skenario Harga",
                 fontsize=14, fontweight="bold", color="#f8fafc", pad=15)

    plt.tight_layout()
    fig.savefig(out_path, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)
    print(f"[Roadmap Detail Berhasil Dibuat] -> {out_path}")


if __name__ == "__main__":
    feather = Path("user_data/data/binance/futures/BTC_USDT_USDT-1d-futures.feather")
    out = Path("arsip_evaluasi_lengkap/btc_detailed_prediction_roadmap.png")
    generate_roadmap_chart(feather, out)
