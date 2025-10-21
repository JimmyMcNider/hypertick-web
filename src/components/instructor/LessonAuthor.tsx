'use client';

import { useState, useRef } from 'react';
import { LessonDefinition, LessonCommand, LessonScenario } from '@/lib/lesson-loader';
import { PRIVILEGE_DEFINITIONS } from '@/lib/privilege-definitions';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

interface LessonAuthorProps {
  user: User | null;
  classId: string;
}

interface TimelineEvent {
  id: string;
  timestamp: number;
  command: LessonCommand;
  description: string;
}

const COMMAND_TYPES = [
  { value: 'GRANT_PRIVILEGE', label: 'Grant Privilege', description: 'Enable specific trading features for participants' },
  { value: 'REVOKE_PRIVILEGE', label: 'Revoke Privilege', description: 'Disable specific trading features' },
  { value: 'OPEN_MARKET', label: 'Open Market', description: 'Enable trading for specified securities' },
  { value: 'CLOSE_MARKET', label: 'Close Market', description: 'Disable trading for specified securities' },
  { value: 'SET_PRICE', label: 'Set Price', description: 'Update security prices during simulation' },
  { value: 'CREATE_AUCTION', label: 'Create Auction', description: 'Start an auction for market making rights' },
  { value: 'INJECT_NEWS', label: 'Inject News', description: 'Send news events to participants' },
  { value: 'SET_LIQUIDITY_TRADER', label: 'Set Liquidity Trader', description: 'Configure automated liquidity provision' },
  { value: 'PAUSE_SESSION', label: 'Pause Session', description: 'Temporarily halt the simulation' },
  { value: 'RESUME_SESSION', label: 'Resume Session', description: 'Continue the simulation' },
  { value: 'UPDATE_RISK_LIMITS', label: 'Update Risk Limits', description: 'Modify participant risk parameters' },
  { value: 'ENABLE_SHORTS', label: 'Enable Short Selling', description: 'Allow short position creation' },
  { value: 'DISABLE_SHORTS', label: 'Disable Short Selling', description: 'Prevent short position creation' }
];

const SECURITIES = [
  { symbol: 'AOE', name: 'AOE Corporation' },
  { symbol: 'BOND1', name: '1-Year Treasury Bond' },
  { symbol: 'BOND2', name: '2-Year Treasury Bond' },
  { symbol: 'BOND5', name: '5-Year Treasury Bond' },
  { symbol: 'BOND10', name: '10-Year Treasury Bond' },
  { symbol: 'EQUITY1', name: 'Large Cap Equity Index' },
  { symbol: 'EQUITY2', name: 'Small Cap Equity Index' },
  { symbol: 'COMMODITY1', name: 'Gold Futures' },
  { symbol: 'COMMODITY2', name: 'Oil Futures' },
  { symbol: 'FOREX1', name: 'EUR/USD' },
  { symbol: 'FOREX2', name: 'GBP/USD' }
];

