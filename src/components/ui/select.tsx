import React from 'react';

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function Select({ children, value, onValueChange, className = '' }: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
    </div>
  );
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  return (
    <div className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}>
      {children}
    </div>
  );
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  return (
    <div className={`absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 ${className}`}>
      {children}
    </div>
  );
}

export function SelectItem({ children, value, className = '' }: SelectItemProps) {
  return (
    <div className={`px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm ${className}`} data-value={value}>
      {children}
    </div>
  );
}

export function SelectValue({ placeholder, className = '' }: SelectValueProps) {
  return (
    <span className={`text-gray-700 ${className}`}>
      {placeholder}
    </span>
  );
}