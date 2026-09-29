import { TEEvent, CustomReminder } from '../types';

// Google Calendar API response formats
interface GCalDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GCalReminderOverride {
  method: string;
  minutes: number;
}

interface GCalEventItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GCalDateTime;
  end: GCalDateTime;
  colorId?: string;
  status?: string;
  htmlLink?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: GCalReminderOverride[];
  };
}

const LOCAL_STORAGE_REMINDERS_KEY = 'te_custom_reminders_map';
const LOCAL_STORAGE_EVENTS_BACKUP = 'te_local_events_backup';

export function getStoredCustomReminders(): Record<string, CustomReminder[]> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REMINDERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredCustomReminders(map: Record<string, CustomReminder[]>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_REMINDERS_KEY, JSON.stringify(map));
  } catch {}
}

export function getLocalCachedEvents(): TEEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_BACKUP);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCachedEvents(events: TEEvent[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_EVENTS_BACKUP, JSON.stringify(events));
  } catch {}
}

/**
 * Fetch calendar events within a time range using Google OAuth access token
 */
export async function fetchGoogleCalendarEvents(
  token: string,
  timeMin: Date,
  timeMax: Date
): Promise<TEEvent[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', timeMin.toISOString());
  url.searchParams.set('timeMax', timeMax.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Calendar API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const storedReminders = getStoredCustomReminders();

  const events: TEEvent[] = (data.items || []).map((item: GCalEventItem) => {
    // Check if we have locally stored mechanical sound alarms for this event
    const savedCustom = storedReminders[item.id];
    let customReminders: CustomReminder[] = [];

    if (savedCustom && savedCustom.length > 0) {
      customReminders = savedCustom;
    } else if (item.reminders?.overrides && item.reminders.overrides.length > 0) {
      customReminders = item.reminders.overrides.map((ov, idx) => ({
        id: `gcal-${ov.minutes}-${idx}`,
        leadMinutes: ov.minutes,
        sound: 'pulse',
        actionTag: 'ALERT',
      }));
    } else {
      // Default Teenage Engineering alert
      customReminders = [
        {
          id: `def-${item.id}`,
          leadMinutes: 10,
          sound: 'chime',
          actionTag: 'ALERT',
        },
      ];
    }

    return {
      id: item.id,
      googleId: item.id,
      summary: item.summary || '(Untitled Sequence)',
      description: item.description,
      location: item.location,
      start: item.start,
      end: item.end,
      colorId: item.colorId || '1',
      reminders: customReminders,
      htmlLink: item.htmlLink,
    };
  });

  saveLocalCachedEvents(events);
  return events;
}

/**
 * Create a new event on Google Calendar
 */
export async function createGoogleCalendarEvent(
  token: string,
  event: Partial<TEEvent> & {
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    reminders?: CustomReminder[];
  }
): Promise<TEEvent> {
  const overrides: GCalReminderOverride[] = (event.reminders || []).map((r) => ({
    method: 'popup',
    minutes: r.leadMinutes,
  }));

  const payload: Record<string, unknown> = {
    summary: event.summary,
    description: event.description || '',
    location: event.location || '',
    start: event.start,
    end: event.end,
    reminders: {
      useDefault: overrides.length === 0,
      overrides: overrides.length > 0 ? overrides : undefined,
    },
  };

  if (event.colorId) {
    payload.colorId = event.colorId;
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create event (${response.status}): ${errText}`);
  }

  const created: GCalEventItem = await response.json();

  // Store custom reminders locally
  if (event.reminders && event.reminders.length > 0) {
    const map = getStoredCustomReminders();
    map[created.id] = event.reminders;
    saveStoredCustomReminders(map);
  }

  return {
    id: created.id,
    googleId: created.id,
    summary: created.summary || '(Untitled Event)',
    description: created.description,
    location: created.location,
    start: created.start,
    end: created.end,
    colorId: created.colorId || '1',
    reminders: event.reminders || [],
    htmlLink: created.htmlLink,
  };
}

/**
 * Update an existing event on Google Calendar
 */
export async function updateGoogleCalendarEvent(
  token: string,
  eventId: string,
  event: Partial<TEEvent>
): Promise<TEEvent> {
  const overrides: GCalReminderOverride[] = (event.reminders || []).map((r) => ({
    method: 'popup',
    minutes: r.leadMinutes,
  }));

  const payload: Record<string, unknown> = {
    summary: event.summary,
    description: event.description || '',
    location: event.location || '',
    start: event.start,
    end: event.end,
    reminders: {
      useDefault: overrides.length === 0,
      overrides: overrides.length > 0 ? overrides : undefined,
    },
  };

  if (event.colorId) {
    payload.colorId = event.colorId;
  }

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update event (${response.status}): ${errText}`);
  }

  const updated: GCalEventItem = await response.json();

  if (event.reminders) {
    const map = getStoredCustomReminders();
    map[updated.id] = event.reminders;
    saveStoredCustomReminders(map);
  }

  return {
    id: updated.id,
    googleId: updated.id,
    summary: updated.summary || '(Untitled Event)',
    description: updated.description,
    location: updated.location,
    start: updated.start,
    end: updated.end,
    colorId: updated.colorId || '1',
    reminders: event.reminders || [],
    htmlLink: updated.htmlLink,
  };
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(token: string, eventId: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const err = await response.text();
    throw new Error(`Failed to delete event (${response.status}): ${err}`);
  }

  const map = getStoredCustomReminders();
  if (map[eventId]) {
    delete map[eventId];
    saveStoredCustomReminders(map);
  }
}
