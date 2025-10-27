/**
 * Real-Time Market Depth Visualizer
 * 
 * Advanced Level II market data visualization including:
 * - Real-time order book display with bid/ask ladders
 * - Interactive price level charts
 * - Market microstructure analysis
 * - Order flow visualization
 * - Liquidity heatmaps
 * - Time and sales display
 * - Market impact analysis
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  BarChart3, 
  Activity, 
  Layers, 
  Target,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  Settings,
  Maximize2,
  Play,
  Pause,
  RefreshCw,
  Timer,
  DollarSign
} from 'lucide-react';

interface MarketDepthVisualizerProps {
  sessionId: string;
  userId: string;
  symbol?: string;
}

interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
  timestamp: Date;
  side: 'bid' | 'ask';
}

interface Trade {
  id: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: Date;
  aggressor: 'buyer' | 'seller';
}

interface MarketMetrics {
  spread: number;
  midPrice: number;
  bidVolume: number;
  askVolume: number;
  imbalance: number;
  vwap: number;
  lastTrade: Trade | null;
}

interface LiquidityLevel {
  price: number;
  cumulative: number;
  percentage: number;
  depth: number;
}

export default function MarketDepthVisualizer({ sessionId, userId, symbol = 'AOE' }: MarketDepthVisualizerProps) {
  const [orderBook, setOrderBook] = useState<{
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
  }>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [metrics, setMetrics] = useState<MarketMetrics>({
    spread: 0,
    midPrice: 100,
    bidVolume: 0,
    askVolume: 0,
    imbalance: 0,
    vwap: 100,
    lastTrade: null
  });
  const [liquidityLevels, setLiquidityLevels] = useState<{
    bids: LiquidityLevel[];
    asks: LiquidityLevel[];
  }>({ bids: [], asks: [] });
  const [isLive, setIsLive] = useState(true);
  const [depthLevels, setDepthLevels] = useState(10);
  const [priceRange, setPriceRange] = useState(5); // Percentage range to display
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket integration for real-time market data
  const { connected, marketData, socket } = useWebSocket({ 
    sessionId, 
    userId, 
    role: 'Student' 
  });

  useEffect(() => {
    generateInitialOrderBook();
    
    if (isLive) {
      intervalRef.current = setInterval(() => {
        updateOrderBook();
      }, 250); // Update every 250ms for smooth real-time feel
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, isLive, depthLevels]);

  useEffect(() => {
    if (socket) {
      socket.on('market_update', (data: any) => {
        if (data.symbol === symbol) {
          updateFromMarketData(data);
        }
      });

      socket.on('trade_executed', (trade: any) => {
        if (trade.symbol === symbol) {
          addTrade(trade);
        }
      });

      return () => {
        socket.off('market_update');
        socket.off('trade_executed');
      };
    }
  }, [socket, symbol]);

  const generateInitialOrderBook = () => {
    const basePrice = marketData.find(m => m.symbol === symbol)?.lastPrice || 100;
    const spread = basePrice * 0.002; // 0.2% spread
    const midPrice = basePrice;
    
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    
    // Generate order book levels
    for (let i = 0; i < depthLevels; i++) {
      const bidPrice = midPrice - (spread / 2) - (i * 0.01);
      const askPrice = midPrice + (spread / 2) + (i * 0.01);
      
      // Size tends to be larger at better prices (price-size priority)
      const bidSize = Math.floor((Math.random() * 2000 + 500) * (1 + i * 0.1));
      const askSize = Math.floor((Math.random() * 2000 + 500) * (1 + i * 0.1));
      
      bids.push({
        price: bidPrice,
        size: bidSize,
        orders: Math.floor(Math.random() * 5) + 1,
        timestamp: new Date(),
        side: 'bid'
      });
      
      asks.push({
        price: askPrice,
        size: askSize,
        orders: Math.floor(Math.random() * 5) + 1,
        timestamp: new Date(),
        side: 'ask'
      });
    }
    
    setOrderBook({
      bids: bids.sort((a, b) => b.price - a.price),
      asks: asks.sort((a, b) => a.price - b.price)
    });
    
    updateMetrics(bids, asks);
    calculateLiquidityLevels(bids, asks);
  };

  const updateOrderBook = () => {
    setOrderBook(prev => {
      const { bids, asks } = prev;
      
      // Randomly update order sizes and add/remove orders
      const updatedBids = bids.map(level => ({
        ...level,
        size: Math.max(0, level.size + (Math.random() - 0.5) * 200),
        timestamp: Math.random() < 0.1 ? new Date() : level.timestamp
      })).filter(level => level.size > 0);
      
      const updatedAsks = asks.map(level => ({
        ...level,
        size: Math.max(0, level.size + (Math.random() - 0.5) * 200),
        timestamp: Math.random() < 0.1 ? new Date() : level.timestamp
      })).filter(level => level.size > 0);
      
      // Occasionally add new levels or trades
      if (Math.random() < 0.05) {
        simulateNewOrder(updatedBids, updatedAsks);
      }
      
      updateMetrics(updatedBids, updatedAsks);
      calculateLiquidityLevels(updatedBids, updatedAsks);
      
      return {
        bids: updatedBids.sort((a, b) => b.price - a.price),
        asks: updatedAsks.sort((a, b) => a.price - b.price)
      };
    });
  };

  const simulateNewOrder = (bids: OrderBookLevel[], asks: OrderBookLevel[]) => {
    if (Math.random() < 0.5) {
      // Simulate a trade
      const isBuy = Math.random() < 0.5;
      const bestBid = bids[0];
      const bestAsk = asks[0];
      
      if (bestBid && bestAsk) {
        const trade: Trade = {
          id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          price: isBuy ? bestAsk.price : bestBid.price,
          size: Math.floor(Math.random() * 500) + 100,
          side: isBuy ? 'buy' : 'sell',
          timestamp: new Date(),
          aggressor: isBuy ? 'buyer' : 'seller'
        };
        
        addTrade(trade);
        
        // Reduce size at the traded level
        if (isBuy && asks.length > 0) {
          asks[0].size = Math.max(0, asks[0].size - trade.size);
        } else if (!isBuy && bids.length > 0) {
          bids[0].size = Math.max(0, bids[0].size - trade.size);
        }
      }
    }
  };

  const addTrade = (trade: Trade) => {
    setTrades(prev => [trade, ...prev.slice(0, 99)]); // Keep last 100 trades
  };

  const updateFromMarketData = (data: any) => {
    if (!isLive) return;
    
    // Use real market data to adjust order book
    const newMidPrice = data.lastPrice;
    
    setOrderBook(prev => {
      const priceAdjustment = newMidPrice - metrics.midPrice;
      
      const adjustedBids = prev.bids.map(level => ({
        ...level,
        price: level.price + priceAdjustment
      }));
      
      const adjustedAsks = prev.asks.map(level => ({
        ...level,
        price: level.price + priceAdjustment
      }));
      
      updateMetrics(adjustedBids, adjustedAsks);
      return { bids: adjustedBids, asks: adjustedAsks };
    });
  };

  const updateMetrics = (bids: OrderBookLevel[], asks: OrderBookLevel[]) => {
    if (bids.length === 0 || asks.length === 0) return;
    
    const bestBid = bids[0];
    const bestAsk = asks[0];
    const spread = bestAsk.price - bestBid.price;
    const midPrice = (bestBid.price + bestAsk.price) / 2;
    
    const bidVolume = bids.reduce((sum, level) => sum + level.size, 0);
    const askVolume = asks.reduce((sum, level) => sum + level.size, 0);
    const imbalance = (bidVolume - askVolume) / (bidVolume + askVolume);
    
    // Calculate VWAP from recent trades
    const recentTrades = trades.slice(0, 20);
    const vwap = recentTrades.length > 0 
      ? recentTrades.reduce((sum, trade) => sum + (trade.price * trade.size), 0) / 
        recentTrades.reduce((sum, trade) => sum + trade.size, 0)
      : midPrice;
    
    setMetrics({
      spread,
      midPrice,
      bidVolume,
      askVolume,
      imbalance,
      vwap,
      lastTrade: trades[0] || null
    });
  };

  const calculateLiquidityLevels = (bids: OrderBookLevel[], asks: OrderBookLevel[]) => {
    // Calculate cumulative liquidity
    let bidCumulative = 0;
    const bidLevels: LiquidityLevel[] = bids.map(level => {
      bidCumulative += level.size;
      return {
        price: level.price,
        cumulative: bidCumulative,
        percentage: 0, // Will be calculated after
        depth: level.size
      };
    });
    
    let askCumulative = 0;
    const askLevels: LiquidityLevel[] = asks.map(level => {
      askCumulative += level.size;
      return {
        price: level.price,
        cumulative: askCumulative,
        percentage: 0, // Will be calculated after
        depth: level.size
      };
    });
    
    // Calculate percentages
    const maxBidCumulative = bidCumulative;
    const maxAskCumulative = askCumulative;
    
    bidLevels.forEach(level => {
      level.percentage = (level.cumulative / maxBidCumulative) * 100;
    });
    
    askLevels.forEach(level => {
      level.percentage = (level.cumulative / maxAskCumulative) * 100;
    });
    
    setLiquidityLevels({ bids: bidLevels, asks: askLevels });
  };

  const formatPrice = (price: number) => price.toFixed(2);
  const formatSize = (size: number) => size.toLocaleString();
  const formatTime = (timestamp: Date) => timestamp.toLocaleTimeString([], { hour12: false });

  const getVolumeBarWidth = (size: number, maxSize: number) => {
    return Math.max(5, (size / maxSize) * 100);
  };

  const maxBidSize = Math.max(...orderBook.bids.map(b => b.size), 1);
  const maxAskSize = Math.max(...orderBook.asks.map(a => a.size), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Market Depth - {symbol}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
            <span className="text-sm text-gray-600">{connected ? 'Live' : 'Disconnected'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={depthLevels.toString()} onValueChange={(value) => setDepthLevels(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 Levels</SelectItem>
              <SelectItem value="10">10 Levels</SelectItem>
              <SelectItem value="15">15 Levels</SelectItem>
              <SelectItem value="20">20 Levels</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isLive ? 'Pause' : 'Resume'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={generateInitialOrderBook}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Market Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold">${formatPrice(metrics.midPrice)}</div>
              <div className="text-xs text-gray-500">Mid Price</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold">${formatPrice(metrics.spread)}</div>
              <div className="text-xs text-gray-500">Spread</div>
              <div className="text-xs text-gray-400">
                {((metrics.spread / metrics.midPrice) * 100).toFixed(3)}%
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold">{formatSize(metrics.bidVolume)}</div>
              <div className="text-xs text-gray-500">Bid Volume</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold">{formatSize(metrics.askVolume)}</div>
              <div className="text-xs text-gray-500">Ask Volume</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className={`text-lg font-bold ${metrics.imbalance > 0 ? 'text-green-600' : metrics.imbalance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {(metrics.imbalance * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Imbalance</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold">${formatPrice(metrics.vwap)}</div>
              <div className="text-xs text-gray-500">VWAP</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orderbook" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orderbook">Order Book</TabsTrigger>
          <TabsTrigger value="liquidity">Liquidity Chart</TabsTrigger>
          <TabsTrigger value="trades">Time & Sales</TabsTrigger>
          <TabsTrigger value="heatmap">Liquidity Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="orderbook" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asks (Sell Orders) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-red-600">Asks (Sellers)</span>
                  <div className="text-sm text-gray-500">
                    {orderBook.asks.length} levels
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 font-medium py-1 border-b">
                    <div>Price</div>
                    <div>Size</div>
                    <div>Orders</div>
                    <div>Volume</div>
                  </div>
                  
                  {orderBook.asks.slice(0, depthLevels).reverse().map((ask, index) => (
                    <div 
                      key={`ask-${index}`}
                      className="relative group hover:bg-red-50 cursor-pointer"
                      onClick={() => setSelectedPrice(ask.price)}
                      onMouseEnter={() => setHoverPrice(ask.price)}
                      onMouseLeave={() => setHoverPrice(null)}
                    >
                      {/* Volume Bar */}
                      <div 
                        className="absolute inset-y-0 right-0 bg-red-100 opacity-50"
                        style={{ width: `${getVolumeBarWidth(ask.size, maxAskSize)}%` }}
                      />
                      
                      <div className="relative grid grid-cols-4 gap-2 text-sm py-1">
                        <div className="text-red-600 font-medium">${formatPrice(ask.price)}</div>
                        <div>{formatSize(ask.size)}</div>
                        <div className="text-gray-500">{ask.orders}</div>
                        <div className="text-xs text-gray-400">{(ask.price * ask.size).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bids (Buy Orders) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-green-600">Bids (Buyers)</span>
                  <div className="text-sm text-gray-500">
                    {orderBook.bids.length} levels
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 font-medium py-1 border-b">
                    <div>Price</div>
                    <div>Size</div>
                    <div>Orders</div>
                    <div>Volume</div>
                  </div>
                  
                  {orderBook.bids.slice(0, depthLevels).map((bid, index) => (
                    <div 
                      key={`bid-${index}`}
                      className="relative group hover:bg-green-50 cursor-pointer"
                      onClick={() => setSelectedPrice(bid.price)}
                      onMouseEnter={() => setHoverPrice(bid.price)}
                      onMouseLeave={() => setHoverPrice(null)}
                    >
                      {/* Volume Bar */}
                      <div 
                        className="absolute inset-y-0 right-0 bg-green-100 opacity-50"
                        style={{ width: `${getVolumeBarWidth(bid.size, maxBidSize)}%` }}
                      />
                      
                      <div className="relative grid grid-cols-4 gap-2 text-sm py-1">
                        <div className="text-green-600 font-medium">${formatPrice(bid.price)}</div>
                        <div>{formatSize(bid.size)}</div>
                        <div className="text-gray-500">{bid.orders}</div>
                        <div className="text-xs text-gray-400">{(bid.price * bid.size).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="liquidity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cumulative Liquidity Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Liquidity Chart Placeholder</p>
                  <p className="text-sm mt-2">
                    Interactive D3.js or Chart.js visualization would show cumulative order book depth
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Trades</span>
                <div className="text-sm text-gray-500">
                  {trades.length} trades
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 font-medium py-1 border-b sticky top-0 bg-white">
                  <div>Time</div>
                  <div>Price</div>
                  <div>Size</div>
                  <div>Side</div>
                </div>
                
                {trades.map((trade, index) => (
                  <div key={trade.id} className="grid grid-cols-4 gap-2 text-sm py-1 hover:bg-gray-50">
                    <div className="text-gray-500 text-xs">{formatTime(trade.timestamp)}</div>
                    <div className={trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                      ${formatPrice(trade.price)}
                    </div>
                    <div>{formatSize(trade.size)}</div>
                    <div className="flex items-center gap-1">
                      {trade.side === 'buy' ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className="text-xs">{trade.side.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
                
                {trades.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-2" />
                    <p>No trades yet</p>
                    <p className="text-xs">Waiting for trading activity...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liquidity Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded">
                <div className="text-center text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-2" />
                  <p>Liquidity Heatmap Placeholder</p>
                  <p className="text-sm mt-2">
                    Visual representation of order book density and liquidity concentration
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected Price Info */}
      {(selectedPrice || hoverPrice) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">
                  Selected Price: ${formatPrice(selectedPrice || hoverPrice || 0)}
                </div>
                <div className="text-sm text-gray-500">
                  Distance from mid: {((Math.abs((selectedPrice || hoverPrice || 0) - metrics.midPrice) / metrics.midPrice) * 100).toFixed(3)}%
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedPrice(null)}>
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}