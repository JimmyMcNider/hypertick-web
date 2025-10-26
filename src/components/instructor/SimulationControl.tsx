'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Square,
  Users,
  Clock,
  Settings,
  BarChart3,
  Activity,
  AlertCircle
} from 'lucide-react';

interface SimulationState {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  lesson: string;
  scenario: 'A' | 'B' | 'C';
  participants: number;
  currentRound: number;
  totalRounds: number;
  timeRemaining: number;
  marketOpen: boolean;
  tick: number;
}

interface InstructorSimulationControlProps {
  classId: string;
  userId: string;
}

export default function SimulationControl({ classId, userId }: InstructorSimulationControlProps) {
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [availableLessons] = useState([
    { id: 'price-formation', name: 'Price Formation', scenarios: ['A', 'B', 'C'] },
    { id: 'market-efficiency', name: 'Market Efficiency', scenarios: ['A', 'B'] },
    { id: 'law-of-one-price', name: 'Law of One Price', scenarios: ['A', 'B', 'C'] },
    { id: 'option-pricing', name: 'Option Pricing', scenarios: ['A', 'B'] },
    { id: 'merger-arbitrage', name: 'Merger Arbitrage', scenarios: ['A', 'B', 'C'] }
  ]);
  
  const [selectedLesson, setSelectedLesson] = useState('price-formation');
  const [selectedScenario, setSelectedScenario] = useState<'A' | 'B' | 'C'>('A');

  const startSimulation = async () => {
    try {
      const response = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          lessonId: selectedLesson,
          scenario: selectedScenario,
          instructorId: userId
        })
      });

      if (response.ok) {
        const newSimulation = await response.json();
        setSimulation(newSimulation);
      }
    } catch (error) {
      console.error('Failed to start simulation:', error);
    }
  };

  const pauseSimulation = async () => {
    if (!simulation) return;
    
    try {
      const response = await fetch(`/api/simulations/${simulation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' })
      });
      
      if (response.ok) {
        const updatedSim = await response.json();
        setSimulation(prev => prev ? { ...prev, status: updatedSim.status } : null);
      }
    } catch (error) {
      console.error('Failed to pause simulation:', error);
    }
  };

  const resumeSimulation = async () => {
    if (!simulation) return;
    
    try {
      const response = await fetch(`/api/simulations/${simulation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' })
      });
      
      if (response.ok) {
        const updatedSim = await response.json();
        setSimulation(prev => prev ? { ...prev, status: updatedSim.status } : null);
      }
    } catch (error) {
      console.error('Failed to resume simulation:', error);
    }
  };

  const stopSimulation = async () => {
    if (!simulation) return;
    
    try {
      const response = await fetch(`/api/simulations/${simulation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      if (response.ok) {
        setSimulation(null);
      }
    } catch (error) {
      console.error('Failed to stop simulation:', error);
    }
  };

  const toggleMarket = async () => {
    if (!simulation) return;
    
    try {
      const action = simulation.marketOpen ? 'close' : 'open';
      const response = await fetch(`/api/simulations/${simulation.id}/market`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const updatedSim = await response.json();
        setSimulation(prev => prev ? { ...prev, marketOpen: updatedSim.marketOpen, tick: updatedSim.tick } : null);
      }
    } catch (error) {
      console.error('Failed to toggle market:', error);
    }
  };

  const nextRound = async () => {
    if (!simulation) return;
    
    try {
      const response = await fetch(`/api/simulations/${simulation.id}/rounds`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const updatedSim = await response.json();
        setSimulation(prev => prev ? { 
          ...prev, 
          currentRound: updatedSim.currentRound,
          marketOpen: updatedSim.marketOpen,
          tick: updatedSim.tick
        } : null);
      }
    } catch (error) {
      console.error('Failed to advance round:', error);
    }
  };

  // Format time remaining as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Simulation Setup */}
      {!simulation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Start New Simulation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Lesson</label>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {availableLessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Scenario</label>
              <div className="flex gap-2">
                {['A', 'B', 'C'].map(scenario => (
                  <button
                    key={scenario}
                    onClick={() => setSelectedScenario(scenario as 'A' | 'B' | 'C')}
                    className={`px-4 py-2 rounded-md font-medium ${
                      selectedScenario === scenario
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Scenario {scenario}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={startSimulation} className="w-full">
              <Play className="w-4 h-4 mr-2" />
              Start Simulation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Simulation Controls */}
      {simulation && (
        <>
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {availableLessons.find(l => l.id === selectedLesson)?.name} - Scenario {selectedScenario}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  simulation.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  simulation.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {simulation.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{simulation.participants}</div>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" />
                    Students
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {simulation.currentRound}/{simulation.totalRounds}
                  </div>
                  <div className="text-sm text-gray-600">Rounds</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatTime(simulation.timeRemaining)}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4" />
                    Remaining
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${simulation.marketOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {simulation.marketOpen ? 'OPEN' : 'CLOSED'}
                  </div>
                  <div className="text-sm text-gray-600">Market</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Simulation Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {simulation.status === 'ACTIVE' ? (
                  <Button onClick={pauseSimulation} variant="outline">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={resumeSimulation} variant="outline">
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
                
                <Button onClick={stopSimulation} variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
                
                <Button 
                  onClick={toggleMarket}
                  variant={simulation.marketOpen ? "destructive" : "default"}
                >
                  {simulation.marketOpen ? 'Close Market' : 'Open Market'}
                </Button>
                
                <Button onClick={nextRound} variant="outline">
                  Next Round
                </Button>
                
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Live Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Market Tick #{simulation.tick}</span>
                  <span className="text-gray-600">Active trading session</span>
                </div>
                <div className="flex justify-between">
                  <span>Connected Students</span>
                  <span className="font-medium">{simulation.participants}/25</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Orders</span>
                  <span className="font-medium">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}