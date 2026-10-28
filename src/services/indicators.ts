import { Candle } from '../types/freqtrade';

export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length);
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result[i] = data[i];
    } else if (i === period - 1) {
      result[i] = ema;
    } else {
      ema = data[i] * k + ema * (1 - k);
      result[i] = ema;
    }
  }
  return result;
}

export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result[i] = data[i];
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result[i] = sum / period;
    }
  }
  return result;
}

export function calculateBollingerBands(closes: number[], period = 20, multiplier = 2) {
  const sma = calculateSMA(closes, period);
  const upper: number[] = new Array(closes.length);
  const lower: number[] = new Array(closes.length);

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper[i] = closes[i];
      lower[i] = closes[i];
    } else {
      let sumSq = 0;
      for (let j = 0; j < period; j++) {
        const diff = closes[i - j] - sma[i];
        sumSq += diff * diff;
      }
      const stdDev = Math.sqrt(sumSq / period);
      upper[i] = sma[i] + multiplier * stdDev;
      lower[i] = sma[i] - multiplier * stdDev;
    }
  }

  return { upper, middle: sma, lower };
}

export function calculateRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length <= period) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = 100 - (100 / (1 + rs));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - (100 / (1 + rs));
  }

  return rsi;
}

export function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = calculateEMA(macdLine, signal);
  const histogram = closes.map((_, i) => macdLine[i] - signalLine[i]);

  return { macd: macdLine, signal: signalLine, histogram };
}

export function enrichCandlesWithIndicators(candles: Candle[], rsiBuyThresh = 30, rsiSellThresh = 70): Candle[] {
  const closes = candles.map(c => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const bb = calculateBollingerBands(closes, 20, 2);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);

  return candles.map((c, i) => {
    // Freqtrade typical logic: Buy when RSI < 30 and price touches lower BB, Sell when RSI > 70 or price above upper BB
    const buy_signal = i > 15 && (rsi[i] < rsiBuyThresh && c.close <= bb.lower[i] * 1.01);
    const sell_signal = i > 15 && (rsi[i] > rsiSellThresh || c.close >= bb.upper[i] * 0.99);

    return {
      ...c,
      ema20: ema20[i],
      ema50: ema50[i],
      bb_upper: bb.upper[i],
      bb_middle: bb.middle[i],
      bb_lower: bb.lower[i],
      rsi: rsi[i],
      macd: macd.macd[i],
      macd_signal: macd.signal[i],
      macd_hist: macd.histogram[i],
      buy_signal,
      sell_signal
    };
  });
}
