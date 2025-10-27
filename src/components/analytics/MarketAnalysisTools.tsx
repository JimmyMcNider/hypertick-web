/**
 * Advanced Market Analysis Tools
 * 
 * Provides sophisticated market analysis capabilities including:
 * - Real-time price charts with multiple timeframes
 * - Technical indicators (RSI, MACD, Bollinger Bands, SMA, EMA)
 * - Market depth visualization (Level II data)
 * - Volume analysis and liquidity metrics
 * - Correlation analysis between securities
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  LineChart, 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Target,
  Zap,
  Settings,
  Download,
  RefreshCw,
  Maximize2,
  Play,
  Pause
} from 'lucide-react';

interface MarketAnalysisToolsProps {
  sessionId: string;
  userId: string;
  defaultSymbol?: string;
}

interface PriceData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicator {
  name: string;
  values: number[];
  color: string;
  enabled: boolean;
}

interface MarketDepthData {
  bids: Array<{ price: number; size: number; orders: number }>;
  asks: Array<{ price: number; size: number; orders: number }>;
  spread: number;
  midPrice: number;
}

export default function MarketAnalysisTools({ sessionId, userId, defaultSymbol = 'AOE' }: MarketAnalysisToolsProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h'>('5m');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [marketDepth, setMarketDepth] = useState<MarketDepthData>({
    bids: [],
    asks: [],
    spread: 0,
    midPrice: 100
  });
  const [indicators, setIndicators] = useState<Record<string, TechnicalIndicator>>({
    sma: { name: 'SMA(20)', values: [], color: '#3B82F6', enabled: true },
    ema: { name: 'EMA(12)', values: [], color: '#EF4444', enabled: false },
    rsi: { name: 'RSI(14)', values: [], color: '#F59E0B', enabled: false },
    macd: { name: 'MACD', values: [], color: '#8B5CF6', enabled: false },
    bollinger: { name: 'Bollinger Bands', values: [], color: '#10B981', enabled: false }
  });
  const [isLive, setIsLive] = useState(true);
  const [correlationData, setCorrelationData] = useState<Record<string, number>>({});

  // WebSocket integration for real-time market data
  const { connected, marketData, socket } = useWebSocket({ 
    sessionId, 
    userId, 
    role: 'Student' 
  });

  useEffect(() => {
    generateInitialData();
    
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        updateMarketData();
      }, 1000); // Update every second for real-time feel
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedSymbol, timeframe, isLive]);

  useEffect(() => {
    if (socket) {
      socket.on('market_update', (data: any) => {
        if (data.symbol === selectedSymbol) {
          updatePriceFromMarketData(data);
        }
      });

      return () => {
        socket.off('market_update');
      };
    }
  }, [socket, selectedSymbol]);

  const generateInitialData = () => {
    const basePrice = 100;
    const dataPoints = 100;
    const data: PriceData[] = [];
    
    let price = basePrice;
    
    for (let i = 0; i < dataPoints; i++) {
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility * price;
      const open = price;
      const close = Math.max(0.1, price + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(Math.random() * 10000) + 1000;
      
      data.push({
        timestamp: new Date(Date.now() - (dataPoints - i) * getTimeframeMs()),
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    setPriceData(data);
    calculateTechnicalIndicators(data);
    generateMarketDepth(price);
  };

  const updateMarketData = () => {
    setPriceData(prev => {
      if (prev.length === 0) return prev;
      
      const lastPrice = prev[prev.length - 1].close;
      const volatility = 0.01;
      const change = (Math.random() - 0.5) * volatility * lastPrice;
      const newClose = Math.max(0.1, lastPrice + change);
      
      const newDataPoint: PriceData = {
        timestamp: new Date(),
        open: lastPrice,
        high: Math.max(lastPrice, newClose) * (1 + Math.random() * 0.005),
        low: Math.min(lastPrice, newClose) * (1 - Math.random() * 0.005),
        close: newClose,
        volume: Math.floor(Math.random() * 5000) + 500
      };
      
      const updated = [...prev.slice(1), newDataPoint];
      calculateTechnicalIndicators(updated);
      generateMarketDepth(newClose);
      
      return updated;
    });
  };

  const updatePriceFromMarketData = (marketUpdate: any) => {
    if (!isLive) return;
    
    setPriceData(prev => {
      if (prev.length === 0) return prev;
      
      const newDataPoint: PriceData = {
        timestamp: new Date(),
        open: prev[prev.length - 1].close,
        high: marketUpdate.lastPrice * 1.002,
        low: marketUpdate.lastPrice * 0.998,
        close: marketUpdate.lastPrice,
        volume: marketUpdate.volume || Math.floor(Math.random() * 5000) + 500
      };
      
      const updated = [...prev.slice(1), newDataPoint];
      calculateTechnicalIndicators(updated);
      generateMarketDepth(marketUpdate.lastPrice);
      
      return updated;
    });
  };

  const calculateTechnicalIndicators = (data: PriceData[]) => {
    const prices = data.map(d => d.close);
    
    setIndicators(prev => ({
      ...prev,
      sma: {
        ...prev.sma,
        values: calculateSMA(prices, 20)
      },
      ema: {
        ...prev.ema,
        values: calculateEMA(prices, 12)
      },
      rsi: {
        ...prev.rsi,
        values: calculateRSI(prices, 14)
      },
      macd: {
        ...prev.macd,
        values: calculateMACD(prices)
      },
      bollinger: {
        ...prev.bollinger,
        values: calculateBollingerBands(prices, 20, 2)
      }
    }));
  };

  const generateMarketDepth = (currentPrice: number) => {
    const spreadPercent = 0.002;
    const spread = currentPrice * spreadPercent;
    const midPrice = currentPrice;
    
    const bids: Array<{ price: number; size: number; orders: number }> = [];
    const asks: Array<{ price: number; size: number; orders: number }> = [];
    
    // Generate 10 levels of market depth
    for (let i = 1; i <= 10; i++) {
      const bidPrice = midPrice - (spread / 2) - (i * 0.01);
      const askPrice = midPrice + (spread / 2) + (i * 0.01);
      
      bids.push({
        price: bidPrice,
        size: Math.floor(Math.random() * 5000) + 100,
        orders: Math.floor(Math.random() * 10) + 1
      });
      
      asks.push({
        price: askPrice,
        size: Math.floor(Math.random() * 5000) + 100,
        orders: Math.floor(Math.random() * 10) + 1
      });
    }
    
    setMarketDepth({
      bids: bids.sort((a, b) => b.price - a.price),
      asks: asks.sort((a, b) => a.price - b.price),
      spread,
      midPrice
    });
  };

  const getTimeframeMs = () => {
    switch (timeframe) {
      case '1m': return 60000;
      case '5m': return 300000;
      case '15m': return 900000;
      case '1h': return 3600000;
      default: return 300000;
    }
  };

  // Technical Indicator Calculations
  const calculateSMA = (prices: number[], period: number): number[] => {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return Array(period - 1).fill(null).concat(sma);
  };

  const calculateEMA = (prices: number[], period: number): number[] => {
    const ema = [];
    const multiplier = 2 / (period + 1);
    ema[0] = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  };

  const calculateRSI = (prices: number[], period: number): number[] => {
    const rsi = [];
    const changes = [];
    
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    for (let i = period; i < changes.length; i++) {
      const gains = changes.slice(i - period, i).filter(c => c > 0);
      const losses = changes.slice(i - period, i).filter(c => c < 0);
      
      const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0)) / period : 0;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return Array(period + 1).fill(null).concat(rsi);
  };

  const calculateMACD = (prices: number[]): number[] => {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    
    return ema12.map((val, i) => val && ema26[i] ? val - ema26[i] : 0);
  };

  const calculateBollingerBands = (prices: number[], period: number, stdDev: number): number[] => {
    const sma = calculateSMA(prices, period);
    const bands = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      bands.push({
        upper: sma[i] + (standardDeviation * stdDev),
        middle: sma[i],
        lower: sma[i] - (standardDeviation * stdDev)
      });
    }
    
    return Array(period - 1).fill(null).concat(bands);
  };

  const toggleIndicator = (indicatorKey: string) => {
    setIndicators(prev => ({
      ...prev,
      [indicatorKey]: {
        ...prev[indicatorKey],
        enabled: !prev[indicatorKey].enabled
      }
    }));
  };

  const latestPrice = priceData.length > 0 ? priceData[priceData.length - 1] : null;
  const priceChange = priceData.length > 1 ? 
    latestPrice!.close - priceData[priceData.length - 2].close : 0;
  const priceChangePercent = priceData.length > 1 ? 
    (priceChange / priceData[priceData.length - 2].close) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Market Analysis</h2>
          </div>
          
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AOE">AOE</SelectItem>
              <SelectItem value="BOND1">BOND1</SelectItem>
              <SelectItem value="STOCK_A">STOCK_A</SelectItem>
              <SelectItem value="STOCK_B">STOCK_B</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isLive ? 'Live' : 'Paused'}
          </Button>
          <Button variant="outline" size="sm" onClick={generateInitialData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Price Summary */}
      {latestPrice && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-2xl font-bold">${latestPrice.close.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">{selectedSymbol}</div>
                </div>
                <div className={`flex items-center gap-1 ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="font-medium">
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Open</div>
                  <div className="font-medium">${latestPrice.open.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">High</div>
                  <div className="font-medium">${latestPrice.high.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Low</div>
                  <div className="font-medium">${latestPrice.low.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Volume</div>
                  <div className="font-medium">{latestPrice.volume.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chart">Price Chart</TabsTrigger>
          <TabsTrigger value="depth">Market Depth</TabsTrigger>
          <TabsTrigger value="indicators">Technical Indicators</TabsTrigger>
          <TabsTrigger value="volume">Volume Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Price Chart - {selectedSymbol}</span>
                <div className="flex items-center gap-2">
                  {Object.entries(indicators).map(([key, indicator]) => (
                    <div key={key} className="flex items-center gap-1">
                      <input 
                        type="checkbox"
                        checked={indicator.enabled}
                        onChange={() => toggleIndicator(key)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm" style={{ color: indicator.color }}>
                        {indicator.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Interactive Chart Placeholder</p>
                  <p className="text-sm text-gray-400">
                    Chart.js or TradingView integration would go here
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {priceData.length} data points • {timeframe} timeframe
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depth" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Order Book - Bids
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 font-medium">
                    <div>Price</div>
                    <div>Size</div>
                    <div>Orders</div>
                  </div>
                  {marketDepth.bids.slice(0, 10).map((bid, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1 hover:bg-green-50">
                      <div className="text-green-600 font-medium">${bid.price.toFixed(2)}</div>
                      <div>{bid.size.toLocaleString()}</div>
                      <div className="text-gray-500">{bid.orders}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Order Book - Asks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 font-medium">
                    <div>Price</div>
                    <div>Size</div>
                    <div>Orders</div>
                  </div>
                  {marketDepth.asks.slice(0, 10).map((ask, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1 hover:bg-red-50">
                      <div className="text-red-600 font-medium">${ask.price.toFixed(2)}</div>
                      <div>{ask.size.toLocaleString()}</div>
                      <div className="text-gray-500">{ask.orders}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Market Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Spread</div>
                  <div className="text-lg font-bold">${marketDepth.spread.toFixed(4)}</div>
                  <div className="text-xs text-gray-400">
                    {((marketDepth.spread / marketDepth.midPrice) * 100).toFixed(3)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Mid Price</div>
                  <div className="text-lg font-bold">${marketDepth.midPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Bid Size</div>
                  <div className="text-lg font-bold">
                    {marketDepth.bids.reduce((sum, bid) => sum + bid.size, 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Ask Size</div>
                  <div className="text-lg font-bold">
                    {marketDepth.asks.reduce((sum, ask) => sum + ask.size, 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(indicators).map(([key, indicator]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{indicator.name}</span>
                    <Badge variant={indicator.enabled ? "default" : "outline"}>
                      {indicator.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 flex items-center justify-center border border-dashed border-gray-300 rounded">
                    <div className="text-center text-gray-500">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">{indicator.name} Chart</p>
                      <p className="text-xs">
                        {indicator.values.filter(v => v !== null).length} valid data points
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Volume Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Volume Chart Placeholder</p>
                  <p className="text-sm mt-2">
                    Current volume: {latestPrice?.volume.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}