import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Article, Website } from '../types';
import {
  publishingConnectionsService,
  PublishingDestination,
} from '../services/publishingConnectionsService';

interface ScheduleModalProps {
  article: Article;
  website: Website;
  onClose: () => void;
  onSchedule: (scheduleData: {
    date: string;
    time: string;
    timezone: string;
    destination: string;
  }) => void;
  onNavigateToSettings?: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  article,
  website,
  onClose,
  onSchedule,
  onNavigateToSettings,
}) => {
  // Connected destinations state
  const [connectedDestinations, setConnectedDestinations] = useState<PublishingDestination[]>(
    () => publishingConnectionsService.getConnectedDestinations(website.name)
  );

  useEffect(() => {
    const syncDestinations = () => {
      setConnectedDestinations(
        publishingConnectionsService.getConnectedDestinations(website.name)
      );
    };
    return publishingConnectionsService.subscribe(syncDestinations);
  }, [website.name]);

  // Extract initial values from scheduledFor or scheduled_at
  const getInitialValues = () => {
    const available = publishingConnectionsService.getConnectedDestinations(website.name);
    const fallbackDestination = available[0]?.label || 'Blog - WordPress';

    if (article.scheduledFor?.date) {
      return {
        date: article.scheduledFor.date,
        time: article.scheduledFor.time || '09:00',
        timezone: article.scheduledFor.timezone || 'Asia/Kolkata (IST)',
        destination: article.scheduledFor.destination || fallbackDestination,
      };
    }
    const raw = (article as any).scheduled_at;
    if (raw) {
      try {
        const dt = new Date(raw);
        if (!isNaN(dt.getTime())) {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          const hours = String(dt.getHours()).padStart(2, '0');
          const minutes = String(dt.getMinutes()).padStart(2, '0');
          return {
            date: `${y}-${m}-${d}`,
            time: `${hours}:${minutes}`,
            timezone: 'Asia/Kolkata (IST)',
            destination: fallbackDestination,
          };
        }
      } catch {
        // fallback
      }
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      date: tomorrow.toISOString().split('T')[0],
      time: '09:00',
      timezone: 'Asia/Kolkata (IST)',
      destination: fallbackDestination,
    };
  };

  const initial = getInitialValues();
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [destination, setDestination] = useState(initial.destination);

  // Keep destination synced if connected destinations change or current is not connected
  useEffect(() => {
    if (connectedDestinations.length > 0) {
      const isCurrentValid = connectedDestinations.some(
        (d) => d.label === destination || d.name === destination
      );
      if (!isCurrentValid) {
        setDestination(connectedDestinations[0].label);
      }
    }
  }, [connectedDestinations, destination]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (connectedDestinations.length === 0) return;

    onSchedule({
      date,
      time,
      timezone,
      destination,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ef4d23]/10 flex items-center justify-center text-[#ef4d23]">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-neutral-900">Schedule publication</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-500 mb-6 line-clamp-1">
          Article: <strong className="text-neutral-900 font-semibold">{article.title}</strong>
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                Date
              </label>
              <input
                id="schedule-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                Time
              </label>
              <input
                id="schedule-time-input"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Timezone Selection including Indian Timezone */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Timezone
            </label>
            <select
              id="schedule-timezone-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-[#ef4d23] focus:outline-none"
            >
              <option value="Asia/Kolkata (IST)">
                Asia/Kolkata (IST - Indian Standard Time, UTC+05:30)
              </option>
              <option value="America/Los_Angeles (PT)">America/Los_Angeles (PT - Pacific)</option>
              <option value="America/New_York (ET)">America/New_York (ET - Eastern)</option>
              <option value="Europe/London (GMT)">Europe/London (GMT / BST)</option>
              <option value="Europe/Berlin (CET)">Europe/Berlin (CET)</option>
              <option value="Asia/Dubai (GST)">Asia/Dubai (GST - Gulf Standard Time, UTC+04:00)</option>
              <option value="Asia/Singapore (SGT)">Asia/Singapore (SGT, UTC+08:00)</option>
              <option value="Asia/Tokyo (JST)">Asia/Tokyo (JST, UTC+09:00)</option>
              <option value="Australia/Sydney (AEST)">Australia/Sydney (AEST, UTC+10:00)</option>
              <option value="UTC">UTC Universal Time</option>
            </select>
          </div>

          {/* Publishing Destination - ONLY CONNECTED SOURCES */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-800">
                Publishing destination
              </label>
              {connectedDestinations.length > 0 && (
                <span className="text-[11px] text-neutral-500">
                  {connectedDestinations.length} connected
                </span>
              )}
            </div>

            {connectedDestinations.length > 0 ? (
              <div>
                <select
                  id="schedule-destination-select"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-[#ef4d23] focus:outline-none"
                >
                  {connectedDestinations.map((dest) => (
                    <option key={dest.id} value={dest.label}>
                      {dest.label}
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    Showing connected sources only
                  </span>
                  {onNavigateToSettings && (
                    <button
                      type="button"
                      onClick={onNavigateToSettings}
                      className="text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
                    >
                      Manage
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-950">
                      No publishing destinations connected
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Connect WordPress or a Webhook endpoint in Settings to schedule automated publishing.
                    </p>
                    {onNavigateToSettings && (
                      <button
                        type="button"
                        onClick={onNavigateToSettings}
                        className="mt-2 inline-flex items-center gap-1 font-semibold text-xs text-[#ef4d23] hover:underline cursor-pointer"
                      >
                        <span>Connect destination in Settings</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              id="schedule-submit-btn"
              type="submit"
              disabled={connectedDestinations.length === 0}
              className="rounded-full bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-5 py-2 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
