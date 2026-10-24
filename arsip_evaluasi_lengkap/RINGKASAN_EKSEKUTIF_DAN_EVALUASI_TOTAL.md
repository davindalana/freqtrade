# KOMPENDIUM LENGKAP: AUDIT STRATEGI, FORENSIK KUANTITATIF, DAN RISET SISTEM TRADING

Dokumen ini merangkum secara menyeluruh seluruh perjalanan analisis, audit keamanan, pengujian backtest realistis, pembuktian outlier matematis, hingga pemodelan struktur pasar yang telah kita lakukan bersama.

---

## DAFTAR ISI
1. [Status Operasional & Tanggap Darurat Keamanan](#1-status-operasional--tanggap-darurat-keamanan)
2. [Forensik Strategi FUnified: Fakta vs Ilusi Intra-Candle](#2-forensik-strategi-funified-fakta-vs-ilusi-intra-candle)
3. [Audit Menyeluruh RegimeTrendPullback (4,8 Tahun & Outlier Dependency)](#3-audit-menyeluruh-regimetrendpullback-48-tahun--outlier-dependency)
4. [Riset Filter Tren Harian (SMA 200) Selama 2 Siklus Pasar Penuh (2020–2026)](#4-riset-filter-tren-harian-sma-200-selama-2-siklus-pasar-penuh-20202026)
5. [Dekomposisi Matematika Futures: Leverage, Likuidasi, & Mitos "Akurasi 90%"](#5-dekomposisi-matematika-futures-leverage-likuidasi--mitos-akurasi-90)
6. [Otomatisasi Analisis Struktur Pasar (Setup Gambar TradingView)](#6-otomatisasi-analisis-struktur-pasar-setup-gambar-tradingview)
7. [Panduan Operasional & Kesimpulan Akhir](#7-panduan-operasional--kesimpulan-akhir)

---

## 1. STATUS OPERASIONAL & TANGGAP DARURAT KEAMANAN

### Tindakan Keamanan yang Diterapkan
- **Pembersihan API Key:** Kredensial Binance API asli telah dibersihkan total dari konfigurasi `config_live_15usdt.json` dan diganti dengan string kosong `""`.
- **Rotasi Kredensial Web UI:** Password Web UI telah diperbarui, serta `jwt_secret_key` dan `ws_token` dirotasi menggunakan enkripsi acak 256-bit baru.
- **Penyempitan Jaringan:** `listen_ip_address` diubah dari `0.0.0.0` (terbuka di jaringan lokal) menjadi ketat di `127.0.0.1` (localhost only).
- **Proteksi Git:** File `.env` dipastikan masuk ke dalam aturan baris 110 `.gitignore` (`git check-ignore -v .env` terverifikasi bersih).
- **Pemisahan Database:** Database transaksi dipisahkan secara permanen:
  - Database transaksi riil masa lalu diisolasi di `tradesv3_live.sqlite` (tidak disentuh).
  - Database pengujian simulasi berjalan di `tradesv3_dryrun.sqlite`.
- **Tindakan Wajib Pengguna:** API Key lama yang sempat terpapar ke percakapan **wajib dihapus permanen** di dashboard *Binance API Management*.

### Status Bot Saat Ini
- Bot Freqtrade saat ini sedang aktif berjalan di background sebagai **uji ketahanan sistem (dry-run)** menggunakan strategi baseline [RegimeTrendPullback.py](file:///Users/davindalana/Documents/Project/FreqTrade/user_data/strategies/futures/RegimeTrendPullback.py) (Git Commit `48a9e1a50`, Tag `regime-trend-pullback-v1.0`).
- Saldo virtual: $40 USDT | Stake per trade: $15 USDT | Max open trades: 2 | Leverage dibatasi maksimal 2x.
- Bot telah berjalan stabil lebih dari 8 jam tanpa memory leak, error kalkulasi 800 candle, ataupun crash koneksi.

---

## 2. FORENSIK STRATEGI FUNIFIED: FAKTA VS ILUSI INTRA-CANDLE

Klaim awal bahwa strategi `FUnifiedMasterStrategy` menghasilkan profit +20% di tahun 2026 terbukti merupakan **artefak simulasi candle 1h**.

### Mengapa Angka Awal Menipu?
Dalam backtest candle 1h standar tanpa detail intra-bar, mesin simulator mengasumsikan urutan harga ekstrem (High dan Low) terjadi secara ideal menguntungkan posisi (misal: TP tersentuh sebelum SL). 

Ketika backtest dijalankan dengan standar realistis industri kuantitatif:
- Menggunakan `--timeframe-detail 5m` (membongkar candle 1h menjadi candle 5 menit riil).
- Mengaktifkan proteksi bursa (`--enable-protections`).

Hasil aslinya berbalik drastis:
- **Periode 2026:** Kinerja hancur dari +20% menjadi **-9,5%** (Profit Factor 0,93, Drawdown 23%).
- **Periode 2025 (Out-of-Sample):** Kinerja hancur menjadi **-28,0%** (Profit Factor 0,86, Drawdown 34%).
- **Versi Modifikasi (Exit Sinyal tanpa Trailing):** Menghasilkan +29% di 2026 karena di-tuning pada data tersebut, namun saat diuji di data 2025 hasilnya **-61,8% dengan Drawdown 62%**. Ini membuktikan terjadinya **overfitting ekstrem (curve fitting)**.

---

## 3. AUDIT MENYELURUH REGIMETRENDPULLBACK (4,8 TAHUN & OUTLIER DEPENDENCY)

Strategi `RegimeTrendPullback` dirancang dengan logika teknikal yang sehat (Filter Rezim 4h, Pullback RSI 1h, Stoploss ATR Chandelier, Proteksi Cooldown, StoplossGuard, dan MaxDrawdown 15%).

### A. Hasil Agregat 4,8 Tahun (Non-overlapping)
| Periode | Total Trade | Profit Bersih | Profit Factor | Winrate | Max Drawdown |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **2022–2024** | 141 | -$3,14 USDT | 0,94 | 37,6% | 34,5% |
| **2025** | 40 | +$5,25 USDT | 1,41 | 45,0% | 11,4% |
| **2026** (s/d Okt) | 29 | +$1,66 USDT | 1,18 | 31,0% | 8,9% |
| **TOTAL (4,8 Thn)** | **210** | **+$3,77 USDT** | **~1,02** | **~38%** | **34,5%** |

*Rata-rata profit hanya sekitar $0,018 per trade (~0,1% dari stake $15). Sebelum dipotong slippage jaringan dan fee riil, performa ini setara dengan nol.*

### B. Pembuktian Ketergantungan Outlier (Matematis)
- **2026:** Total profit +$1,66 USDT. Tiga trade terbaik (NEAR +$4,18, SUI +$2,00, AVAX +$1,19) menyumbang +$7,37 USDT.
  $$\text{Profit Tanpa Top 3 Trade} = \$1{,}66 - \$7{,}37 = \mathbf{-\$5{,}71\text{ USDT (RUGI)}}$$
- **2025:** Total profit +$5,25 USDT. Tiga trade terbaik (LINK +$3,77, SUI +$1,08, SOL +$1,02) menyumbang +$5,87 USDT.
  $$\text{Profit Tanpa Top 3 Trade} = \$5{,}25 - \$5{,}87 = \mathbf{-\$0{,}62\text{ USDT (RUGI)}}$$

### C. Uji Sensitivitas Parameter (Grid Test 2025)
- `adx_min = 20, atr_mult = 2.5` (Baseline): **+$5,25 USDT (+13,1%)**
- `adx_min = 15, atr_mult = 2.0` (Longgar): **+$1,06 USDT (+2,6%)**
- `adx_min = 25, atr_mult = 3.0` (Ketat): **-$2,96 USDT (-7,4%, PF runtuh ke 0,63)**
*Perubahan parameter tipis langsung membalikkan kinerja menjadi negatif, mengindikasikan ketiadaan edge yang kokoh.*

---

## 4. RISET FILTER TREN HARIAN (SMA 200) SELAMA 2 SIKLUS PASAR PENUH (2020–2026)

Pengujian skrip `trend_filter_test.py` menggunakan data harian dari September 2019 hingga Oktober 2026 (evaluasi 6,3 tahun, mencakup Bull Run 2020–2021, Bear Market 2022, Bull Run 2023–2024, dan Sideways 2025–2026).

### A. Perbandingan Kinerja Utama
| Aset / Strategi | Total Return | CAGR | Max Drawdown | Sharpe | Calmar | Jml Entry | Waktu di Pasar |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **BTC Buy & Hold** | +807,5% | 42,0% | -76,7% | 0,90 | 0,55 | - | 100% |
| **BTC Trend SMA 200** | +776,7% | 41,2% | **-64,1%** | **1,02** | **0,64** | 27 | 59% |
| **ETH Buy & Hold** | +617,5% | 38,4% | -79,4% | 0,81 | 0,48 | - | 100% |
| **ETH Trend SMA 200** | **+1696,3%** | **61,0%** | **-59,7%** | **1,11** | **1,02** | 18 | 55% |

### B. Evaluasi Kritis: Kapan Filter Tren Berhasil & Kapan Gagal?
1. **Penyelamat Terbesar (Tahun 2022):** BTC B&H merugi **-64,2%**, filter tren memegang cash 100% sehingga return **0,0%**.
2. **Kelemahan Terbesar (Tahun 2021 & 2025):** 
   - Di 2021 (fase double-top yang bergejolak cepat), filter tren mengalami whipsaw berulang kali: return **-21,0%** saat B&H naik **+59,6%**.
   - Di 2025 (pasar sideways berkepanjangan), filter tren tertinggal: **-17,0%** saat B&H **-6,4%**.
3. **Uji Kebetulan (Permutasi Acak 2.000x):**
   - Nilai $p = 0,091$ pada CAGR BTC dan $p = 0,077$ pada Sharpe ratio.
   - Karena $p > 0,05$, sebagian return filter tren BTC tertolong oleh fakta bahwa modal berada di pasar saat tren naik makro secara umum, bukan murni presisi timing mutlak.
   - **Kesimpulan:** Filter tren adalah **asuransi proteksi modal ("BTC dengan rem")**, bukan alat pencetak alfa ekstra.

---

## 5. DEKOMPOSISI MATEMATIKA FUTURES: LEVERAGE, LIKUIDASI, & MITOS "AKURASI 90%"

### A. Mitos Model Prediksi >90%
- Hedge fund kuantitatif paling legendaris di dunia, **Renaissance Technologies (Medallion Fund)** karya Jim Simons, hanya memiliki rata-rata winrate **50,75% – 54%**.
- Di pasar yang efisien dan likuid, harga adalah gerak acak (*random walk*). Klaim bot winrate 90% di internet hampir selalu menyembunyikan rasio Risk-to-Reward asimetris (menang $1 kalah $10 / Martingale tanpa stoploss) yang berujung pada kehancuran akun mendadak.

### B. Matematika Likuidasi vs Analisis Timeframe Mingguan
Pada chart Weekly BTC ($81.100) dengan target $88k–$95k dan batas toleransi drop ke $72.057 (-11,2%) atau $68.000 (-16,2%):
- **Leverage 20x:** Likuidasi di $77.050 (penurunan -5% langsung hangus).
- **Leverage 10x:** Likuidasi di $72.990 (penurunan -10% langsung hangus sebelum menyentuh support).
- **Leverage 5x:** Likuidasi di $65.200 (penurunan -20%, batas maksimal leverage yang diizinkan jika ingin likuidasi di bawah $70k).
- **Leverage 3x (Rekomendasi Aman):** Likuidasi di **~$54.400** (kebal terhadap jarum manipulasi bursa).
- **Biaya Funding Drag:** Memegang posisi long leverage tinggi selama 2–3 bulan di masa bull run memakan 9%–27% modal hanya untuk biaya bunga bursa (*funding fee*).

---

## 6. OTOMATISASI ANALISIS STRUKTUR PASAR (SETUP GAMBAR TRADINGVIEW)

Setup teknikal pada gambar TradingView (Buy Area, Maximum Price Drop, Target 1 & 2) telah diotomatiskan ke dalam skrip Python independen: [market_structure_analyzer.py](file:///Users/davindalana/Documents/Project/FreqTrade/arsip_evaluasi_lengkap/market_structure_analyzer.py).

Skrip ini:
1. Menemukan Swing Highs dan Swing Lows mingguan.
2. Memetakan zona pantulan S/R Flip secara dinamis.
3. Menghitung Target 1 dan Target 2 berbasis Fibonacci Extension (1.272 dan 1.618).
4. Menentukan batas maksimal safe drop dan batas invalidasi.
5. Menghasilkan chart beranotasi zona warna yang dapat disimpan dan diinspeksi.

---

## 7. PANDUAN OPERASIONAL & KESIMPULAN AKHIR

| Jalur Pendekatan | Kesimpulan Empiris & Saran Eksekusi |
| :--- | :--- |
| **Bot Futures Intra-Day (Freqtrade)** | **Tinggalkan untuk modal riil.** Digunakan murni sebagai lab eksperimen dry-run untuk mempelajari software dan order routing. |
| **Swing BTC Spot (Trend Filter SMA 200)** | **Sangat Direkomendasikan jika ingin tenang.** Cukup cek manual 1x sehari pukul 07:00 WIB (00:00 UTC). Nol funding fee, nol risiko likuidasi, nol risiko API key. |
| **DCA / Buy & Hold Murni** | **Pilihan paling efisien waktu.** Menghindari stres akibat whipsaw sideways dan menangkap 100% reli pasar tanpa perlu memantau grafik harian. |
| **Leveraged Swing (Jika Tetap Ingin Futures)** | Maksimal leverage 3x, bagi entry bertahap (DCA 3 tahap: $81k, $76k, $72k), dan tetapkan stoploss jika weekly close < $68k. |
