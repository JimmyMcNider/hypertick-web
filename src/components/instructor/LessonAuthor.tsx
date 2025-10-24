'use client';

import { useState, useRef } from 'react';
import { LessonDefinition, LessonCommand, LessonSimulation } from '@/lib/lesson-loader';
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

export default function LessonAuthor({ user, classId }: LessonAuthorProps) {
  const [lesson, setLesson] = useState<LessonDefinition>({
    id: '',
    name: '',
    globalCommands: [],
    marketSettings: {
      startTick: 257,
      marketDelay: 8,
      loopOnClose: false,
      liquidateOnClose: true
    },
    adminPanels: ['Traders'],
    simulations: {
      'Simulation A': {
        id: 'Simulation A',
        duration: 900,
        startCommands: [],
        endCommands: [],
        reportTemplates: []
      }
    },
    wizardItems: {},
    initialWizardItem: 'Introduction',
    privileges: [],
    metadata: {
      estimatedDuration: 90,
      difficulty: 'INTERMEDIATE',
      objectives: ['Understand price formation mechanisms', 'Learn market making strategies']
    }
  });

  const [selectedSimulation, setSelectedSimulation] = useState<string>('Simulation A');

  const updateLesson = (updates: Partial<LessonDefinition>) => {
    setLesson(prev => ({ ...prev, ...updates }));
  };

  const updateSimulation = (simulationId: string, updates: Partial<LessonSimulation>) => {
    setLesson(prev => ({
      ...prev,
      simulations: {
        ...prev.simulations,
        [simulationId]: { ...prev.simulations[simulationId], ...updates }
      }
    }));
  };

  const addCommand = (simulationId: string, command: LessonCommand, isStart: boolean = true) => {
    updateSimulation(simulationId, {
      [isStart ? 'startCommands' : 'endCommands']: [
        ...(lesson.simulations[simulationId]?.[isStart ? 'startCommands' : 'endCommands'] || []),
        command
      ]
    });
  };

  const saveLesson = async () => {
    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lesson)
      });
      
      if (!response.ok) throw new Error('Failed to save lesson');
      
      alert('Lesson saved successfully!');
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Failed to save lesson');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Lesson Author</h2>
          <p className="text-sm text-gray-600">Create and edit lessons for your class</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lesson Name
              </label>
              <input
                type="text"
                value={lesson.name}
                onChange={(e) => updateLesson({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter lesson name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={lesson.metadata?.estimatedDuration || 90}
                onChange={(e) => updateLesson({ 
                  metadata: { 
                    ...lesson.metadata, 
                    estimatedDuration: parseInt(e.target.value) || 90 
                  } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>

          {/* Simulations */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Simulations</h3>
            <div className="space-y-4">
              {Object.entries(lesson.simulations).map(([id, simulation]) => (
                <div key={id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">{simulation.id}</h4>
                    <span className="text-sm text-gray-500">{simulation.duration}s</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Commands ({simulation.startCommands.length})
                      </label>
                      <div className="bg-gray-50 p-2 rounded text-xs">
                        {simulation.startCommands.length === 0 ? (
                          <span className="text-gray-400">No start commands</span>
                        ) : (
                          simulation.startCommands.map((cmd, idx) => (
                            <div key={idx} className="mb-1">
                              {cmd.type}: {cmd.description || 'No description'}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Commands ({simulation.endCommands.length})
                      </label>
                      <div className="bg-gray-50 p-2 rounded text-xs">
                        {simulation.endCommands.length === 0 ? (
                          <span className="text-gray-400">No end commands</span>
                        ) : (
                          simulation.endCommands.map((cmd, idx) => (
                            <div key={idx} className="mb-1">
                              {cmd.type}: {cmd.description || 'No description'}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={saveLesson}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Lesson
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}