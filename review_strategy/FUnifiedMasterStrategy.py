"""
FUnifiedMasterStrategy - The Ultimate Unified Futures Strategy
Combines the top proven elements from:
1. FTurboCompounding: Triple Supertrend alignment + 2.0x leverage + progressive runner ROI.
2. RegimeTrendPullback: 4h Higher-Timeframe Macro Trend Filter + Native Freqtrade Protections.
3. FSupertrendHighWin: Time-of-day Session Filter (Asian open guard) + News Volume Spike Guard.
4. Strategy005 / MultiMa: exit_profit_only = True + Asymmetric Risk-to-Reward.
"""

from datetime import datetime
from typing import Optional
import logging

import numpy as np
import pandas as pd
from pandas import DataFrame
import talib.abstract as ta

import technical.indicators as ftt
import freqtrade.vendor.qtpylib.indicators as qtpylib
from freqtrade.strategy import (
    IStrategy,
    IntParameter,
    DecimalParameter,
    informative,
)


class FUnifiedMasterStrategy(IStrategy):
    INTERFACE_VERSION: int = 3

    # Proven Hyperopted Supertrend parameters
    buy_params = {
        "buy_m1": 4,
        "buy_m2": 7,
        "buy_m3": 1,
        "buy_p1": 8,
        "buy_p2": 9,
        "buy_p3": 8,
    }

    sell_params = {
        "sell_m1": 1,
        "sell_m2": 3,
        "sell_m3": 6,
        "sell_p1": 16,
        "sell_p2": 18,
        "sell_p3": 18,
    }

    # Asymmetric ROI Table (Lets winners run, captures large trend moves)
    minimal_roi = {
        "0": 0.08,      # 8% instant runner windfall
        "60": 0.05,     # 5% after 1 hour
        "180": 0.035,   # 3.5% after 3 hours
        "360": 0.025,   # 2.5% after 6 hours
        "720": 0.015,   # 1.5% after 12 hours
    }

    # Controlled Stoploss
    stoploss = -0.04    # 4% base stoploss (8% effective risk at 2x leverage)

    # Fast Break-Even Trailing Stop: Locks in profits once in the green
    trailing_stop = True
    trailing_stop_positive = 0.008               # Locks +0.8% net profit (1.6% at 2x)
    trailing_stop_positive_offset = 0.018        # Triggers at +1.8% profit
    trailing_only_offset_is_reached = True

    timeframe = "1h"
    can_short = True
    startup_candle_count = 210
    process_only_new_candles = True

    # Critical Rule: Never exit on indicator flicker at a loss. Only exit in profit.
    use_exit_signal = True
    exit_profit_only = True

    # 2.0x Moderate Leverage for optimal compound growth without liquidation risk
    def leverage(self, pair: str, current_time: datetime, current_rate: float,
                 proposed_leverage: float, max_leverage: float, entry_tag: Optional[str],
                 side: str, **kwargs) -> float:
        return min(2.0, max_leverage)

    # Protections to prevent overtrading and pause during choppy market streaks
    @property
    def protections(self):
        return [
            {
                "method": "CooldownPeriod",
                "stop_duration_candles": 3,
            },
            {
                "method": "StoplossGuard",
                "lookback_period_candles": 48,
                "trade_limit": 3,
                "stop_duration_candles": 24,
                "only_per_pair": True,
            },
        ]

    # --- 4h Informative Indicator: Macro Regime Compass ---
    @informative("4h")
    def populate_indicators_4h(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema_50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema_200"] = ta.EMA(dataframe, timeperiod=200)
        return dataframe

    buy_m1 = IntParameter(1, 7, default=1)
    buy_m2 = IntParameter(1, 7, default=3)
    buy_m3 = IntParameter(1, 7, default=4)
    buy_p1 = IntParameter(7, 21, default=14)
    buy_p2 = IntParameter(7, 21, default=10)
    buy_p3 = IntParameter(7, 21, default=10)

    sell_m1 = IntParameter(1, 7, default=1)
    sell_m2 = IntParameter(1, 7, default=3)
    sell_m3 = IntParameter(1, 7, default=4)
    sell_p1 = IntParameter(7, 21, default=14)
    sell_p2 = IntParameter(7, 21, default=10)
    sell_p3 = IntParameter(7, 21, default=10)

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Trend & Momentum Indicators on 1h
        dataframe["ema_200"] = ta.EMA(dataframe, timeperiod=200)
        dataframe["ema_50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)

        # Session Time & Volume Anomaly Guard
        dataframe["hour_utc"] = dataframe["date"].dt.hour
        dataframe["volume_mean_24"] = ta.SMA(dataframe["volume"], timeperiod=24)

        # Supertrend calculation
        new_cols = []
        for multiplier in self.buy_m1.range:
            for period in self.buy_p1.range:
                new_cols.append(
                    self.supertrend_direction(
                        dataframe, multiplier, period,
                        f"supertrend_1_buy_{multiplier}_{period}",
                    )
                )

        for multiplier in self.buy_m2.range:
            for period in self.buy_p2.range:
                new_cols.append(
                    self.supertrend_direction(
                        dataframe, multiplier, period,
                        f"supertrend_2_buy_{multiplier}_{period}",
                    )
                )

        for multiplier in self.buy_m3.range:
            for period in self.buy_p3.range:
                new_cols.append(
                    self.supertrend_direction(
                        dataframe, multiplier, period,
                        f"supertrend_3_buy_{multiplier}_{period}",
                    )
                )

        for multiplier in self.sell_m1.range:
            for period in self.sell_p1.range:
                new_cols.append(
                    self.supertrend_direction(
                        dataframe, multiplier, period,
                        f"supertrend_1_sell_{multiplier}_{period}",
                    )
                )

        for multiplier in self.sell_m2.range:
            for period in self.sell_p2.range:
                new_cols.append(
                    self.supertrend_direction(
                        dataframe, multiplier, period,
                        f"supertrend_2_sell_{multiplier}_{period}",
                    )
                )

        for multiplier in self.sell_m3.range:
            for period in self.sell_p3.range:
                new_cols.append(
                    self.supertrend_direction(
                        dataframe, multiplier, period,
                        f"supertrend_3_sell_{multiplier}_{period}",
                    )
                )

        if new_cols:
            dataframe = pd.concat([dataframe] + new_cols, axis=1)

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # 4h Macro Regime Conditions
        macro_bullish = (
            (dataframe["ema_50_4h"] > dataframe["ema_200_4h"])
            & (dataframe["close"] > dataframe["ema_200_4h"])
        )
        macro_bearish = (
            (dataframe["ema_50_4h"] < dataframe["ema_200_4h"])
            & (dataframe["close"] < dataframe["ema_200_4h"])
        )

        # Long Entry:
        # 1. 4h Macro Bullish Trend
        # 2. 1h Triple Supertrend all "up"
        # 3. 1h Price > EMA200
        # 4. ADX > 20 (confirmed trend strength)
        # 5. RSI sweet spot (40 - 68, not overbought)
        # 6. Session filter (avoid 06:00-09:00 WIB daily close / Asian open whipsaws)
        # 7. Volume spike guard (avoid entering in middle of an abnormal news spike)
        dataframe.loc[
            macro_bullish
            & (dataframe[f"supertrend_1_buy_{self.buy_m1.value}_{self.buy_p1.value}"] == "up")
            & (dataframe[f"supertrend_2_buy_{self.buy_m2.value}_{self.buy_p2.value}"] == "up")
            & (dataframe[f"supertrend_3_buy_{self.buy_m3.value}_{self.buy_p3.value}"] == "up")
            & (dataframe["close"] > dataframe["ema_200"])
            & (dataframe["adx"] > 20)
            & (dataframe["rsi"] >= 40)
            & (dataframe["rsi"] <= 68)
            & (dataframe["volume"] > 0)
            & (~dataframe["hour_utc"].isin([23, 0, 1]))
            & (dataframe["volume"] < (dataframe["volume_mean_24"] * 3.5)),
            ["enter_long", "enter_tag"],
        ] = (1, "unified_long")

        # Short Entry:
        # 1. 4h Macro Bearish Trend
        # 2. 1h Triple Supertrend all "down"
        # 3. 1h Price < EMA200
        # 4. ADX > 20 (confirmed trend strength)
        # 5. RSI sweet spot (32 - 60, not oversold)
        # 6. Session filter
        # 7. Volume spike guard
        dataframe.loc[
            macro_bearish
            & (dataframe[f"supertrend_1_sell_{self.sell_m1.value}_{self.sell_p1.value}"] == "down")
            & (dataframe[f"supertrend_2_sell_{self.sell_m2.value}_{self.sell_p2.value}"] == "down")
            & (dataframe[f"supertrend_3_sell_{self.sell_m3.value}_{self.sell_p3.value}"] == "down")
            & (dataframe["close"] < dataframe["ema_200"])
            & (dataframe["adx"] > 20)
            & (dataframe["rsi"] >= 32)
            & (dataframe["rsi"] <= 60)
            & (dataframe["volume"] > 0)
            & (~dataframe["hour_utc"].isin([23, 0, 1]))
            & (dataframe["volume"] < (dataframe["volume_mean_24"] * 3.5)),
            ["enter_short", "enter_tag"],
        ] = (1, "unified_short")

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Exits long when Supertrend 2 flips down (governed by exit_profit_only = True)
        dataframe.loc[
            (dataframe[f"supertrend_2_sell_{self.sell_m2.value}_{self.sell_p2.value}"] == "down"),
            ["exit_long", "exit_tag"],
        ] = (1, "supertrend_exit_long")

        # Exits short when Supertrend 2 flips up (governed by exit_profit_only = True)
        dataframe.loc[
            (dataframe[f"supertrend_2_buy_{self.buy_m2.value}_{self.buy_p2.value}"] == "up"),
            ["exit_short", "exit_tag"],
        ] = (1, "supertrend_exit_short")

        return dataframe

    def supertrend_direction(
        self, dataframe: DataFrame, multiplier: int, period: int, name: str
    ) -> pd.Series:
        _, stx = ftt.supertrend(dataframe, period=period, multiplier=multiplier)
        return pd.Series(stx, index=dataframe.index, name=name).fillna("")
