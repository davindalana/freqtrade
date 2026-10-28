# flake8: noqa: F401
# isort: skip_file
from datetime import datetime
from typing import Optional

import numpy as np  # noqa
import pandas as pd  # noqa
from pandas import DataFrame

import talib.abstract as ta
import freqtrade.vendor.qtpylib.indicators as qtpylib
from freqtrade.persistence import Trade
from freqtrade.strategy import (
    DecimalParameter,
    IntParameter,
    IStrategy,
    informative,
    stoploss_from_absolute,
)


class RegimeTrendPullback(IStrategy):
    """
    Regime-filtered trend pullback (long & short), 1h + 4h filter.

    Ide:
      1. Hanya trade searah tren besar (EMA50 vs EMA200 di 4h).
      2. Masuk saat pullback pulih (RSI cross) di dalam tren 1h yang kuat (ADX).
      3. Stoploss ATR chandelier (trailing mengikuti volatilitas, bukan angka tetap).
      4. Exit saat struktur tren 1h patah. Tidak ada ROI kecil yang memotong profit.
      5. Protections untuk menghentikan trading saat market choppy.

    BELUM DIBACKTEST. Jalankan backtest + hyperopt + dry-run sebelum uang asli.
    """

    INTERFACE_VERSION = 3
    timeframe = "1h"
    can_short = True

    # Exit ditangani sinyal + custom_stoploss, ROI dibuat sangat longgar
    minimal_roi = {"0": 10}
    stoploss = -0.15  # hard stop darurat (pada profit ber-leverage)
    use_custom_stoploss = True
    trailing_stop = False

    process_only_new_candles = True
    # EMA200 di 4h = 800 candle 1h
    startup_candle_count = 800

    # Hyperoptable
    adx_min = IntParameter(15, 30, default=20, space="buy", optimize=True)
    rsi_long = IntParameter(30, 50, default=40, space="buy", optimize=True)
    rsi_short = IntParameter(50, 70, default=60, space="buy", optimize=True)
    atr_mult = DecimalParameter(1.5, 4.0, default=2.5, decimals=1, space="sell", optimize=True)

    @property
    def protections(self):
        return [
            {"method": "CooldownPeriod", "stop_duration_candles": 3},
            {
                "method": "StoplossGuard",
                "lookback_period_candles": 48,
                "trade_limit": 3,
                "stop_duration_candles": 24,
                "only_per_pair": False,
            },
            {
                "method": "MaxDrawdown",
                "lookback_period_candles": 1440,
                "trade_limit": 3,
                "stop_duration_candles": 720,
                "max_allowed_drawdown": 0.15,
            },
            {
                "method": "LowProfitPairs",
                "lookback_period_candles": 48,
                "trade_limit": 2,
                "stop_duration_candles": 24,
                "required_profit": 0.0,
            },
        ]

    # ---------- Indicators ----------
    @informative("4h")
    def populate_indicators_4h(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)
        return dataframe

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        dataframe["vol_mean"] = dataframe["volume"].rolling(30).mean()
        return dataframe

    # ---------- Signals ----------
    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        liquid = (dataframe["volume"] > 0) & (dataframe["volume"] > dataframe["vol_mean"] * 0.5)

        up_regime = (
            (dataframe["ema50_4h"] > dataframe["ema200_4h"])
            & (dataframe["close"] > dataframe["ema200_4h"])
        )
        down_regime = (
            (dataframe["ema50_4h"] < dataframe["ema200_4h"])
            & (dataframe["close"] < dataframe["ema200_4h"])
        )

        dataframe.loc[
            up_regime
            & (dataframe["ema20"] > dataframe["ema50"])
            & (dataframe["adx"] > self.adx_min.value)
            & qtpylib.crossed_above(dataframe["rsi"], self.rsi_long.value)
            & (dataframe["close"] > dataframe["ema50"])
            & liquid,
            ["enter_long", "enter_tag"],
        ] = (1, "pullback_long")

        dataframe.loc[
            down_regime
            & (dataframe["ema20"] < dataframe["ema50"])
            & (dataframe["adx"] > self.adx_min.value)
            & qtpylib.crossed_below(dataframe["rsi"], self.rsi_short.value)
            & (dataframe["close"] < dataframe["ema50"])
            & liquid,
            ["enter_short", "enter_tag"],
        ] = (1, "pullback_short")

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Struktur tren 1h patah
        dataframe.loc[
            qtpylib.crossed_below(dataframe["ema20"], dataframe["ema50"]),
            ["exit_long", "exit_tag"],
        ] = (1, "trend_break")
        dataframe.loc[
            qtpylib.crossed_above(dataframe["ema20"], dataframe["ema50"]),
            ["exit_short", "exit_tag"],
        ] = (1, "trend_break")
        return dataframe

    # ---------- Risk ----------
    def custom_stoploss(self, pair: str, trade: Trade, current_time: datetime,
                        current_rate: float, current_profit: float,
                        after_fill: bool, **kwargs) -> Optional[float]:
        """ATR chandelier: stop mengikuti high/low sejak entry dikurangi/ditambah N x ATR."""
        dataframe, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
        if dataframe is None or dataframe.empty:
            return None
        atr = dataframe.iloc[-1]["atr"]
        if not np.isfinite(atr):
            return None

        dist = self.atr_mult.value * atr
        if trade.is_short:
            min_rate = trade.min_rate if trade.min_rate is not None else trade.open_rate
            stop_rate = min_rate + dist
        else:
            max_rate = trade.max_rate if trade.max_rate is not None else trade.open_rate
            stop_rate = max_rate - dist

        return stoploss_from_absolute(
            stop_rate,
            current_rate,
            is_short=trade.is_short,
            leverage=trade.leverage,
        )

    def leverage(self, pair: str, current_time: datetime, current_rate: float,
                 proposed_leverage: float, max_leverage: float, entry_tag: Optional[str],
                 side: str, **kwargs) -> float:
        return min(2.0, max_leverage)
