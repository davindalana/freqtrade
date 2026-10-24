# PANDUAN REVIEW STRATEGI & AUDIT BACKTEST

Folder ini disiapkan khusus untuk mempermudah pengecekan dan audit mendalam terhadap kode strategi **`FUnifiedMasterStrategy.py`**, data riwayat trade backtest, serta evaluasi potensi bias (seperti *lookahead bias*, *overfitting*, atau *unrealistic fills*).

---

## 📁 DAFTAR FILE DALAM FOLDER INI

1. **[`FUnifiedMasterStrategy.py`](file:///Users/davindalana/Documents/Project/FreqTrade/review_strategy/FUnifiedMasterStrategy.py)**  
   File strategi utama Freqtrade yang saat ini aktif di bot live.

2. **[`backtest_2026_bear_market.json`](file:///Users/davindalana/Documents/Project/FreqTrade/review_strategy/backtest_2026_bear_market.json)**  
   Data mentah JSON hasil backtest periode **1 Januari 2026 – 17 Oktober 2026** (Kondisi pasar *bearish / sideways*, tren pasar rata-rata -17.89%). Berisi seluruh log transaksi individual per koin, waktu open/close, exit reason, dan slippage.

3. **[`backtest_2024_bull_market.json`](file:///Users/davindalana/Documents/Project/FreqTrade/review_strategy/backtest_2024_bull_market.json)**  
   Data mentah JSON hasil backtest periode **1 Oktober 2024 – 31 Desember 2024** (Kondisi pasar *bull run*, tren pasar rata-rata +80.87%).

4. **`backtest-result-2026-10-19_04-46-52.zip` & `backtest-result-2026-10-19_04-47-03.zip`**  
   File archive resmi Freqtrade yang dapat langsung dibuka menggunakan perintah:
   ```bash
   freqtrade backtesting-analysis --analysis-groups 1 2 3 --backtest-filename user_data/backtest_results/backtest-result-2026-10-19_04-46-52.zip
   ```

---

## 🔍 RINGKASAN METRIK HASIL BACKTEST

| Parameter Pengujian | Uji 1: Bearish / Sideway (2026) | Uji 2: Bull Run (Q4 2024) |
|:---|:---:|:---:|
| **Rentang Waktu** | 2026-01-01 s/d 2026-10-17 (~10 Bulan) | 2024-10-01 s/d 2024-12-31 (3 Bulan) |
| **Kondisi Pasar Riil** | Turun **-17.89%** | Naik **+80.87%** |
| **Total Transaksi** | 128 trade | 45 trade |
| **Winrate** | **59.38%** (76 Win / 52 Loss) | **64.44%** (29 Win / 16 Loss) |
| **Net Profit (USDT)** | **+$202.31 USDT** | **+$180.76 USDT** |
| **Persentase Profit** | **+20.23%** (Modal 1,000 USDT) | **+18.08%** (Modal 1,000 USDT) |
| **Max Drawdown Akun** | **7.46%** | **4.12%** |
| **Profit Factor** | **1.58** | **1.82** |
| **Kinerja Posisi SHORT** | **+33.26% profit** (Penyelamat bear) | Posisi disaring otomatis oleh filter 4h |
| **Kinerja Posisi LONG** | Terbatas karena filter tren makro 4h | **+18.08% profit** dominan dari Long |

---

## 🛠️ LOGIKA KRITIS UNTUK DI-REVIEW

### 1. Logika Stoploss & Leverage (Baris 60–83):
```python
stoploss = -0.04  # -4% base hard stoploss
```
* **Leverage:** Dipatok pada **2.0x isolated leverage**.
* **Effective Account Risk:** Pada 2x leverage, penurunan harga underlying sebesar -4% mengakibatkan loss -8% dari margin terpasang.
* **Margin Safety Buffer:** Titik likuidasi berada pada penurunan -50%. Jarak likuidasi adalah **12.5x lebih jauh** dibandingkan titik cutloss -4%.

### 2. Logika Breakeven Trailing Stop (Baris 63–67):
```python
trailing_stop = True
trailing_stop_positive = 0.008               # Kunci profit minimal +0.8%
trailing_stop_positive_offset = 0.018        # Aktif saat harga floating profit +1.8%
trailing_only_offset_is_reached = True
```
* Posisi yang baru masuk tidak diganggu trailing stop sampai keuntungan bersih mencapai **+1.8%**.
* Begitu menyentuh +1.8%, stoploss otomatis digeser ke atas level entry (**+0.8% profit bersih**). Trade yang sudah dalam posisi menang dijamin tidak akan pernah berbalik menjadi rugi.

### 3. Logika Asymmetric ROI (Baris 51–58):
```python
minimal_roi = {
    "0": 0.08,      # 8% jika terjadi lonjakan instan
    "60": 0.05,     # 5% setelah 1 jam
    "180": 0.035,   # 3.5% setelah 3 jam
    "360": 0.025,   # 2.5% setelah 6 jam
    "720": 0.015,   # 1.5% setelah 12 jam
}
```
* Dirancang agar posisi menang dibiarkan berjalan (*let winners run*) untuk menangkap reli tren besar.

### 4. Pencegahan Lookahead Bias (Bocoran Data Masa Depan):
* **Informative 4h:** Menggunakan decorator `@informative("4h")` bawaan Freqtrade. Freqtrade secara internal melakukan *backward-shift / forward-fill* sehingga candle 4h yang digunakan pada candle 1h pukul 14:00 hanyalah candle 4h yang sudah tertutup pada pukul 12:00 (tidak ada kebocoran candle masa depan).
* **Eksekusi:** `process_only_new_candles = True` memastikan keputusan entry hanya dihitung sekali pada pembukaan candle baru, bukan di tengah-tengah candle berjalan.

---

## 💻 CARA MENJALANKAN ULANG BACKTEST (REPRODUKSI HASIL)

Untuk memvalidasi ulang secara mandiri melalui terminal:

```bash
# 1. Masuk ke virtual environment
source .venv/bin/activate

# 2. Jalankan backtest periode Bear Market 2026:
freqtrade backtesting \
  --strategy FUnifiedMasterStrategy \
  --strategy-path review_strategy \
  --config user_data/config_live_15usdt.json \
  --timerange 20260101-20261017

# 3. Jalankan backtest periode Bull Run 2024:
freqtrade backtesting \
  --strategy FUnifiedMasterStrategy \
  --strategy-path review_strategy \
  --config user_data/config_live_15usdt.json \
  --timerange 20241001-20241231
```
