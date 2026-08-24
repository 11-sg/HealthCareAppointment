import React from 'react';
import { AppointmentStatus } from '../types';

interface StatusBadgeProps {
  status: AppointmentStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'CONFIRMED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-medical-700 text-white tracking-tight ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-medical-200"></span>
          Confirmed
        </span>
      );

    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Completed
        </span>
      );

    case 'PENDING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-900 border border-amber-300 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
          Pending
        </span>
      );

    case 'CANCELLED_BY_PATIENT':
    case 'CANCELLED_BY_DOCTOR':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          Cancelled
        </span>
      );

    case 'CANCELLED_DUE_TO_LEAVE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-100 text-rose-950 border border-rose-300 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-700"></span>
          Doctor Leave
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-slate-50 text-slate-500 border border-slate-200 ${sizeClasses}`}
        >
          {status}
        </span>
      );
  }
};