export default function LessonAuthor({ user, classId }: LessonAuthorProps) {
  const [lesson, setLesson] = useState<LessonDefinition>({
    id: '',
    title: '',
    description: '',
    version: '1.0',
    author: `${user?.firstName} ${user?.lastName}` || 'Unknown',
    created: new Date().toISOString(),
    difficulty: 'BEGINNER' as const,
    estimatedDuration: 900,
    learningObjectives: [],
    prerequisites: [],
    defaultScenario: 'A',
    scenarios: {
      'A': {
        id: 'A',
        name: 'Scenario A',
        description: 'Primary simulation scenario',
        duration: 900,
        initialState: {
          marketOpen: true,
          initialPrices: { AOE: 50.00, BOND1: 100.00 },
          enabledSymbols: ['AOE', 'BOND1'],
          liquidityTraders: [],
          defaultPrivileges: []
        },
        commands: [],
        objectives: []
      }
    },
    metadata: {
      tags: ['basic', 'equity', 'market-making'],
      category: 'EQUITY_TRADING',
      subject: 'Market Making'
    }
  });

  const [selectedScenario, setSelectedScenario] = useState<string>('A');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<string | null>(null);
  const [newCommand, setNewCommand] = useState<Partial<LessonCommand>>({
    type: 'GRANT_PRIVILEGE',
    timestamp: 0,
    parameters: {},
    description: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string): number => {
    const [mins, secs] = timeStr.split(':').map(Number);
    return mins * 60 + secs;
  };

  const handleUpdateLesson = (updates: Partial<LessonDefinition>) => {
    setLesson(prev => ({ 
      ...prev, 
      ...updates, 
      lastModified: new Date() 
    }));
  };

  const handleUpdateScenario = (scenarioId: string, updates: Partial<LessonScenario>) => {
    setLesson(prev => ({
      ...prev,
      scenarios: {
        ...prev.scenarios,
        [scenarioId]: { ...prev.scenarios[scenarioId], ...updates }
      }
    }));
  };

  const handleAddCommand = () => {
    if (!newCommand.type || newCommand.timestamp === undefined) return;

    const command: LessonCommand = {
      id: `cmd_${Date.now()}`,
      type: newCommand.type as any,
      timestamp: newCommand.timestamp,
      parameters: newCommand.parameters || {},
      description: newCommand.description || '',
      conditions: newCommand.conditions
    };

    const timelineEvent: TimelineEvent = {
      id: command.id,
      timestamp: command.timestamp,
      command,
      description: command.description
    };

    const currentScenario = lesson.scenarios[selectedScenario];
    if (currentScenario) {
      const updatedCommands = [...currentScenario.commands, command].sort((a, b) => a.timestamp - b.timestamp);
      handleUpdateScenario(selectedScenario, { commands: updatedCommands });
      
      setTimeline(prev => [...prev, timelineEvent].sort((a, b) => a.timestamp - b.timestamp));
    }

    setNewCommand({ type: 'GRANT_PRIVILEGE', timestamp: 0, parameters: {}, description: '' });
    setShowCommandModal(false);
  };

  const handleRemoveCommand = (commandId: string) => {
    const currentScenario = lesson.scenarios[selectedScenario];
    if (currentScenario) {
      const updatedCommands = currentScenario.commands.filter(cmd => cmd.id !== commandId);
      handleUpdateScenario(selectedScenario, { commands: updatedCommands });
      setTimeline(prev => prev.filter(event => event.id !== commandId));
    }
  };

  const handleSaveLesson = async () => {
    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...lesson,
          classId,
          saveLesson: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('Lesson saved successfully!');
        console.log('Saved lesson:', result);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save lesson');
      }
    } catch (error) {
      alert('Error saving lesson: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleExportLesson = () => {
    const lessonXML = generateLessonXML(lesson);
    const blob = new Blob([lessonXML], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lesson.title.replace(/\s+/g, '_')}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportLesson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'application/xml');
      
      // Parse XML and convert to lesson format
      const importedLesson = await parseLessonXML(doc);
      setLesson(importedLesson);
      
      // Update timeline for first scenario
      const firstScenario = importedLesson.scenarios[0];
      if (firstScenario) {
        const events = firstScenario.commands.map(cmd => ({
          id: cmd.id,
          timestamp: cmd.timestamp,
          command: cmd,
          description: cmd.description
        }));
        setTimeline(events);
      }
      
    } catch (error) {
      alert('Error importing lesson: ' + error.message);
    }
  };

  const generateLessonXML = (lesson: LessonDefinition): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<lesson>
  <metadata>
    <title>${lesson.title}</title>
    <description>${lesson.description}</description>
    <author>${lesson.author}</author>
    <version>${lesson.version}</version>
    <duration>${lesson.estimatedDuration}</duration>
    <difficulty>${lesson.metadata.difficulty}</difficulty>
    <category>${lesson.metadata.category}</category>
  </metadata>
  <scenarios>
    ${lesson.scenarios.map(scenario => `
    <scenario id="${scenario.id}" name="${scenario.name}">
      <description>${scenario.description}</description>
      <securities>
        ${scenario.securities.map(symbol => `<security symbol="${symbol}" initialPrice="${scenario.initialPrices[symbol] || 50.00}"/>`).join('\n        ')}
      </securities>
      <commands>
        ${scenario.commands.map(cmd => `
        <command type="${cmd.type}" timestamp="${cmd.timestamp}">
          <description>${cmd.description}</description>
          <parameters>${JSON.stringify(cmd.parameters)}</parameters>
        </command>`).join('\n        ')}
      </commands>
    </scenario>`).join('\n    ')}
  </scenarios>
