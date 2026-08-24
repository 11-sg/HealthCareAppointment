import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface HoldTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export const HoldTimer: React.FC<HoldTimerProps> = ({ expiresAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<string>('05:00');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();

      if (difference <= 0) {
        setTimeLeft('00:00');
        if (onExpire) onExpire();
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setIsUrgent(totalSeconds < 60);
      setTimeLeft(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
        isUrgent
          ? 'bg-rose-50 border-rose-300 text-rose-900 animate-pulse'
          : 'bg-medical-50 border-medical-200 text-medical-900'
      }`}
    >
      <Clock className="w-3.5 h-3.5 opacity-80 text-medical-700" />
      <span className="text-xs font-medium tracking-tight">Slot Reserved:</span>
      <span className="font-mono text-xs font-bold text-medical-800">{timeLeft}</span>
    </div>
  );
};
