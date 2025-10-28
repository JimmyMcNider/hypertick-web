/**
 * Instructor Onboarding - Welcome wizard for new instructors
 * 
 * Guides new instructors through the platform features and helps them
 * get started with their first trading simulation.
 */

'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { 
  AcademicCapIcon, 
  UsersIcon, 
  ChartBarIcon, 
  PlayIcon,
  BookOpenIcon,
  CogIcon
} from '@heroicons/react/24/solid';

interface OnboardingProps {
  user: any;
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function InstructorOnboarding({ user, onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to HyperTick',
      description: 'Your powerful trading simulation platform',
      icon: AcademicCapIcon,
      content: (
        <div className="text-center">
          <div className="mb-6">
            <AcademicCapIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {user?.firstName}!
            </h3>
            <p className="text-gray-600">
              HyperTick brings the excitement of real financial markets to your classroom. 
              Let's get you started with your first trading simulation.
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">What you can do:</h4>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Run live trading simulations with real market scenarios</li>
              <li>• Manage students and track their performance</li>
              <li>• Use 15+ proven financial education lessons</li>
              <li>• Monitor real-time trading activity and analytics</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'class-setup',
      title: 'Your Class is Ready',
      description: 'We\'ve created a default class with demo students',
      icon: UsersIcon,
      content: (
        <div>
          <div className="text-center mb-6">
            <UsersIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              "My Trading Class Fall 2024"
            </h3>
            <p className="text-gray-600">
              We've automatically created your first class with 5 demo students so you can 
              start exploring the platform immediately.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">✅ Class Created</h4>
              <p className="text-green-800 text-sm">
                Your default class is ready with proper permissions and settings
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">👥 Demo Students</h4>
              <p className="text-blue-800 text-sm">
                5 demo students are enrolled: Alice, Bob, Carol, David, and Emma
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> You can add real students later by importing from CSV, 
              entering manually, or integrating with your LMS.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'lessons',
      title: 'Choose Your Lesson',
      description: 'Browse 15+ financial education simulations',
      icon: BookOpenIcon,
      content: (
        <div>
          <div className="text-center mb-6">
            <BookOpenIcon className="h-16 w-16 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Proven Educational Content
            </h3>
            <p className="text-gray-600">
              Choose from battle-tested lessons used in finance programs worldwide.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <h4 className="font-semibold text-gray-900">🎯 Price Formation</h4>
              <p className="text-gray-600 text-sm">Learn how market prices are discovered through trading</p>
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">Beginner • 60 min</span>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <h4 className="font-semibold text-gray-900">⚖️ Law of One Price</h4>
              <p className="text-gray-600 text-sm">Explore arbitrage opportunities and market efficiency</p>
              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">Intermediate • 90 min</span>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <h4 className="font-semibold text-gray-900">📊 Portfolio Theory</h4>
              <p className="text-gray-600 text-sm">Advanced portfolio construction and risk management</p>
              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">Advanced • 120 min</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'live-session',
      title: 'Start Your First Session',
      description: 'Launch a live trading simulation',
      icon: PlayIcon,
      content: (
        <div>
          <div className="text-center mb-6">
            <PlayIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Ready to Go Live!
            </h3>
            <p className="text-gray-600">
              Starting a session is easy - just select a lesson and click start.
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">What happens when you start:</h4>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">1</span>
                Students see a "Join Session" banner on their dashboard
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">2</span>
                Real-time market data starts streaming to all participants
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">3</span>
                Students can place orders and see live P&L updates
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">4</span>
                You monitor progress and control the simulation flow
              </li>
            </ol>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-green-800 text-sm">
              💡 <strong>Pro Tip:</strong> Start with "Price Formation" for your first session. 
              It's perfect for demonstrating the platform capabilities.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: 'Key Features',
      description: 'Everything you need for effective financial education',
      icon: ChartBarIcon,
      content: (
        <div>
          <div className="text-center mb-6">
            <ChartBarIcon className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Powerful Tools at Your Fingertips
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <UsersIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Student Management</h4>
                  <p className="text-gray-600 text-sm">Add, remove, and organize students easily</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Real-time Analytics</h4>
                  <p className="text-gray-600 text-sm">Track performance and engagement live</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <BookOpenIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Lesson Library</h4>
                  <p className="text-gray-600 text-sm">Access proven educational scenarios</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <CogIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Session Control</h4>
                  <p className="text-gray-600 text-sm">Start, pause, resume, and manage sessions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Mark onboarding as completed
    localStorage.setItem('hypertick_onboarding_completed', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('hypertick_onboarding_completed', 'true');
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <currentStepData.icon className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{currentStepData.title}</h2>
              <p className="text-gray-600">{currentStepData.description}</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm text-gray-600">Step {currentStep + 1} of {steps.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              currentStep === 0 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Skip Tour
            </button>
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}