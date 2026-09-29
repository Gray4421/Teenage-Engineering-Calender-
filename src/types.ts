export interface CustomReminder {
  id: string;
  leadMinutes: number; // e.g. 0 (at event start), 5, 10, 15, 30, 60, 1440 (1 day)
  sound: 'radar' | 'chime' | 'pulse' | 'morse' | 'silent';
  actionTag?: 'FOCUS' | 'BRIEFING' | 'DEPLOY' | 'STANDUP' | 'SYNC' | 'ALERT';
  vibrate?: boolean;
}

export interface TEEvent {
  id: string;
  googleId?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string; // For all-day events: YYYY-MM-DD
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  colorId?: string; // 1 to 11
  reminders?: CustomReminder[];
  status?: string;
  isLocalOnly?: boolean;
  htmlLink?: string;
}

export type ViewMode = 'MONTH' | 'WEEK' | 'DAY' | 'AGENDA' | 'RADAR';

export type TEKnobColor = 'orange' | 'cyan' | 'yellow' | 'magenta' | 'aluminum';
