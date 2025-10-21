/**
 * Order Entry Panel - Market & Limit Order Entry
 * Privilege Code: 8
 */

'use client';

import { useState, useEffect } from 'react';

interface OrderEntryProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface OrderFormData {
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: string;
  price: string;
  timeInForce: 'DAY' | 'IOC' | 'GTC';
}

export default function OrderEntryPanel({ user, sessionState, socket }: OrderEntryProps) {
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    symbol: 'AOE',
    side: 'BUY',
    orderType: 'MARKET',
    quantity: '',
    price: '',
    timeInForce: 'DAY'
  });

  const [buyingPower, setBuyingPower] = useState(50000);
  const [lastOrderStatus, setLastOrderStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const symbols = ['AOE', 'BOND1', 'BOND2', 'BOND3', 'SPX'];

  const handleInputChange = (field: keyof OrderFormData, value: string) => {
    setOrderForm(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (socket) {
      socket.on('order_response', (data: { success: boolean; orderId?: string }) => {
        setIsSubmitting(false);
        if (data.success) {
          setLastOrderStatus(`SUCCESS: Order ${data.orderId} submitted`);
          // Clear form on successful submission
          setOrderForm(prev => ({
            ...prev,
            quantity: '',
            price: orderForm.orderType === 'MARKET' ? '' : prev.price
          }));
        }
      });

      socket.on('order_error', (data: { error: string }) => {
        setIsSubmitting(false);
        setLastOrderStatus(`ERROR: ${data.error}`);
      });

      socket.on('trade_execution', (data: {
        orderId: string;
        symbol: string;
        side: string;
        quantity: number;
        price: number;
        timestamp: string;
      }) => {
        setLastOrderStatus(`FILLED: ${data.side} ${data.quantity} ${data.symbol} @ $${data.price.toFixed(2)}`);
      });

      return () => {
        socket.off('order_response');
        socket.off('order_error');
        socket.off('trade_execution');
      };
    }
  }, [socket, orderForm.orderType]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderForm.quantity || parseInt(orderForm.quantity) <= 0) {
      setLastOrderStatus('ERROR: Invalid quantity');
      return;
    }

    if (orderForm.orderType !== 'MARKET' && (!orderForm.price || parseFloat(orderForm.price) <= 0)) {
      setLastOrderStatus('ERROR: Invalid price');
      return;
    }

    if (!socket || !socket.connected) {
      setLastOrderStatus('ERROR: Not connected to trading system');
      return;
    }

    setIsSubmitting(true);
    setLastOrderStatus('SUBMITTING ORDER...');

    const order = {
      symbol: orderForm.symbol,
      side: orderForm.side,
      type: orderForm.orderType,
      quantity: parseInt(orderForm.quantity),
      price: orderForm.orderType === 'MARKET' ? undefined : parseFloat(orderForm.price),
      timeInForce: orderForm.timeInForce
    };

    try {
      socket.emit('place_order', order);
    } catch (error) {
      setIsSubmitting(false);
      setLastOrderStatus('ERROR: Order submission failed');
    }
  };

  const getEstimatedValue = () => {
    const qty = parseInt(orderForm.quantity) || 0;
    const price = parseFloat(orderForm.price) || 50; // Default price estimate
    return qty * price;
  };

  return (
    <div className="h-full flex flex-col p-3 text-xs">
      {/* Header */}
      <div className="text-orange-400 font-bold mb-3">ORDER ENTRY TERMINAL</div>
      
      {/* Account Info */}
      <div className="bg-gray-800 p-2 rounded mb-3">
        <div className="flex justify-between mb-1">
          <span>ACCOUNT:</span>
          <span className="text-yellow-400">{user?.username?.toUpperCase()}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>BUYING POWER:</span>
          <span className="text-green-400">${buyingPower.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>MARKET STATUS:</span>
          <span className={sessionState?.marketState?.isOpen ? 'text-green-400' : 'text-red-400'}>
            {sessionState?.marketState?.isOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmitOrder} className="flex-1">
        {/* Symbol Selection */}
        <div className="mb-3">
          <label className="block text-gray-400 mb-1">SYMBOL</label>
          <select
            value={orderForm.symbol}
            onChange={(e) => handleInputChange('symbol', e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
          >
            {symbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>

        {/* Side Selection */}
        <div className="mb-3">
          <label className="block text-gray-400 mb-1">SIDE</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleInputChange('side', 'BUY')}
              className={`py-2 px-3 rounded font-bold ${
                orderForm.side === 'BUY' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => handleInputChange('side', 'SELL')}
              className={`py-2 px-3 rounded font-bold ${
                orderForm.side === 'SELL' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Order Type */}
        <div className="mb-3">
          <label className="block text-gray-400 mb-1">ORDER TYPE</label>
          <select
            value={orderForm.orderType}
            onChange={(e) => handleInputChange('orderType', e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
          >
            <option value="MARKET">MARKET</option>
            <option value="LIMIT">LIMIT</option>
            <option value="STOP">STOP</option>
          </select>
        </div>

        {/* Quantity */}
        <div className="mb-3">
          <label className="block text-gray-400 mb-1">QUANTITY</label>
          <input
            type="number"
            value={orderForm.quantity}
            onChange={(e) => handleInputChange('quantity', e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
            placeholder="0"
            min="1"
          />
        </div>

        {/* Price (for non-market orders) */}
        {orderForm.orderType !== 'MARKET' && (
          <div className="mb-3">
            <label className="block text-gray-400 mb-1">
              {orderForm.orderType === 'LIMIT' ? 'LIMIT PRICE' : 'STOP PRICE'}
            </label>
            <input
              type="number"
              step="0.01"
              value={orderForm.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Time in Force */}
        <div className="mb-3">
          <label className="block text-gray-400 mb-1">TIME IN FORCE</label>
          <select
            value={orderForm.timeInForce}
            onChange={(e) => handleInputChange('timeInForce', e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
          >
            <option value="DAY">DAY</option>
            <option value="IOC">IOC (Immediate or Cancel)</option>
            <option value="GTC">GTC (Good Till Cancel)</option>
          </select>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-800 p-2 rounded mb-3">
          <div className="text-gray-400 mb-1">ORDER PREVIEW:</div>
          <div className="text-white">
            {orderForm.side} {orderForm.quantity || '0'} {orderForm.symbol} @ {orderForm.orderType}
            {orderForm.orderType !== 'MARKET' && orderForm.price && ` $${orderForm.price}`}
          </div>
          {orderForm.quantity && orderForm.orderType !== 'MARKET' && orderForm.price && (
            <div className="text-yellow-400 text-xs mt-1">
              EST. VALUE: ${getEstimatedValue().toLocaleString()}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !sessionState?.marketState?.isOpen || !orderForm.quantity}
          className={`w-full py-3 rounded font-bold text-sm ${
            sessionState?.marketState?.isOpen && orderForm.quantity && !isSubmitting
              ? orderForm.side === 'BUY' 
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting 
            ? 'SUBMITTING...'
            : !sessionState?.marketState?.isOpen 
              ? 'MARKET CLOSED' 
              : `SUBMIT ${orderForm.side} ORDER`
          }
        </button>
      </form>

      {/* Status */}
      {lastOrderStatus && (
        <div className={`mt-2 p-2 rounded text-xs ${
          lastOrderStatus.startsWith('ERROR') 
            ? 'bg-red-900 text-red-400' 
            : 'bg-green-900 text-green-400'
        }`}>
          {lastOrderStatus}
        </div>
      )}
    </div>
  );
}