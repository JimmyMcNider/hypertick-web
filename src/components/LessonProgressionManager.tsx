/**
 * Lesson Progression Manager
 * 
 * Visual interface for instructors to manage student progression through
 * the lesson sequence, monitor prerequisites, and provide adaptive recommendations.
 */

'use client';

import { useState, useEffect } from 'react';
import { LESSON_SEQUENCES, type StudentProgress, type LessonSequence } from '@/lib/lesson-progression';

interface ProgressionPath {
  lesson: LessonSequence;
  status: 'completed' | 'current' | 'available' | 'locked';
  progress: StudentProgress | null;
}

interface LessonProgressionManagerProps {
  studentId: string;
  sessionId: string;
  onProgressUpdate?: (studentId: string, lessonId: string) => void;
}

export default function LessonProgressionManager({ 
  studentId, 
  sessionId, 
  onProgressUpdate 
}: LessonProgressionManagerProps) {
  const [progressPath, setProgressPath] = useState<ProgressionPath[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProgressionData();
    const interval = setInterval(loadProgressionData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [studentId]);

  const loadProgressionData = async () => {
    try {
      setIsLoading(true);
      
      // Load progression path
      const progressResponse = await fetch(`/api/instructor/progression?studentId=${studentId}&action=progress`);
      if (progressResponse.ok) {
        const data = await progressResponse.json();
        setProgressPath(data.path.path);
        setCompletionPercentage(data.path.completionPercentage);
      }

      // Load recommendations
      const recommendationsResponse = await fetch(`/api/instructor/progression?studentId=${studentId}&action=recommendations`);
      if (recommendationsResponse.ok) {
        const recData = await recommendationsResponse.json();
        setRecommendations(recData);
      }

    } catch (error) {
      console.error('Failed to load progression data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLessonAction = async (action: string, lessonId: string, data?: any) => {
    try {
      const response = await fetch('/api/instructor/progression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          studentId,
          lessonId,
          progressData: data
        })
      });

      if (response.ok) {
        console.log(`${action} completed for lesson ${lessonId}`);
        loadProgressionData(); // Refresh data
        onProgressUpdate?.(studentId, lessonId);
      }
    } catch (error) {
      console.error(`Failed to execute ${action}:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'current': return 'bg-blue-500';
      case 'available': return 'bg-yellow-500';
      case 'locked': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'BASIC': return 'text-green-400';
      case 'INTERMEDIATE': return 'text-yellow-400';
      case 'ADVANCED': return 'text-orange-400';
      case 'PROFESSIONAL': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 p-4 rounded">
        <div className="text-white">Loading progression data...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Lesson Progression</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-400">{completionPercentage.toFixed(0)}%</div>
          <div className="text-sm text-gray-300">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Lesson Sequence */}
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Lesson Sequence</h4>
        <div className="space-y-2">
          {progressPath.map((item, index) => (
            <div 
              key={item.lesson.id}
              className={`border rounded p-4 cursor-pointer transition-all ${
                selectedLesson === item.lesson.id 
                  ? 'border-blue-500 bg-blue-500 bg-opacity-10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setSelectedLesson(selectedLesson === item.lesson.id ? null : item.lesson.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`} />
                  <div>
                    <div className="font-semibold text-white">{item.lesson.name}</div>
                    <div className="text-sm text-gray-300">{item.lesson.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${getComplexityColor(item.lesson.complexity)}`}>
                    {item.lesson.complexity}
                  </div>
                  {item.progress && (
                    <div className="text-sm text-gray-300">
                      Score: {item.progress.score}% | Trades: {item.progress.tradesCompleted}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Lesson Details */}
              {selectedLesson === item.lesson.id && (
                <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-300 mb-1">Learning Objectives:</div>
                    <ul className="text-sm text-gray-400 list-disc list-inside">
                      {item.lesson.learningObjectives.map((objective, idx) => (
                        <li key={idx}>{objective}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-300">Duration:</span> {item.lesson.estimatedDuration} min
                    </div>
                    <div>
                      <span className="text-gray-300">Required Score:</span> {item.lesson.requiredScore}%
                    </div>
                  </div>

                  {/* Prerequisites */}
                  {item.lesson.prerequisites.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-300 mb-1">Prerequisites:</div>
                      <div className="text-sm text-gray-400">
                        {item.lesson.prerequisites.map((prereq, idx) => (
                          <div key={idx}>
                            • {prereq.lessonId}
                            {prereq.minimumScore && ` (${prereq.minimumScore}% minimum)`}
                            {prereq.requiredTrades && ` (${prereq.requiredTrades} trades)`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instructor Actions */}
                  <div className="flex space-x-2 pt-2">
                    {item.status === 'locked' && (
                      <button
                        onClick={() => handleLessonAction('unlock_lesson', item.lesson.id)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded"
                      >
                        Override Unlock
                      </button>
                    )}
                    
                    {(item.status === 'current' || item.status === 'available') && (
                      <button
                        onClick={() => handleLessonAction('update_progress', item.lesson.id, {
                          status: 'IN_PROGRESS',
                          lastAttempt: new Date()
                        })}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                      >
                        Start Lesson
                      </button>
                    )}

                    {item.progress && (
                      <button
                        onClick={() => handleLessonAction('reset_progress', item.lesson.id)}
                        className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded"
                      >
                        Reset Progress
                      </button>
                    )}

                    {item.status === 'current' && (
                      <button
                        onClick={() => handleLessonAction('complete_lesson', item.lesson.id, {
                          score: 85,
                          tradesCompleted: item.progress?.tradesCompleted || 0,
                          conceptsMastered: item.lesson.concepts
                        })}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Adaptive Recommendations */}
      {recommendations && (
        <div className="bg-gray-700 p-4 rounded">
          <h4 className="font-semibold text-white mb-3">AI Recommendations</h4>
          <div className="space-y-2">
            <div>
              <span className="font-semibold text-blue-400">{recommendations.recommendation}</span>
            </div>
            <div className="text-sm text-gray-300">{recommendations.reasoning}</div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-gray-300">Suggested Actions:</div>
              {recommendations.suggestedActions.map((action: string, index: number) => (
                <div key={index} className="text-sm text-gray-400">• {action}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 bg-gray-700 p-4 rounded">
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">
            {progressPath.filter(p => p.status === 'completed').length}
          </div>
          <div className="text-xs text-gray-300">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">
            {progressPath.filter(p => p.status === 'current').length}
          </div>
          <div className="text-xs text-gray-300">In Progress</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-yellow-400">
            {progressPath.filter(p => p.status === 'available').length}
          </div>
          <div className="text-xs text-gray-300">Available</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-400">
            {progressPath.filter(p => p.status === 'locked').length}
          </div>
          <div className="text-xs text-gray-300">Locked</div>
        </div>
      </div>
    </div>
  );
}