/**
 * Instructor Panel - Session Control & Management
 * Privilege Code: 35
 */

'use client';

import { useState, useEffect } from 'react';

interface InstructorProps {
  user: any;
  sessionState: any;
  socket: any;
}

export default function InstructorPanel({ user, sessionState, socket }: InstructorProps) {
  const [selectedCommand, setSelectedCommand] = useState('');
  const [participants, setParticipants] = useState([]);
  const [marketStatus, setMarketStatus] = useState('CLOSED');
  const [lastCommandResult, setLastCommandResult] = useState<string>('');

  const availableCommands = [
    'OPEN_MARKET',
    'CLOSE_MARKET',
    'PAUSE_TRADING',
    'RESUME_TRADING',
    'SET_VOLATILITY',
    'TRIGGER_NEWS',
    'ADJUST_LIQUIDITY',
    'RESET_POSITIONS'
  ];

  useEffect(() => {
    if (socket) {
      socket.on('command_response', (data: { success: boolean; command: string }) => {
        if (data.success) {
          setLastCommandResult(`SUCCESS: ${data.command} executed`);
        }
      });

      socket.on('command_error', (data: { error: string }) => {
        setLastCommandResult(`ERROR: ${data.error}`);
      });

      socket.on('market_start_response', (data: { success: boolean; symbols: string[] }) => {
        if (data.success) {
          setMarketStatus('OPEN');
          setLastCommandResult(`SUCCESS: Market opened for ${data.symbols.join(', ')}`);
        }
      });

      socket.on('market_stop_response', (data: { success: boolean }) => {
        if (data.success) {
          setMarketStatus('CLOSED');
          setLastCommandResult('SUCCESS: Market closed');
        }
      });

      socket.on('market_opened', () => {
        setMarketStatus('OPEN');
      });

      socket.on('market_closed', () => {
        setMarketStatus('CLOSED');
      });

      return () => {
        socket.off('command_response');
        socket.off('command_error');
        socket.off('market_start_response');
        socket.off('market_stop_response');
        socket.off('market_opened');
        socket.off('market_closed');
      };
    }
  }, [socket]);

  const handleStartMarket = () => {
    if (socket) {
      socket.emit('start_market', { symbols: ['AOE', 'BOND1', 'BOND2'] });
      setLastCommandResult('Starting market...');
    }
  };

  const handleStopMarket = () => {
    if (socket) {
      socket.emit('stop_market');
      setLastCommandResult('Stopping market...');
    }
  };

  const handleExecuteCommand = () => {
    if (!selectedCommand || !socket) return;

    const command = {
      command: selectedCommand,
      parameters: [], // Would be populated based on command type
      timestamp: new Date().toISOString()
    };

    socket.emit('instructor_command', command);
    setSelectedCommand('');
  };

  const handleForceLogout = (userId: string) => {
    if (socket) {
      socket.emit('instructor_command', {
        command: 'Force Logout',
        parameters: [userId],
        timestamp: new Date().toISOString()
      });
    }
  };

  if (user?.role !== 'INSTRUCTOR' && user?.role !== 'ADMIN') {
    return (
      <div className="h-full p-3 text-xs flex items-center justify-center">
        <div className="text-red-400">INSTRUCTOR ACCESS REQUIRED</div>
      </div>
    );
  }

  return (
    <div className="h-full p-3 text-xs">
      <div className="text-orange-400 font-bold mb-3">INSTRUCTOR CONTROLS</div>
      
      {/* Session Status */}
      <div className="bg-gray-800 p-2 rounded mb-3">
        <div className="text-yellow-400 mb-1">SESSION STATUS</div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={sessionState?.status === 'IN_PROGRESS' ? 'text-green-400' : 'text-red-400'}>
              {sessionState?.status || 'NO SESSION'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Participants:</span>
            <span className="text-white">{participants.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Market:</span>
            <span className={marketStatus === 'OPEN' ? 'text-green-400' : 'text-red-400'}>
              {marketStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-3">
        <div className="text-yellow-400 mb-1">QUICK ACTIONS</div>
        <div className="grid grid-cols-2 gap-1">
          <button 
            onClick={handleStartMarket}
            disabled={marketStatus === 'OPEN'}
            className={`py-1 px-2 rounded text-xs ${
              marketStatus === 'OPEN' 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-700 hover:bg-green-600 text-white'
            }`}
          >
            OPEN MKT
          </button>
          <button 
            onClick={handleStopMarket}
            disabled={marketStatus === 'CLOSED'}
            className={`py-1 px-2 rounded text-xs ${
              marketStatus === 'CLOSED'
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-red-700 hover:bg-red-600 text-white'
            }`}
          >
            CLOSE MKT
          </button>
          <button 
            className="bg-yellow-700 hover:bg-yellow-600 text-white py-1 px-2 rounded text-xs"
          >
            PAUSE
          </button>
          <button 
            className="bg-blue-700 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs"
          >
            AUCTION
          </button>
        </div>
      </div>

      {/* Command Execution */}
      <div className="mb-3">
        <div className="text-yellow-400 mb-1">EXECUTE COMMAND</div>
        <select
          value={selectedCommand}
          onChange={(e) => setSelectedCommand(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white mb-2"
        >
          <option value="">Select Command...</option>
          {availableCommands.map(cmd => (
            <option key={cmd} value={cmd}>{cmd}</option>
          ))}
        </select>
        <button
          onClick={handleExecuteCommand}
          disabled={!selectedCommand}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-1 px-2 rounded text-xs disabled:bg-gray-700"
        >
          EXECUTE
        </button>
      </div>

      {/* Command Status */}
      {lastCommandResult && (
        <div className={`mb-3 p-2 rounded text-xs ${
          lastCommandResult.startsWith('SUCCESS') 
            ? 'bg-green-900 text-green-400' 
            : lastCommandResult.startsWith('ERROR')
              ? 'bg-red-900 text-red-400'
              : 'bg-blue-900 text-blue-400'
        }`}>
          {lastCommandResult}
        </div>
      )}

      {/* Participant Monitor */}
      <div className="flex-1">
        <div className="text-yellow-400 mb-1">PARTICIPANTS</div>
        <div className="text-gray-400 grid grid-cols-4 gap-1 text-xs mb-1">
          <span>USER</span>
          <span>EQUITY</span>
          <span>P&L</span>
          <span>ACTION</span>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {participants.map((participant) => (
            <div key={participant.id} className="grid grid-cols-4 gap-1 text-xs">
              <span className="text-white">{participant.username}</span>
              <span className="text-green-400">${participant.equity.toLocaleString()}</span>
              <span className={participant.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                {participant.pnl >= 0 ? '+' : ''}{participant.pnl}
              </span>
              <button
                onClick={() => handleForceLogout(participant.id)}
                className="bg-red-800 hover:bg-red-700 text-white px-1 rounded"
              >
                KICK
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}