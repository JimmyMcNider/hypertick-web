/**
 * Wizard Item Display Component
 *
 * Renders wizard items from lesson XML configurations.
 * Supports headers, text, bullets, images, and navigation.
 */

'use client';

import { useState, useEffect } from 'react';

interface WizardItemContent {
  type: 'header' | 'text' | 'space' | 'bullet' | 'image' | 'component';
  content?: string;
  font?: string;
  size?: number;
  color?: string;
  indent?: number;
  value?: number; // for space
  componentId?: string; // for interactive components
  options?: string[]; // for dropdowns
}

interface WizardItemProps {
  itemId: string;
  title?: string;
  content: WizardItemContent[];
  nextItems: Record<string, string>; // button label -> next item id
  broadcast?: boolean;
  background?: string; // RGB color "224,237,253"
  onNavigate?: (nextItemId: string) => void;
  onComponentInteraction?: (componentId: string, value: any) => void;
}

export default function WizardItemDisplay({
  itemId,
  title,
  content,
  nextItems,
  broadcast = false,
  background,
  onNavigate,
  onComponentInteraction
}: WizardItemProps) {
  const [selectedValues, setSelectedValues] = useState<Record<string, any>>({});

  // Convert RGB string to CSS color
  const getBackgroundColor = (rgb?: string): string => {
    if (!rgb) return 'rgb(252, 251, 232)'; // Default cream color
    return `rgb(${rgb})`;
  };

  const renderContent = (item: WizardItemContent, index: number) => {
    const indent = item.indent || 0;
    const paddingLeft = `${indent}px`;

    switch (item.type) {
      case 'header':
        return (
          <h2
            key={index}
            className="font-bold"
            style={{
              paddingLeft,
              fontFamily: item.font || 'Palatino Linotype',
              fontSize: `${item.size || 18}px`,
              color: item.color ? `rgb(${item.color})` : 'rgb(18, 17, 74)',
              marginTop: '10px',
              marginBottom: '10px'
            }}
          >
            {item.content}
          </h2>
        );

      case 'text':
        return (
          <p
            key={index}
            className="text-base"
            style={{
              paddingLeft,
              paddingRight: '20px',
              fontFamily: item.font || 'Sans Serif',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '10px'
            }}
          >
            {item.content}
          </p>
        );

      case 'bullet':
        return (
          <li
            key={index}
            className="ml-8 text-base"
            style={{
              paddingLeft,
              fontFamily: item.font || 'Sans Serif',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '5px'
            }}
          >
            {item.content}
          </li>
        );

      case 'space':
        return (
          <div
            key={index}
            style={{ height: `${item.value || 20}px` }}
          />
        );

      case 'component':
        // Render interactive components (combo boxes, buttons, etc.)
        if (item.componentId === 'simulation selector' && item.options) {
          return (
            <div key={index} style={{ paddingLeft }} className="my-4">
              <select
                className="px-4 py-2 border border-gray-300 rounded bg-white text-black"
                value={selectedValues[item.componentId] || item.options[0]}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSelectedValues(prev => ({ ...prev, [item.componentId!]: newValue }));
                  onComponentInteraction?.(item.componentId!, newValue);
                }}
              >
                {item.options.map((option, idx) => (
                  <option key={idx} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div
      className="wizard-item-container max-w-4xl mx-auto rounded-lg shadow-lg p-8"
      style={{
        backgroundColor: getBackgroundColor(background),
        minHeight: '400px'
      }}
    >
      {/* Title */}
      {title && (
        <h1 className="text-3xl font-bold mb-6 text-center" style={{ color: 'rgb(18, 17, 74)' }}>
          {title}
        </h1>
      )}

      {/* Content */}
      <div className="wizard-content">
        {content.map((item, index) => renderContent(item, index))}
      </div>

      {/* Navigation Buttons */}
      {Object.keys(nextItems).length > 0 && (
        <div className="flex justify-center gap-4 mt-8">
          {Object.entries(nextItems).map(([label, nextItemId]) => (
            <button
              key={label}
              onClick={() => onNavigate?.(nextItemId)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Broadcast indicator (for instructor view) */}
      {broadcast && (
        <div className="mt-4 text-center text-xs text-gray-600">
          <span className="bg-yellow-200 px-2 py-1 rounded">
            📡 Broadcast to all students
          </span>
        </div>
      )}
    </div>
  );
}
