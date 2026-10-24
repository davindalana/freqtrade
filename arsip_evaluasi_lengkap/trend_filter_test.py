#!/usr/bin/env python3
"""
trend_filter_test.py
====================
Uji jujur untuk filter tren sederhana (hold saat harga > SMA-N harian, selain itu cash)
dibandingkan dengan buy & hold, memakai data candle Freqtrade yang sudah kamu unduh.

Cara pakai (dari folder proyek Freqtrade):
    python trend_filter_test.py
    python trend_filter_test.py --pairs BTC ETH SOL --split 2025-01-01 --fee 0.0005 --slip 0.0005

Yang diuji:
  1. Buy & hold vs trend filter (SMA 200 hari) pada periode yang SAMA (setelah warmup).
  2. In-sample vs out-of-sample (dibagi di --split).
  3. Sensitivitas jendela SMA (50..300): kalau hasil cuma bagus di satu angka, itu kebetulan.
  4. Ketergantungan pada trade terbaik (hasil tanpa 3 trade terbaik).
  5. Return per tahun, supaya bisa dibandingkan dengan:
       freqtrade backtesting ... --breakdown year
  6. Uji kebetulan: benchmark dengan eksposur sama + posisi digeser acak 2000x (p-value).

Aturan anti-bias: sinyal dihitung dari close hari t, posisi baru dipegang mulai hari t+1.
Biaya: fee + slippage dikenakan setiap kali posisi berubah. Tanpa leverage, tanpa funding.
Ini simulasi long-only ala spot/perp 1x; bukan jaminan hasil live.
"""
import argparse
from pathlib import Path

import numpy as np
import pandas as pd

WINDOWS = [50, 100, 150, 200, 250, 300]


# ---------------------------------------------------------------- data
def find_file(data_dir: Path, base: str, tf: str) -> Path:
    candidates = [
        data_dir / f"{base}_USDT_USDT-{tf}-futures.feather",
        data_dir / f"{base}_USDT-{tf}-futures.feather",
        data_dir / f"{base}_USDT-{tf}.feather",
    ]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError(f"Data {base} {tf} tidak ditemukan di {data_dir}")


def load_daily_close(path: Path) -> pd.Series:
    df = pd.read_feather(path)
    df["date"] = pd.to_datetime(df["date"], utc=True)
    g = df.set_index("date")["close"].resample("1D").agg(["last", "count"])
    full = g["count"].max()
    g = g[g["count"] == full]          # buang hari yang candle-nya tidak lengkap
    s = g["last"].dropna()
    s.index = s.index.tz_localize(None)
    return s


# ---------------------------------------------------------------- simulasi
def sim_hold(close: pd.Series) -> pd.Series:
    return close.pct_change().fillna(0.0)


def sim_trend(close: pd.Series, n: int, cost: float):
    ret = close.pct_change().fillna(0.0)
    sma = close.rolling(n).mean()
    signal = (close > sma).astype(float)        # diputuskan di close hari t
    pos = signal.shift(1).fillna(0.0)           # dipegang mulai hari t+1
    turnover = pos.diff().abs().fillna(pos.abs())
    strat = pos * ret - turnover * cost
    return strat, pos


# ---------------------------------------------------------------- metrik
def metrics(r: pd.Series) -> dict:
    r = r.dropna()
    if len(r) < 30:
        return dict(total=np.nan, cagr=np.nan, maxdd=np.nan, sharpe=np.nan, calmar=np.nan)
    eq = (1 + r).cumprod()
    years = len(r) / 365.0
    cagr = eq.iloc[-1] ** (1 / years) - 1
    maxdd = (eq / eq.cummax() - 1).min()
    sharpe = r.mean() / r.std() * np.sqrt(365) if r.std() > 0 else np.nan
    calmar = cagr / abs(maxdd) if maxdd < 0 else np.nan
    return dict(total=eq.iloc[-1] - 1, cagr=cagr, maxdd=maxdd, sharpe=sharpe, calmar=calmar)


def fmt(m: dict) -> str:
    return (f"total {m['total']*100:8.1f}% | CAGR {m['cagr']*100:7.1f}% | "
            f"maxDD {m['maxdd']*100:7.1f}% | Sharpe {m['sharpe']:5.2f} | Calmar {m['calmar']:5.2f}")


