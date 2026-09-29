import React, { useEffect, useState } from 'react';
import { TEEvent, CustomReminder } from '../types';
import { teSound } from '../utils/sound';
import confetti from 'canvas-confetti';
import { Bell, Volume2, CheckCircle, Clock } from 'lucide-react';

interface ActiveNotification {
  id: string;
  eventId: string;
  summary: string;
  reminder: CustomReminder;
  fireTime: Date;
}

export function useReminderEngine(events: TEEvent[]) {
  const [activeAlert, setActiveAlert] = useState<ActiveNotification | null>(null);
  const [history, setHistory] = useState<ActiveNotification[]>([]);

  useEffect(() => {
    // Request browser notification permission if available
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const firedReminderIds = new Set<string>();

    const checkTriggers = () => {
      const now = Date.now();

      events.forEach((ev) => {
        if (!ev.start.dateTime) return;
        const startTime = new Date(ev.start.dateTime).getTime();

        (ev.reminders || []).forEach((rem) => {
          const triggerTime = startTime - rem.leadMinutes * 60 * 1000;
          const diffMs = now - triggerTime;
          const key = `${ev.id}-${rem.id || rem.leadMinutes}`;

          // Check if triggered within the last 60 seconds and not already fired
          if (diffMs >= 0 && diffMs < 70000 && !firedReminderIds.has(key)) {
            firedReminderIds.add(key);

            // Play the TE mechanical alarm if not silent
            if (rem.sound !== 'silent') {
              teSound.alarmTone(rem.sound);
            }

            // Pop-up visual banner
            const notif: ActiveNotification = {
              id: key,
              eventId: ev.id,
              summary: ev.summary,
              reminder: rem,
              fireTime: new Date(),
            };

            setActiveAlert(notif);
            setHistory((prev) => [notif, ...prev.slice(0, 9)]);

            // Native browser notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`[TE OP-CAL] ${rem.actionTag || 'ALERT'}: ${ev.summary}`, {
                  body: rem.leadMinutes === 0 ? 'Event is starting now!' : `Starting in ${rem.leadMinutes} minutes.`,
                  icon: '/favicon.ico',
                });
              } catch {}
            }

            // Confetti sparkle for start alert
            if (rem.leadMinutes === 0) {
              confetti({
                particleCount: 40,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#ff4c00', '#00d2c4', '#f8c822'],
              });
            }
          }
        });
      });
    };

    const interval = setInterval(checkTriggers, 10000); // Check every 10s
    checkTriggers();

    return () => clearInterval(interval);
  }, [events]);

  const dismissAlert = () => {
    teSound.click(600, 0.02);
    setActiveAlert(null);
  };

  return { activeAlert, dismissAlert, history };
}

export const TEAlarmBanner: React.FC<{
  alert: ActiveNotification | null;
  onDismiss: () => void;
}> = ({ alert, onDismiss }) => {
  if (!alert) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce">
      <div className="bg-[#121316] border-2 border-[#ff4c00] rounded-xl shadow-[0_0_25px_rgba(255,76,0,0.6)] p-3 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-[#ff4c00] flex items-center justify-center text-white shrink-0 animate-pulse">
            <Bell size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-silkscreen text-[#ff4c00]">
              <span>[TRIGGER // {alert.reminder.actionTag || 'ALERT'}]</span>
              <span className="text-[#00d2c4] font-mono-te">
                TONE: {alert.reminder.sound.toUpperCase()}
              </span>
            </div>
            <div className="font-mono-te text-xs font-bold text-white leading-tight">
              {alert.summary}
            </div>
            <div className="text-[9px] font-mono-te text-[#8f94a4]">
              {alert.reminder.leadMinutes === 0
                ? 'Happening right now!'
                : `Starting in ${alert.reminder.leadMinutes} minutes`}
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="px-3 py-1.5 rounded bg-[#ff4c00] hover:bg-[#e04300] text-white font-silkscreen text-[9px] tracking-wider shrink-0 transition-colors shadow"
        >
          ACK [OK]
        </button>
      </div>
    </div>
  );
};
