import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Loader2,
  Shield,
  Pill,
  Calendar,
} from 'lucide-react';
import { NotificationQueueItem } from '../../types';
import { adminApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Modal } from '../../components/Modal';

export const AdminQueuePage: React.FC = () => {
  const { success, error } = useNotification();
  const [queue, setQueue] = useState<NotificationQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggeringWorker, setTriggeringWorker] = useState<string | null>(null);

  // Email Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<NotificationQueueItem | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getEmailQueue({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      });
      setQueue(res.data.queue);
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to fetch email queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const handleRetry = async (id: string) => {
    try {
      const res = await adminApi.retryEmail(id);
      if (res.data.success) {
        success('Email dispatched and processed successfully');
      } else {
        error('Retry failed. Check logs.');
      }
      fetchQueue();
    } catch (err: any) {
      error('Failed to retry email delivery');
    }
  };

  const handleTriggerWorker = async (
    workerName: 'email_queue' | 'medication_reminders' | 'slot_hold_cleanup' | 'appointment_reminders',
    label: string
  ) => {
    setTriggeringWorker(workerName);
    try {
      const res = await adminApi.triggerWorker(workerName);
      success(`${label} executed: ${JSON.stringify(res.data.result)}`);
      fetchQueue();
    } catch (err: any) {
      error(`Failed to trigger ${label}`);
    } finally {
      setTriggeringWorker(null);
    }
  };

  const handleOpenPreview = (item: NotificationQueueItem) => {
    setPreviewItem(item);
    setPreviewModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
            Outbox Architecture
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Background Queue & Outbox Log
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Monitor outbound transactional email delivery, retry failed notifications, and manually trigger cron routines.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchQueue}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium text-xs rounded-xl border border-surface-border transition shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
        </button>
      </div>

      {/* Manual Worker Triggers Panel */}
      <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-4">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-medical-700" /> Manual Background Routine Triggers
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            disabled={triggeringWorker !== null}
            onClick={() => handleTriggerWorker('email_queue', 'Email Retry Queue Worker')}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-surface-border text-slate-900 rounded-2xl text-left transition flex items-center justify-between group disabled:opacity-50"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Mail className="w-3.5 h-3.5 text-medical-700" />
                <span>Process Outbox</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">Flush pending emails</p>
            </div>
            {triggeringWorker === 'email_queue' ? (
              <Loader2 className="w-4 h-4 animate-spin text-medical-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-slate-300 group-hover:text-medical-700 transition" />
            )}
          </button>

          <button
            type="button"
            disabled={triggeringWorker !== null}
            onClick={() => handleTriggerWorker('medication_reminders', 'Medication Reminder Worker')}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-surface-border text-slate-900 rounded-2xl text-left transition flex items-center justify-between group disabled:opacity-50"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Pill className="w-3.5 h-3.5 text-medical-700" />
                <span>Med Reminders</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">Scan due prescriptions</p>
            </div>
            {triggeringWorker === 'medication_reminders' ? (
              <Loader2 className="w-4 h-4 animate-spin text-medical-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-slate-300 group-hover:text-medical-700 transition" />
            )}
          </button>

          <button
            type="button"
            disabled={triggeringWorker !== null}
            onClick={() => handleTriggerWorker('slot_hold_cleanup', 'Slot Hold Cleanup Worker')}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-surface-border text-slate-900 rounded-2xl text-left transition flex items-center justify-between group disabled:opacity-50"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Clock className="w-3.5 h-3.5 text-medical-700" />
                <span>Slot Cleanup</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">Sweep expired holds</p>
            </div>
            {triggeringWorker === 'slot_hold_cleanup' ? (
              <Loader2 className="w-4 h-4 animate-spin text-medical-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-slate-300 group-hover:text-medical-700 transition" />
            )}
          </button>

          <button
            type="button"
            disabled={triggeringWorker !== null}
            onClick={() => handleTriggerWorker('appointment_reminders', '24h Reminder Worker')}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-surface-border text-slate-900 rounded-2xl text-left transition flex items-center justify-between group disabled:opacity-50"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Calendar className="w-3.5 h-3.5 text-medical-700" />
                <span>24h Alerts</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">Alert tomorrow's visits</p>
            </div>
            {triggeringWorker === 'appointment_reminders' ? (
              <Loader2 className="w-4 h-4 animate-spin text-medical-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-slate-300 group-hover:text-medical-700 transition" />
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5">
        {(['all', 'PENDING', 'SENT', 'FAILED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition border ${
              statusFilter === tab
                ? 'bg-medical-700 text-white border-medical-700 shadow-card font-bold'
                : 'bg-white text-slate-700 border-surface-border hover:bg-slate-50'
            }`}
          >
            {tab === 'all' ? 'All Queue Items' : tab}
          </button>
        ))}
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
          <span className="text-xs font-mono">Loading outbox records...</span>
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-3xl border border-surface-border p-12 text-center space-y-2 shadow-card">
          <Mail className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="font-bold text-base text-slate-900">No items found in email outbox</h4>
          <p className="text-xs text-slate-500">Notifications triggered by bookings or prescriptions will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-surface-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-surface-border text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Dispatched / Next Attempt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle font-sans text-slate-700">
                {queue.map((item) => {
                  const isSent = item.status === 'SENT';
                  const isFailed = item.status === 'FAILED';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block text-xs">
                          {item.recipient_name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{item.recipient_email}</span>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-600">
                        {item.type}
                      </td>
                      <td className="py-4 px-4 max-w-xs truncate font-medium text-slate-800">
                        {item.subject}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono border font-bold ${
                            isSent
                              ? 'bg-slate-100 text-slate-800 border-surface-border'
                              : isFailed
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono">
                        <span className="font-bold text-slate-900">{item.retry_count}</span>
                        <span className="text-slate-400">/{item.max_retries}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                        {item.sent_at
                          ? new Date(item.sent_at).toLocaleTimeString('en-IN')
                          : item.next_retry_at
                          ? `Next: ${new Date(item.next_retry_at).toLocaleTimeString('en-IN')}`
                          : 'Immediate'}
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(item)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg font-mono text-[11px] transition border border-surface-border"
                        >
                          HTML
                        </button>
                        {!isSent && (
                          <button
                            type="button"
                            onClick={() => handleRetry(item.id)}
                            className="px-2.5 py-1 bg-medical-700 hover:bg-medical-800 text-white rounded-lg font-medium text-[11px] transition inline-flex items-center gap-1 shadow-card"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HTML Email Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={`Outbox Item: ${previewItem?.subject}`}
        maxWidth="2xl"
      >
        {previewItem && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-1 border border-surface-border font-mono text-slate-700">
              <p><strong>To:</strong> {previewItem.recipient_name} &lt;{previewItem.recipient_email}&gt;</p>
              <p><strong>Subject:</strong> {previewItem.subject}</p>
              <p><strong>Type:</strong> {previewItem.type}</p>
              {previewItem.last_error && (
                <p className="text-rose-700 font-semibold font-sans">
                  <strong>Last Error:</strong> {previewItem.last_error}
                </p>
              )}
            </div>

            <div
              className="p-4 bg-white rounded-2xl border border-surface-border max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewItem.body_html }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
