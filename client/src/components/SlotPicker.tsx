import React from 'react';
import { Calendar, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { SlotCalculationResult, SlotAvailability } from '../types';

interface SlotPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  slotsResult: SlotCalculationResult | null;
  loading: boolean;
  selectedSlot: { slot_start: string; slot_end: string } | null;
  onSelectSlot: (slot: { slot_start: string; slot_end: string }) => void;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  selectedDate,
  onSelectDate,
  slotsResult,
  loading,
  selectedSlot,
  onSelectSlot,
}) => {
  // Generate next 7 days for quick date tabs
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateString: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayNumber: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
    };
  });

  return (
    <div className="space-y-6">
      {/* Date Carousel Tabs */}
      <div>
        <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2.5 font-bold">
          Select Consultation Date
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {days.map((item) => {
            const isSelected = item.dateString === selectedDate;
            return (
              <button
                key={item.dateString}
                type="button"
                onClick={() => onSelectDate(item.dateString)}
                className={`py-3 px-2 rounded-2xl text-center transition-all flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'bg-medical-700 text-white border-medical-700 shadow-card font-bold'
                    : 'bg-white text-slate-700 border-surface-border hover:bg-slate-50 hover:border-medical-400'
                }`}
              >
                <span className="text-[11px] font-mono uppercase tracking-wider opacity-80 font-semibold">
                  {item.dayName}
                </span>
                <span className="text-base font-bold my-0.5">{item.dayNumber}</span>
                <span className="text-[10px] opacity-80">{item.month}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-bold">
            <Clock className="w-3.5 h-3.5 text-medical-700" />
            Available Time Intervals
          </label>
          {slotsResult?.doctor && (
            <span className="text-xs text-medical-700 font-mono font-semibold">
              {slotsResult.doctor.slot_duration_minutes} min session
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-36 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-medical-600" />
            <span className="text-xs font-mono">Calculating availability...</span>
          </div>
        ) : slotsResult?.isLeaveDay ? (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Practitioner on Scheduled Leave</span>
            </div>
            <p className="text-amber-800/90 pl-6 leading-relaxed">
              Dr. {slotsResult.doctor?.name} is away on this date. Please select another date from the tabs above.
            </p>
          </div>
        ) : slotsResult?.slots.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-surface-border text-center text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">No available intervals on this day</p>
            <p className="text-[11px]">The physician is off-duty or fully booked.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {slotsResult?.slots.map((slot: SlotAvailability) => {
              const startTime = new Date(slot.slot_start).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const endTime = new Date(slot.slot_end).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              const isSelected =
                selectedSlot?.slot_start === slot.slot_start &&
                selectedSlot?.slot_end === slot.slot_end;

              const isHeldByMe = slot.status === 'HELD_BY_CURRENT_USER';
              const isAvailable = slot.is_available || isHeldByMe;

              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() =>
                    onSelectSlot({
                      slot_start: slot.slot_start,
                      slot_end: slot.slot_end,
                    })
                  }
                  className={`p-3 rounded-2xl text-center border transition-all text-xs font-mono ${
                    isSelected
                      ? 'bg-medical-700 text-white border-medical-700 shadow-card font-bold'
                      : isHeldByMe
                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                      : isAvailable
                      ? 'bg-white text-slate-800 border-surface-border hover:border-medical-600 hover:bg-medical-50/40 shadow-sm'
                      : 'bg-slate-100 text-slate-400 border-surface-subtle cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="font-bold text-xs tracking-tight">{startTime}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">to {endTime}</div>
                  {isHeldByMe && !isSelected && (
                    <span className="block text-[9px] font-sans font-semibold text-amber-800 mt-1">
                      Reserved by you
                    </span>
                  )}
                  {!isAvailable && (
                    <span className="block text-[9px] font-sans text-slate-400 mt-1">Booked</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