def trade_multiples(r: pd.Series, pos: pd.Series) -> pd.Series:
    """Pengali ekuitas tiap trade (satu trade = satu rangkaian hari pos=1)."""
    entries = (pos.diff().fillna(pos) > 0).astype(int)
    tid = entries.cumsum() * (pos > 0)
    tid = tid[tid > 0]
    if tid.empty:
        return pd.Series(dtype=float)
    return (1 + r.loc[tid.index]).groupby(tid).prod()


# ---------------------------------------------------------------- laporan
def report(pair: str, close: pd.Series, split: pd.Timestamp, cost: float, main_n: int, plot_dir):
    start = close.index[max(WINDOWS)]           # semua strategi mulai dari tanggal yang sama
    print("=" * 92)
    print(f"{pair}  | data {close.index[0].date()} .. {close.index[-1].date()} | "
          f"evaluasi mulai {start.date()} | biaya per perubahan posisi {cost*100:.2f}%")
    print("=" * 92)

    hold = sim_hold(close).loc[start:]
    results = {n: sim_trend(close, n, cost) for n in WINDOWS}

    main_r, main_pos = results[main_n]
    main_r, main_pos = main_r.loc[start:], main_pos.loc[start:]

    # 1. perbandingan utama
    print(f"\n[1] Buy & hold vs trend filter SMA{main_n} (periode penuh)")
    print("  Buy&Hold      :", fmt(metrics(hold)))
    print(f"  Trend SMA{main_n:<4}:", fmt(metrics(main_r)))
    entries = int((main_pos.diff().fillna(main_pos) > 0).sum())
    print(f"  Jumlah entry: {entries} | waktu di pasar: {main_pos.mean()*100:.0f}%")

    # 2. in-sample vs out-of-sample
    print(f"\n[2] Sebelum vs sesudah {split.date()} (angka sesudah = out-of-sample jika kamu memilih SMA dari data sebelum itu)")
    for label, sl in (("sebelum", slice(None, split - pd.Timedelta(days=1))), ("sesudah", slice(split, None))):
        h, t = hold.loc[sl], main_r.loc[sl]
        if len(t) < 30:
            print(f"  {label}: data terlalu pendek")
            continue
        print(f"  {label} Buy&Hold:", fmt(metrics(h)))
        print(f"  {label} Trend   :", fmt(metrics(t)))

    # 3. sensitivitas
    print("\n[3] Sensitivitas jendela SMA (cari dataran stabil, bukan satu puncak)")
    print(f"  {'SMA':>5} | {'CAGR':>8} | {'maxDD':>8} | {'Sharpe':>6} | {'entry':>5}")
    cagrs = []
    for n in WINDOWS:
        r, p = results[n]
        r, p = r.loc[start:], p.loc[start:]
        m = metrics(r)
        cagrs.append(m["cagr"])
        e = int((p.diff().fillna(p) > 0).sum())
        print(f"  {n:>5} | {m['cagr']*100:7.1f}% | {m['maxdd']*100:7.1f}% | {m['sharpe']:6.2f} | {e:>5}")
    hold_cagr = metrics(hold)["cagr"]
    beat = sum(1 for c in cagrs if c > hold_cagr)
    print(f"  -> {beat}/{len(WINDOWS)} jendela mengalahkan buy&hold dalam CAGR "
          f"(buy&hold {hold_cagr*100:.1f}%). Nilai utama: DD lebih kecil, bukan selalu CAGR lebih tinggi.")

    # 4. ketergantungan pada trade terbaik
    mult = trade_multiples(main_r, main_pos).sort_values(ascending=False)
    if len(mult) >= 4:
        total_mult = (1 + main_r).prod()
        without = total_mult / mult.iloc[:3].prod()
        print(f"\n[4] Trade terbaik: {', '.join(f'{(x-1)*100:+.0f}%' for x in mult.iloc[:3])} "
              f"| total {((total_mult-1)*100):.0f}% -> tanpa 3 trade terbaik {((without-1)*100):.0f}%")
    else:
        print("\n[4] Trade terlalu sedikit untuk analisis outlier.")

    # 5. per tahun
    print("\n[5] Return per tahun (bandingkan dengan `freqtrade backtesting --breakdown year`)")
    print(f"  {'tahun':>6} | {'Buy&Hold':>9} | {'Trend':>9}")
    yh = (1 + hold).groupby(hold.index.year).prod() - 1
    yt = (1 + main_r).groupby(main_r.index.year).prod() - 1
    for y in yh.index:
        print(f"  {y:>6} | {yh[y]*100:8.1f}% | {yt[y]*100:8.1f}%")

    # 6. apakah timing lebih baik dari kebetulan?
    ret_a = close.pct_change().fillna(0.0).loc[start:].values
    pos_a = main_pos.values
    n_a = len(ret_a)

    def _stats(posv):
        turn = np.abs(np.diff(posv, prepend=0.0))
        r = posv * ret_a - turn * cost
        lg = np.log1p(r)
        cagr = np.exp(lg.mean() * 365) - 1
        sd = r.std()
        sharpe = r.mean() / sd * np.sqrt(365) if sd > 0 else np.nan
        return cagr, sharpe

    print("\n[6] Uji kebetulan: apakah timing SMA lebih baik daripada posisi acak dengan pola sama?")
    f = float(pos_a.mean())
    static_m = metrics(pd.Series(f * ret_a))
    print(f"  Benchmark eksposur sama (selalu {f*100:.0f}% BTC, sisanya cash, tanpa timing):")
    print("   ", fmt(static_m))
    if n_a > 400:
        rng = np.random.default_rng(42)
        act_cagr, act_sh = _stats(pos_a)
        ks = rng.integers(120, n_a - 120, size=2000)
        perm = np.array([_stats(np.roll(pos_a, int(k))) for k in ks])
        p_c = float((perm[:, 0] >= act_cagr).mean())
        p_s = float((perm[:, 1] >= act_sh).mean())
        print(f"  Posisi digeser acak 2000x (lama holding & eksposur tetap sama):")
        print(f"   CAGR asli {act_cagr*100:5.1f}% | acak: median {np.median(perm[:,0])*100:5.1f}%, "
              f"persentil-95 {np.percentile(perm[:,0],95)*100:5.1f}% | p = {p_c:.3f}")
        print(f"   Sharpe asli {act_sh:4.2f} | acak: median {np.median(perm[:,1]):4.2f}, "
              f"persentil-95 {np.percentile(perm[:,1],95):4.2f} | p = {p_s:.3f}")
        print("   p kecil (<0.05) = timing kemungkinan bukan kebetulan; p besar = hasil bisa sekadar")
        print("   efek ikut naiknya harga. Dengan puluhan trade saja, ini petunjuk, bukan bukti.")
    else:
        print("  Data terlalu pendek untuk uji acak.")

    if plot_dir is not None:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            fig, ax = plt.subplots(figsize=(10, 5))
            (1 + hold).cumprod().plot(ax=ax, label="Buy & hold")
            (1 + main_r).cumprod().plot(ax=ax, label=f"Trend SMA{main_n}")
            ax.set_yscale("log")
            ax.set_title(f"{pair}: ekuitas (log), mulai = 1")
            ax.legend()
            out = Path(plot_dir) / f"equity_{pair.replace('/', '_')}.png"
            fig.savefig(out, dpi=110, bbox_inches="tight")
            plt.close(fig)
            print(f"\n  grafik disimpan: {out}")
        except Exception as e:  # noqa
            print(f"\n  (grafik dilewati: {e})")
    print()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default="user_data/data/binance/futures")
    ap.add_argument("--pairs", nargs="+", default=["BTC", "ETH"])
    ap.add_argument("--tf", default="1h", help="timeframe file sumber (1h disarankan)")
    ap.add_argument("--sma", type=int, default=200)
    ap.add_argument("--fee", type=float, default=0.0005, help="fee per sisi (0.0005 = 0.05%%)")
    ap.add_argument("--slip", type=float, default=0.0005, help="slippage per sisi")
    ap.add_argument("--split", default="2025-01-01")
    ap.add_argument("--plot-dir", default=".")
    a = ap.parse_args()

    cost = a.fee + a.slip
    split = pd.Timestamp(a.split)
    for base in a.pairs:
        try:
            close = load_daily_close(find_file(Path(a.data_dir), base, a.tf))
        except FileNotFoundError as e:
            print(f"[lewati] {e}")
            continue
        if len(close) < max(WINDOWS) + 200:
            print(f"[lewati] {base}: data kurang dari {max(WINDOWS)+200} hari")
            continue
        report(f"{base}/USDT", close, split, cost, a.sma, a.plot_dir)

    print("Catatan: ini uji historis. Hasil bagus di masa lalu bukan jaminan. Bandingkan juga")
    print("dengan RegimeTrendPullback pada periode yang sama dan standar yang sama (DD, per tahun, tanpa outlier).")


if __name__ == "__main__":
    main()
