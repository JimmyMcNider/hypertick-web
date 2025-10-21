/**
 * Auction Panel - Market Making Rights Auction
 * Privilege Code: 33
 */

'use client';

import { useState, useEffect } from 'react';

interface AuctionProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface AuctionItem {
  id: string;
  symbol: string;
  duration: number; // seconds
  minimumBid: number;
  currentBid: number;
  highestBidder: string;
  timeRemaining: number;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  bids: AuctionBid[];
}

interface AuctionBid {
  bidder: string;
  amount: number;
  timestamp: string;
}

export default function AuctionPanel({ user, sessionState, socket }: AuctionProps) {
  const [auctions, setAuctions] = useState<AuctionItem[]>([
    {
      id: 'AUC001',
      symbol: 'AOE',
      duration: 120,
      minimumBid: 100.00,
      currentBid: 250.00,
      highestBidder: 'TRADER_03',
      timeRemaining: 45,
      status: 'ACTIVE',
      bids: [
        { bidder: 'TRADER_01', amount: 100.00, timestamp: '09:42:15' },
        { bidder: 'TRADER_02', amount: 175.00, timestamp: '09:42:48' },
        { bidder: 'TRADER_03', amount: 250.00, timestamp: '09:43:22' },
      ]
    },
    {
      id: 'AUC002',
      symbol: 'BOND1',
      duration: 180,
      minimumBid: 75.00,
      currentBid: 125.00,
      highestBidder: 'TRADER_05',
      timeRemaining: 152,
      status: 'ACTIVE',
      bids: [
        { bidder: 'TRADER_04', amount: 75.00, timestamp: '09:41:30' },
        { bidder: 'TRADER_05', amount: 125.00, timestamp: '09:42:05' },
      ]
    }
  ]);

  const [newBidAmount, setNewBidAmount] = useState('');
  const [selectedAuction, setSelectedAuction] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setAuctions(prev => prev.map(auction => {
        if (auction.status === 'ACTIVE' && auction.timeRemaining > 0) {
          const newTimeRemaining = auction.timeRemaining - 1;
          return {
            ...auction,
            timeRemaining: newTimeRemaining,
            status: newTimeRemaining <= 0 ? 'COMPLETED' : 'ACTIVE'
          };
        }
        return auction;
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('auction_update', (auctionData: AuctionItem) => {
        setAuctions(prev => prev.map(auction => 
          auction.id === auctionData.id ? auctionData : auction
        ));
      });

      socket.on('new_bid', (bidData: { auctionId: string; bid: AuctionBid }) => {
        setAuctions(prev => prev.map(auction => {
          if (auction.id === bidData.auctionId) {
            return {
              ...auction,
              currentBid: bidData.bid.amount,
              highestBidder: bidData.bid.bidder,
              bids: [...auction.bids, bidData.bid]
            };
          }
          return auction;
        }));
      });

      return () => {
        socket.off('auction_update');
        socket.off('new_bid');
      };
    }
  }, [socket]);

  const handlePlaceBid = () => {
    if (!selectedAuction || !newBidAmount) return;
    
    const auction = auctions.find(a => a.id === selectedAuction);
    const bidAmount = parseFloat(newBidAmount);
    
    if (!auction || bidAmount <= auction.currentBid) {
      alert('Bid must be higher than current bid');
      return;
    }

    if (socket) {
      socket.emit('place_auction_bid', {
        auctionId: selectedAuction,
        amount: bidAmount,
        bidder: user?.username || 'UNKNOWN'
      });
    }

    setNewBidAmount('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-400';
      case 'PENDING': return 'text-yellow-400';
      case 'COMPLETED': return 'text-gray-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="h-full p-3 text-xs bg-black text-white">
      <div className="text-orange-400 font-bold mb-3 border-b border-gray-700 pb-1">
        MARKET MAKING AUCTIONS
      </div>
      
      {/* Active Auctions */}
      <div className="mb-4">
        <div className="text-yellow-400 font-bold mb-2">ACTIVE AUCTIONS</div>
        <div className="space-y-2">
          {auctions.filter(a => a.status === 'ACTIVE').map((auction) => (
            <div key={auction.id} className="bg-gray-900 p-2 rounded">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-yellow-400 font-bold">{auction.symbol}</span>
                  <span className="ml-2 text-gray-400">#{auction.id}</span>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${getStatusColor(auction.status)}`}>
                    {auction.status}
                  </div>
                  <div className="text-red-400">
                    {formatTime(auction.timeRemaining)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div>
                  <span className="text-gray-400">Min Bid:</span>
                  <div className="text-white">${auction.minimumBid.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Current:</span>
                  <div className="text-green-400 font-bold">${auction.currentBid.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Leader:</span>
                  <div className="text-blue-400">{auction.highestBidder}</div>
                </div>
              </div>

              <div className="text-gray-400 text-xs">
                Bids: {auction.bids.length} | Rights: Market Making for {auction.symbol}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bid Placement */}
      <div className="mb-4">
        <div className="text-yellow-400 font-bold mb-2">PLACE BID</div>
        <div className="space-y-2">
          <select
            value={selectedAuction}
            onChange={(e) => setSelectedAuction(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
          >
            <option value="">Select Auction...</option>
            {auctions.filter(a => a.status === 'ACTIVE').map(auction => (
              <option key={auction.id} value={auction.id}>
                {auction.symbol} - Current: ${auction.currentBid.toFixed(2)}
              </option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <input
              type="number"
              value={newBidAmount}
              onChange={(e) => setNewBidAmount(e.target.value)}
              placeholder="Bid Amount"
              step="0.01"
              min="0"
              className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
            />
            <button
              onClick={handlePlaceBid}
              disabled={!selectedAuction || !newBidAmount}
              className="bg-green-700 hover:bg-green-600 text-white py-1 px-3 rounded text-xs disabled:bg-gray-700"
            >
              BID
            </button>
          </div>
        </div>
      </div>

      {/* Bid History */}
      <div className="flex-1">
        <div className="text-yellow-400 font-bold mb-2">BID HISTORY</div>
        <div className="max-h-32 overflow-y-auto">
          {selectedAuction && auctions.find(a => a.id === selectedAuction)?.bids.map((bid, index) => (
            <div key={index} className="flex justify-between items-center py-1 border-b border-gray-800">
              <span className="text-blue-400">{bid.bidder}</span>
              <span className="text-white">${bid.amount.toFixed(2)}</span>
              <span className="text-gray-400">{bid.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Auction Status */}
      <div className="mt-3 pt-2 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Active Auctions:</span>
            <span className="ml-1 text-green-400">{auctions.filter(a => a.status === 'ACTIVE').length}</span>
          </div>
          <div>
            <span className="text-gray-400">Your Rights:</span>
            <span className="ml-1 text-yellow-400">AOE, BOND2</span>
          </div>
        </div>
      </div>
    </div>
  );
}