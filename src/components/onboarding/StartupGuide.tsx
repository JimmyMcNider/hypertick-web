/**
 * Startup Guide Component
 * 
 * Comprehensive onboarding and quick-start guide for professors
 * new to the HyperTick platform
 */

'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Play, 
  Users, 
  Settings, 
  Award,
  CheckCircle,
  Circle,
  ArrowRight,
  Lightbulb,
  Target,
  Clock,
  BarChart3,
  Shield,
  Gavel,
  TrendingUp,
  AlertCircle,
  Download,
  Video,
  FileText,
  HelpCircle
} from 'lucide-react';

interface StartupGuideProps {
  onDemoLaunch: () => void;
  onCreateClass: () => void;
}

interface GuideStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  time: string;
  action?: () => void;
}

export default function StartupGuide({ onDemoLaunch, onCreateClass }: StartupGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const quickStartSteps: GuideStep[] = [
    {
      id: 'understand-platform',
      title: 'Understand the Platform',
      description: 'Learn about HyperTick\'s core features and educational approach',
      completed: completedSteps.has('understand-platform'),
      time: '5 min'
    },
    {
      id: 'run-demo',
      title: 'Run a Demo Session',
      description: 'Experience the platform with a pre-configured demonstration',
      completed: completedSteps.has('run-demo'),
      time: '10 min',
      action: onDemoLaunch
    },
    {
      id: 'setup-class',
      title: 'Set Up Your First Class',
      description: 'Create your class and configure initial settings',
      completed: completedSteps.has('setup-class'),
      time: '15 min',
      action: onCreateClass
    },
    {
      id: 'review-lessons',
      title: 'Review Available Lessons',
      description: 'Explore the curriculum and select appropriate lessons',
      completed: completedSteps.has('review-lessons'),
      time: '20 min'
    },
    {
      id: 'practice-session',
      title: 'Practice Session Management',
      description: 'Run through session controls and instructor tools',
      completed: completedSteps.has('practice-session'),
      time: '25 min'
    }
  ];

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const completionPercentage = (completedSteps.size / quickStartSteps.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Getting Started with HyperTick</h2>
      </div>

      {/* Progress Overview */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Quick Start Progress</span>
            <Badge variant="outline">{completedSteps.size}/{quickStartSteps.length} completed</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="h-2 mb-4" />
          <p className="text-sm text-gray-600">
            Complete these steps to get familiar with HyperTick and be ready for your first class.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="quickstart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
          <TabsTrigger value="features">Platform Overview</TabsTrigger>
          <TabsTrigger value="lessons">Lesson Library</TabsTrigger>
          <TabsTrigger value="tips">Teaching Tips</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="quickstart" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Getting Started Steps</h3>
              {quickStartSteps.map((step, index) => (
                <Card 
                  key={step.id} 
                  className={`cursor-pointer transition-all ${
                    step.completed ? 'border-green-200 bg-green-50' : 'hover:shadow-md'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {step.completed ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{step.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {step.time}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                        {step.action && !step.completed && (
                          <Button 
                            size="sm" 
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              step.action!();
                              markStepCompleted(step.id);
                            }}
                          >
                            Start
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step Details</h3>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {quickStartSteps[currentStep]?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentStep === 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        HyperTick transforms traditional finance education through interactive trading simulations.
                      </p>
                      <div className="space-y-2">
                        <h5 className="font-medium">Key Features:</h5>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Real-time trading simulations</li>
                          <li>• Privilege-based learning mechanics</li>
                          <li>• Advanced analytics and reporting</li>
                          <li>• XML-based lesson system</li>
                          <li>• Auction-based resource allocation</li>
                        </ul>
                      </div>
                      <Button 
                        onClick={() => markStepCompleted('understand-platform')}
                        variant="outline"
                        size="sm"
                      >
                        Mark as Understood
                      </Button>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Experience HyperTick with a pre-configured demo scenario featuring:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>• 5 AI students</div>
                        <div>• Live trading</div>
                        <div>• Privilege auctions</div>
                        <div>• Real-time analytics</div>
                        <div>• Market events</div>
                        <div>• Performance tracking</div>
                      </div>
                      <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertDescription>
                          The demo runs automatically but allows you to inject news, start auctions, and view analytics in real-time.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Set up your first class with these configuration options:
                      </p>
                      <div className="space-y-2">
                        <div className="p-2 bg-gray-50 rounded text-sm">
                          <strong>Class Settings:</strong> Name, semester, student capacity
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-sm">
                          <strong>Trading Rules:</strong> Starting cash, position limits, market hours
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-sm">
                          <strong>Lesson Selection:</strong> Choose from 15+ available lessons
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Explore our comprehensive lesson library covering:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="p-2 border rounded text-sm">
                          <strong>Market Microstructure:</strong> Price formation, market efficiency
                        </div>
                        <div className="p-2 border rounded text-sm">
                          <strong>Arbitrage Strategies:</strong> Merger, convertible, event arbitrage
                        </div>
                        <div className="p-2 border rounded text-sm">
                          <strong>Derivatives:</strong> Option pricing, futures, index options
                        </div>
                        <div className="p-2 border rounded text-sm">
                          <strong>Portfolio Theory:</strong> Asset allocation, risk management
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Practice using the instructor tools:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Settings className="h-4 w-4" />
                          Session management and controls
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Gavel className="h-4 w-4" />
                          Privilege auction management
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <BarChart3 className="h-4 w-4" />
                          Real-time analytics dashboard
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          News injection and market events
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Real-time Trading
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Students trade in realistic market conditions with live order books, price discovery, and market impact.
                </p>
                <div className="space-y-1 text-xs">
                  <div>• Live order matching engine</div>
                  <div>• Real-time P&L tracking</div>
                  <div>• Market and limit orders</div>
                  <div>• Position management</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Privilege System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Control student access to trading features through a comprehensive privilege system.
                </p>
                <div className="space-y-1 text-xs">
                  <div>• 15 different privileges</div>
                  <div>• Auction-based allocation</div>
                  <div>• Dynamic grant/revoke</div>
                  <div>• Role-based access</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Advanced Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Comprehensive performance tracking and strategy analysis for educational insights.
                </p>
                <div className="space-y-1 text-xs">
                  <div>• Student performance rankings</div>
                  <div>• Strategy comparison</div>
                  <div>• Risk metrics analysis</div>
                  <div>• Real-time dashboards</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-orange-600" />
                  Auction Mechanics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Teach auction theory and market mechanisms through privilege bidding systems.
                </p>
                <div className="space-y-1 text-xs">
                  <div>• English auction format</div>
                  <div>• Real-time bidding</div>
                  <div>• Winner determination</div>
                  <div>• Economic insights</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-red-600" />
                  Lesson Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Pre-built lessons covering essential finance topics with guided scenarios.
                </p>
                <div className="space-y-1 text-xs">
                  <div>• 15+ complete lessons</div>
                  <div>• XML-based configuration</div>
                  <div>• Multiple scenarios</div>
                  <div>• Customizable parameters</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Class Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Comprehensive tools for managing students, sessions, and educational outcomes.
                </p>
                <div className="space-y-1 text-xs">
                  <div>• Student enrollment</div>
                  <div>• Session scheduling</div>
                  <div>• Grade integration</div>
                  <div>• Progress tracking</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-blue-800">Market Microstructure</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 border rounded">
                      <strong>Price Formation</strong> - Learn how prices are discovered in markets
                    </div>
                    <div className="p-2 border rounded">
                      <strong>Market Efficiency</strong> - Test the efficient market hypothesis
                    </div>
                    <div className="p-2 border rounded">
                      <strong>Law of One Price</strong> - Arbitrage and price convergence
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-green-800">Arbitrage Strategies</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 border rounded">
                      <strong>Merger Arbitrage</strong> - Profit from M&A announcements
                    </div>
                    <div className="p-2 border rounded">
                      <strong>Event Arbitrage</strong> - Trade around corporate events
                    </div>
                    <div className="p-2 border rounded">
                      <strong>Convertible Arbitrage</strong> - Exploit convertible bond pricing
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-purple-800">Derivatives</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 border rounded">
                      <strong>Option Pricing</strong> - Black-Scholes and option strategies
                    </div>
                    <div className="p-2 border rounded">
                      <strong>Index Options</strong> - Portfolio hedging strategies
                    </div>
                    <div className="p-2 border rounded">
                      <strong>CDO Structures</strong> - Complex derivative instruments
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-orange-800">Portfolio Theory</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 border rounded">
                      <strong>Asset Allocation I</strong> - Basic portfolio construction
                    </div>
                    <div className="p-2 border rounded">
                      <strong>Asset Allocation II</strong> - Advanced optimization
                    </div>
                    <div className="p-2 border rounded">
                      <strong>Risky Debt</strong> - Credit risk and pricing
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Teaching Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded">
                  <h5 className="font-medium text-blue-800">Start Simple</h5>
                  <p className="text-sm text-blue-700">Begin with basic trading before introducing privileges and auctions.</p>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <h5 className="font-medium text-green-800">Use Real Examples</h5>
                  <p className="text-sm text-green-700">Connect trading scenarios to current market events and news.</p>
                </div>
                <div className="p-3 bg-purple-50 rounded">
                  <h5 className="font-medium text-purple-800">Encourage Discussion</h5>
                  <p className="text-sm text-purple-700">Pause sessions to discuss strategy differences and outcomes.</p>
                </div>
                <div className="p-3 bg-orange-50 rounded">
                  <h5 className="font-medium text-orange-800">Review Analytics</h5>
                  <p className="text-sm text-orange-700">Use the performance dashboard to highlight learning points.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session Timing Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h5 className="font-medium">Typical Session Structure:</h5>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Introduction & Setup</span>
                      <span className="text-gray-500">5 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Privilege Auctions</span>
                      <span className="text-gray-500">10 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trading Session</span>
                      <span className="text-gray-500">20-30 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Analysis & Discussion</span>
                      <span className="text-gray-500">10-15 minutes</span>
                    </div>
                  </div>
                </div>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Adjust timing based on class size and complexity of lesson objectives.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Video Tutorials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Play className="h-3 w-3 mr-2" />
                  Platform Overview (5 min)
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Play className="h-3 w-3 mr-2" />
                  Running Your First Session (10 min)
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Play className="h-3 w-3 mr-2" />
                  Advanced Analytics (8 min)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="h-3 w-3 mr-2" />
                  Instructor Manual (PDF)
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="h-3 w-3 mr-2" />
                  Lesson Guide (PDF)
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="h-3 w-3 mr-2" />
                  Technical Guide (PDF)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Users className="h-3 w-3 mr-2" />
                  Live Chat Support
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <BookOpen className="h-3 w-3 mr-2" />
                  Knowledge Base
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Award className="h-3 w-3 mr-2" />
                  Training Workshop
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}