</lesson>`;
  };

  const parseLessonXML = async (doc: Document): Promise<LessonDefinition> => {
    // Implementation would parse the XML document and return a LessonDefinition
    // This is a simplified version
    const title = doc.querySelector('title')?.textContent || 'Imported Lesson';
    const description = doc.querySelector('description')?.textContent || '';
    
    return {
      id: `lesson_${Date.now()}`,
      title,
      description,
      version: '1.0',
      author: user?.firstName + ' ' + user?.lastName || 'Unknown',
      created: new Date(),
      lastModified: new Date(),
      estimatedDuration: 900,
      scenarios: [{
        id: 'A',
        name: 'Scenario A',
        description: 'Imported scenario',
        securities: ['AOE', 'BOND1'],
        initialPrices: { AOE: 50.00, BOND1: 100.00 },
        commands: []
      }],
      metadata: {
        difficulty: 'BEGINNER',
        category: 'EQUITY_TRADING',
        tags: [],
        learningObjectives: [],
        prerequisites: []
      }
    };
  };

  const currentScenario = lesson.scenarios.find(s => s.id === selectedScenario);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lesson Author</h2>
          <p className="text-gray-600">Create and edit trading simulation lessons</p>
        </div>
        <div className="flex space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml"
            onChange={handleImportLesson}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Import XML
          </button>
          <button
            onClick={handleExportLesson}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Export XML
          </button>
          <button
            onClick={handleSaveLesson}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Lesson
          </button>
        </div>
      </div>

      {/* Lesson Metadata */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lesson Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={lesson.title}
              onChange={(e) => handleUpdateLesson({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter lesson title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={Math.floor(lesson.estimatedDuration / 60)}
              onChange={(e) => handleUpdateLesson({ estimatedDuration: parseInt(e.target.value) * 60 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="180"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={lesson.description}
              onChange={(e) => handleUpdateLesson({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the lesson objectives and content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
            <select
              value={lesson.metadata.difficulty}
              onChange={(e) => handleUpdateLesson({ 
                metadata: { ...lesson.metadata, difficulty: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={lesson.metadata.category}
              onChange={(e) => handleUpdateLesson({ 
                metadata: { ...lesson.metadata, category: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EQUITY_TRADING">Equity Trading</option>
              <option value="FIXED_INCOME">Fixed Income</option>
              <option value="DERIVATIVES">Derivatives</option>
              <option value="PORTFOLIO_MANAGEMENT">Portfolio Management</option>
              <option value="RISK_MANAGEMENT">Risk Management</option>
              <option value="MARKET_MAKING">Market Making</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scenario Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scenario Configuration</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Securities</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SECURITIES.map(security => (
              <label key={security.symbol} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={currentScenario?.securities.includes(security.symbol) || false}
                  onChange={(e) => {
                    if (!currentScenario) return;
                    const securities = e.target.checked
                      ? [...currentScenario.securities, security.symbol]
                      : currentScenario.securities.filter(s => s !== security.symbol);
                    handleUpdateScenario(selectedScenario, { securities });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{security.symbol}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Initial Prices */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Initial Prices</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentScenario?.securities.map(symbol => (
              <div key={symbol}>
                <label className="block text-xs text-gray-500 mb-1">{symbol}</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentScenario.initialPrices[symbol] || 50.00}
                  onChange={(e) => {
                    const initialPrices = {
                      ...currentScenario.initialPrices,
                      [symbol]: parseFloat(e.target.value)
                    };
                    handleUpdateScenario(selectedScenario, { initialPrices });
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Lesson Timeline</h3>
          <button
            onClick={() => setShowCommandModal(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Command
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {timeline.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No commands added yet. Click &quot;Add Command&quot; to start building your lesson.
            </div>
          ) : (
            timeline.map((event, index) => (
              <div key={event.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium text-blue-600 w-16">
                  {formatTime(event.timestamp)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {COMMAND_TYPES.find(t => t.value === event.command.type)?.label}
                  </div>
                  <div className="text-xs text-gray-600">{event.description}</div>
                </div>
                <button
                  onClick={() => handleRemoveCommand(event.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Command Modal */}
      {showCommandModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Command</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="text"
                  value={formatTime(newCommand.timestamp || 0)}
                  onChange={(e) => setNewCommand(prev => ({ ...prev, timestamp: parseTime(e.target.value) }))}
                  placeholder="0:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Command Type</label>
                <select
                  value={newCommand.type}
                  onChange={(e) => setNewCommand(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COMMAND_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={newCommand.description || ''}
                  onChange={(e) => setNewCommand(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what this command does"
                />
              </div>

              {/* Command-specific parameters */}
              {newCommand.type === 'GRANT_PRIVILEGE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Privilege</label>
                  <select
                    value={newCommand.parameters?.privilegeCode || ''}
                    onChange={(e) => setNewCommand(prev => ({ 
                      ...prev, 
                      parameters: { ...prev.parameters, privilegeCode: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select privilege</option>
                    {PRIVILEGE_DEFINITIONS.map(priv => (
                      <option key={priv.code} value={priv.code}>{priv.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(newCommand.type === 'OPEN_MARKET' || newCommand.type === 'CLOSE_MARKET') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Securities</label>
                  <select
                    multiple
                    value={newCommand.parameters?.symbols || []}
                    onChange={(e) => {
                      const symbols = Array.from(e.target.selectedOptions).map(option => option.value);
                      setNewCommand(prev => ({ 
                        ...prev, 
                        parameters: { ...prev.parameters, symbols }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SECURITIES.map(security => (
                      <option key={security.symbol} value={security.symbol}>{security.symbol}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCommandModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCommand}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Command
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}