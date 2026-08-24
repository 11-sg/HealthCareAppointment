import React from 'react';
import { UrgencyLevel } from '../types';

interface UrgencyBadgeProps {
  level?: UrgencyLevel;
  size?: 'sm' | 'md' | 'lg';
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ level = 'Low', size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size];

  switch (level) {
    case 'High':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-rose-50 text-rose-800 border border-rose-200 tracking-tight ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
          High Priority
        </span>
      );

    case 'Medium':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-900 border border-amber-300 tracking-tight ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          Moderate Urgency
        </span>
      );

    case 'Low':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 tracking-tight ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Routine Care
        </span>
      );
  }
};
