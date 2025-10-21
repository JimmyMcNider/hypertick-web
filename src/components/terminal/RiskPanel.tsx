/**
 * Risk Management Panel - Position Risk & Exposure
 * Privilege Code: 14
 */

'use client';

import { useState, useEffect } from 'react';

interface RiskProps {
  user: any;
  sessionState: any;
  socket: any;
}

interface RiskMetrics {
  totalEquity: number;
  usedMargin: number;
  availableMargin: number;
  marginUtilization: number;
  dayPnL: number;
  unrealizedPnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  var95: number; // Value at Risk 95%
  exposureBySymbol: SymbolExposure[];
  alertsTriggered: RiskAlert[];
}

interface SymbolExposure {
  symbol: string;
  notionalValue: number;
  percentOfPortfolio: number;
  deltaEquivalent: number;
  vega: number;
  theta: number;
}

interface RiskAlert {
  id: string;
  type: 'MARGIN' | 'CONCENTRATION' | 'VAR' | 'DRAWDOWN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export default function RiskPanel({ user, sessionState, socket }: RiskProps) {
  const [riskData, setRiskData] = useState<RiskMetrics>({
    totalEquity: 98750.00,
    usedMargin: 12500.00,
    availableMargin: 86250.00,
    marginUtilization: 12.66,
    dayPnL: -1250.00,
    unrealizedPnL: -875.00,
    maxDrawdown: 2150.00,
    sharpeRatio: 1.34,
    var95: 3200.00,
    exposureBySymbol: [
      { symbol: 'AOE', notionalValue: 25000, percentOfPortfolio: 25.3, deltaEquivalent: 24750, vega: 125, theta: -15 },
      { symbol: 'BOND1', notionalValue: 15000, percentOfPortfolio: 15.2, deltaEquivalent: 14800, vega: 45, theta: -8 },
      { symbol: 'BOND2', notionalValue: 10000, percentOfPortfolio: 10.1, deltaEquivalent: 9950, vega: 30, theta: -5 },
    ],
    alertsTriggered: [
      {
        id: 'ALT001',
        type: 'CONCENTRATION',
        severity: 'MEDIUM',
        message: 'AOE position exceeds 25% concentration limit',
        timestamp: '09:42:15',
        acknowledged: false
      },
      {
        id: 'ALT002',
        type: 'VAR',
        severity: 'LOW',
        message: 'Portfolio VaR approaching 3% limit',
        timestamp: '09:40:33',
        acknowledged: true
      }
    ]
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'exposure' | 'alerts'>('overview');

  useEffect(() => {
    if (socket) {
      socket.on('risk_update', (data: Partial<RiskMetrics>) => {
        setRiskData(prev => ({ ...prev, ...data }));
      });

      socket.on('risk_alert', (alert: RiskAlert) => {
        setRiskData(prev => ({
          ...prev,
          alertsTriggered: [alert, ...prev.alertsTriggered].slice(0, 20)
        }));
      });

      return () => {
        socket.off('risk_update');
        socket.off('risk_alert');
      };
    }
  }, [socket]);

  const acknowledgeAlert = (alertId: string) => {
    setRiskData(prev => ({
      ...prev,
      alertsTriggered: prev.alertsTriggered.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    }));

    if (socket) {
      socket.emit('acknowledge_risk_alert', { alertId });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-green-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'HIGH': return 'text-orange-400';
      case 'CRITICAL': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskColor = (value: number, threshold: number) => {
    if (value > threshold * 0.8) return 'text-red-400';
    if (value > threshold * 0.6) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="h-full p-3 text-xs bg-black text-white">
      <div className="text-orange-400 font-bold mb-3 border-b border-gray-700 pb-1">
        RISK MANAGEMENT
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-3 border-b border-gray-700">
        {['overview', 'exposure', 'alerts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab as any)}
            className={`px-2 py-1 text-xs capitalize ${
              selectedTab === tab ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-3">
          {/* Equity & Margin */}
          <div className="bg-gray-900 p-2 rounded">
            <div className="text-yellow-400 font-bold mb-2">ACCOUNT OVERVIEW</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Total Equity:</span>
                <div className="text-white font-bold">${riskData.totalEquity.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-400">Day P&L:</span>
                <div className={riskData.dayPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {riskData.dayPnL >= 0 ? '+' : ''}${riskData.dayPnL.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Used Margin:</span>
                <div className="text-yellow-400">${riskData.usedMargin.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-400">Available:</span>
                <div className="text-green-400">${riskData.availableMargin.toLocaleString()}</div>
              </div>
            </div>
            
            {/* Margin Utilization Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Margin Utilization</span>
                <span className={getRiskColor(riskData.marginUtilization, 80)}>
                  {riskData.marginUtilization.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full ${
                    riskData.marginUtilization > 80 ? 'bg-red-500' :
                    riskData.marginUtilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(riskData.marginUtilization, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="bg-gray-900 p-2 rounded">
            <div className="text-yellow-400 font-bold mb-2">RISK METRICS</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Max Drawdown:</span>
                <div className="text-red-400">${riskData.maxDrawdown.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-400">Sharpe Ratio:</span>
                <div className="text-white">{riskData.sharpeRatio.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-400">VaR (95%):</span>
                <div className="text-orange-400">${riskData.var95.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-400">Unrealized P&L:</span>
                <div className={riskData.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {riskData.unrealizedPnL >= 0 ? '+' : ''}${riskData.unrealizedPnL.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exposure Tab */}
      {selectedTab === 'exposure' && (
        <div className="space-y-2">
          <div className="text-yellow-400 font-bold mb-2">POSITION EXPOSURE</div>
          <div className="grid grid-cols-5 gap-1 text-gray-400 border-b border-gray-700 pb-1 text-xs">
            <span>SYMBOL</span>
            <span>NOTIONAL</span>
            <span>% PORT</span>
            <span>DELTA</span>
            <span>GREEKS</span>
          </div>
          {riskData.exposureBySymbol.map((exposure) => (
            <div key={exposure.symbol} className="grid grid-cols-5 gap-1 text-xs py-1 hover:bg-gray-800">
              <span className="text-yellow-400">{exposure.symbol}</span>
              <span className="text-white">${exposure.notionalValue.toLocaleString()}</span>
              <span className={getRiskColor(exposure.percentOfPortfolio, 30)}>
                {exposure.percentOfPortfolio.toFixed(1)}%
              </span>
              <span className="text-white">${exposure.deltaEquivalent.toLocaleString()}</span>
              <span className="text-gray-300">
                V:{exposure.vega} θ:{exposure.theta}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Alerts Tab */}
      {selectedTab === 'alerts' && (
        <div className="space-y-2">
          <div className="text-yellow-400 font-bold mb-2">RISK ALERTS</div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {riskData.alertsTriggered.map((alert) => (
              <div
                key={alert.id}
                className={`p-2 rounded border-l-2 ${
                  alert.acknowledged ? 'bg-gray-800 border-gray-600' : 'bg-gray-900 border-orange-500'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-bold ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="text-gray-400 text-xs">{alert.timestamp}</span>
                </div>
                <div className="text-white text-xs mb-1">{alert.message}</div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-400 text-xs">{alert.type}</span>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs"
                    >
                      ACK
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}