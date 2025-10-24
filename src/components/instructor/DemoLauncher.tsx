/**
 * Demo Launcher Component
 * 
 * Provides instructors with easy-to-use demo scenario launcher
 * for presentations and demonstrations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DEMO_SCENARIOS, DemoScenario, demoScenarioManager } from '@/lib/demo-scenarios';
import { sessionManager } from '@/lib/session-manager';
import { 
  Play, 
  Square, 
  Clock, 
  Users, 
  TrendingUp,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Calendar,
  Target,
  Settings,
  Monitor
} from 'lucide-react';

interface DemoLauncherProps {
  onScenarioStart: (sessionId: string) => void;
}

export default function DemoLauncher({ onScenarioStart }: DemoLauncherProps) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [scenarioProgress, setScenarioProgress] = useState({ currentTime: 0, totalDuration: 0 });
  const [upcomingActions, setUpcomingActions] = useState<any[]>([]);
  const [instructorNotes, setInstructorNotes] = useState<string[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        const progress = demoScenarioManager.getScenarioProgress();
        setScenarioProgress(progress);
        
        const notes = demoScenarioManager.getCurrentInstructorNotes();
        setInstructorNotes(notes);
        
        const actions = demoScenarioManager.getUpcomingManualActions();
        setUpcomingActions(actions);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const startScenario = async (scenarioId: string) => {
    try {
      setIsRunning(true);
      const sessionId = await demoScenarioManager.startScenario(scenarioId, sessionManager);
      setCurrentSessionId(sessionId);
      onScenarioStart(sessionId);
    } catch (error) {
      console.error('Failed to start scenario:', error);
      setIsRunning(false);
      alert('Failed to start scenario: ' + (error as Error).message);
    }
  };

  const stopScenario = () => {
    demoScenarioManager.stopScenario();
    setIsRunning(false);
    setCurrentSessionId(null);
    setScenarioProgress({ currentTime: 0, totalDuration: 0 });
    setUpcomingActions([]);
    setInstructorNotes([]);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScenarioDifficultyColor = (duration: number) => {
    if (duration <= 5) return 'bg-green-100 text-green-800';
    if (duration <= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getScenarioDifficultyText = (duration: number) => {
    if (duration <= 5) return 'Quick Demo';
    if (duration <= 10) return 'Standard Demo';
    return 'Comprehensive Demo';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Demo Launcher</h2>
        </div>
        {isRunning && (
          <Button onClick={stopScenario} variant="destructive" size="sm">
            <Square className="h-4 w-4 mr-2" />
            Stop Demo
          </Button>
        )}
      </div>

      {isRunning && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Play className="h-5 w-5" />
              Demo Running: {DEMO_SCENARIOS[selectedScenario!]?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {formatTime(scenarioProgress.currentTime)} / {formatTime(scenarioProgress.totalDuration)}
                </span>
              </div>
              <Progress 
                value={(scenarioProgress.currentTime / scenarioProgress.totalDuration) * 100} 
                className="h-2"
              />
            </div>

            {upcomingActions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">Upcoming Actions:</h4>
                {upcomingActions.map((action, index) => (
                  <Alert key={index} className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong>In {formatTime(action.time - scenarioProgress.currentTime)}:</strong>
                          <br />
                          {action.description}
                          {action.instructorAction && (
                            <div className="mt-1 text-sm">
                              <strong>Action:</strong> {action.instructorAction}
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {instructorNotes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Instructor Notes:
                </h4>
                <div className="space-y-1">
                  {instructorNotes.map((note, index) => (
                    <div key={index} className="text-sm text-blue-700 flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 mt-0.5 text-blue-600 flex-shrink-0" />
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isRunning && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Object.entries(DEMO_SCENARIOS).map(([id, scenario]) => (
            <Card 
              key={id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedScenario === id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setSelectedScenario(id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{scenario.name}</CardTitle>
                  <Badge className={getScenarioDifficultyColor(scenario.duration)}>
                    {getScenarioDifficultyText(scenario.duration)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{scenario.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{scenario.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>{scenario.participants.length} participants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    <span>{scenario.lessonId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span>{scenario.keyFeatures.length} features</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Key Features:</h5>
                  <div className="flex flex-wrap gap-1">
                    {scenario.keyFeatures.slice(0, 3).map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {scenario.keyFeatures.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{scenario.keyFeatures.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Participants:</h5>
                  <div className="space-y-1">
                    {scenario.participants.filter(p => p.role === 'STUDENT').slice(0, 3).map((participant, index) => (
                      <div key={index} className="text-xs text-gray-600 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        {participant.username} ({participant.strategy.toLowerCase()})
                      </div>
                    ))}
                    {scenario.participants.filter(p => p.role === 'STUDENT').length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{scenario.participants.filter(p => p.role === 'STUDENT').length - 3} more students
                      </div>
                    )}
                  </div>
                </div>

                {selectedScenario === id && (
                  <div className="pt-2 border-t">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        startScenario(id);
                      }}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Demo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedScenario && !isRunning && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Demo Setup: {DEMO_SCENARIOS[selectedScenario].name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium mb-2">Timeline Overview:</h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {DEMO_SCENARIOS[selectedScenario].timeline.map((event, index) => (
                      <div key={index} className="text-sm flex items-start gap-2">
                        <div className="flex-shrink-0 w-12 text-gray-500">
                          {formatTime(event.time)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{event.description}</div>
                          {event.instructorAction && (
                            <div className="text-xs text-gray-600 mt-1">
                              Action: {event.instructorAction}
                            </div>
                          )}
                        </div>
                        <Badge variant={event.automated ? "secondary" : "default"} className="text-xs">
                          {event.automated ? "Auto" : "Manual"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium mb-2">Market Conditions:</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volatility:</span>
                      <Badge variant="outline">
                        {DEMO_SCENARIOS[selectedScenario].marketConditions.volatility}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Liquidity:</span>
                      <Badge variant="outline">
                        {DEMO_SCENARIOS[selectedScenario].marketConditions.liquidity}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">News Events:</span>
                      <span className="font-medium">
                        {DEMO_SCENARIOS[selectedScenario].marketConditions.newsEvents.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price Shocks:</span>
                      <span className="font-medium">
                        {DEMO_SCENARIOS[selectedScenario].marketConditions.priceShocks.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Ready to start:</strong> This demo will create a new session with {DEMO_SCENARIOS[selectedScenario].participants.length} participants 
                  and run for approximately {DEMO_SCENARIOS[selectedScenario].duration} minutes. 
                  Some events require manual instructor actions during the demo.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}