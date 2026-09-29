import React, { useState, useEffect } from 'react';
import { TEEvent, CustomReminder, ViewMode } from './types';
import { 
  fetchGoogleCalendarEvents, 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent, 
  deleteGoogleCalendarEvent,
  getLocalCachedEvents,
  saveLocalCachedEvents
} from './services/calendarService';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken, 
  setManualAccessToken,
  CachedUserProfile,
  getCachedUserProfile
} from './services/authService';
import { TETapeDisplay } from './components/TETapeDisplay';
import { TEMonthView } from './components/TEMonthView';
import { TEWeekDayView } from './components/TEWeekDayView';
import { TEAgendaView } from './components/TEAgendaView';
import { TEEventModal } from './components/TEEventModal';
import { TEAppleSyncModal } from './components/TEAppleSyncModal';
import { TELinuxAppModal } from './components/TELinuxAppModal';
import { useReminderEngine, TEAlarmBanner } from './components/TEAlarmSystem';
import { teSound } from './utils/sound';
import { User } from 'firebase/auth';
import { 
  Plus, RefreshCw, Volume2, VolumeX, 
  Radio, AlertCircle, Apple, LogOut, KeyRound,
  Terminal, Package, UserCheck
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function App() {
  const [user, setUser] = useState<User | CachedUserProfile | null>(() => getCachedUserProfile());
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  const [events, setEvents] = useState<TEEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<TEEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAppleModalOpen, setIsAppleModalOpen] = useState<boolean>(false);
  const [isLinuxModalOpen, setIsLinuxModalOpen] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Linux PWA Deferred Prompt
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 1. Immediately hydrate events from local cache so the user sees their calendar instantly
    const cached = getLocalCachedEvents();
    if (cached && cached.length > 0) {
      setEvents(cached);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Mechanical Alarm Engine
  const { activeAlert, dismissAlert } = useReminderEngine(events);

  // Sync Audio Toggle with Sound Synthesizer
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    teSound.enabled = next;
    if (next) {
      teSound.click(1000, 0.02);
    }
  };

  // 2. Initialize Auth & Auto-Restore previous login session
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, accessToken) => {
        setUser(authedUser);
        setToken(accessToken);
        setAuthError(null);
      },
      () => {
        const storedToken = getAccessToken();
        const storedProfile = getCachedUserProfile();
        if (storedToken) {
          setToken(storedToken);
          if (storedProfile) setUser(storedProfile);
        } else {
          setUser(null);
          setToken(null);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. Perform official Google Workspace OAuth Sign-in
  const handleGoogleSignIn = async () => {
    setIsAuthorizing(true);
    setAuthError(null);
    teSound.click(1200, 0.03);

    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        teSound.alarmTone('chime');
      }
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(msg);
      teSound.alarmTone('radar');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleLogout = async () => {
    teSound.click(700, 0.03);
    await logoutGoogle();
    setUser(null);
    setToken(null);
  };

  const handleManualTokenEntry = () => {
    const input = window.prompt(
      'Enter your Google OAuth Access Token with calendar.events permission:',
      token || ''
    );
    if (input && input.trim()) {
      setManualAccessToken(input.trim());
      setToken(input.trim());
      teSound.alarmTone('chime');
    }
  };

  // Fetch events from Google Calendar whenever token is present or active date changes
  const refreshEvents = async () => {
    if (!token) return;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const timeMin = new Date(year, month - 1, 1);
      const timeMax = new Date(year, month + 2, 0, 23, 59, 59);

      const items = await fetchGoogleCalendarEvents(token, timeMin, timeMax);
      setEvents(items);
      teSound.click(1300, 0.02);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(msg);
      // If token expired (401), indicate re-auth needed
      if (msg.includes('401')) {
        setToken(null);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync events whenever token is available on visit
  useEffect(() => {
    if (token) {
      refreshEvents();
    }
  }, [token, currentDate.getMonth(), currentDate.getFullYear()]);

  // Handle Event Saving (Create or Update)
  const handleSaveEvent = async (eventData: Partial<TEEvent> & { summary: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; reminders: CustomReminder[] }) => {
    setIsSaving(true);
    try {
      if (token) {
        if (selectedEvent?.id && !selectedEvent.id.startsWith('apple-') && !selectedEvent.id.startsWith('evt-')) {
          const updated = await updateGoogleCalendarEvent(token, selectedEvent.id, eventData);
          setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
        } else {
          const created = await createGoogleCalendarEvent(token, eventData);
          setEvents([created, ...events]);
        }
      } else {
        if (selectedEvent) {
          const updatedList = events.map((e) =>
            e.id === selectedEvent.id ? { ...e, ...eventData } : e
          );
          setEvents(updatedList);
          saveLocalCachedEvents(updatedList);
        } else {
          const newEvent: TEEvent = {
            id: `evt-${Date.now()}`,
            summary: eventData.summary,
            description: eventData.description,
            location: eventData.location,
            start: eventData.start,
            end: eventData.end,
            colorId: eventData.colorId || '6',
            reminders: eventData.reminders,
          };
          const updatedList = [newEvent, ...events];
          setEvents(updatedList);
          saveLocalCachedEvents(updatedList);
        }
      }

      teSound.alarmTone('chime');
      setIsModalOpen(false);
      setSelectedEvent(null);
    } catch (err: unknown) {
      alert(`Save error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Event Deletion
  const handleDeleteEvent = async (eventId: string) => {
    const updated = events.filter((e) => e.id !== eventId);
    setEvents(updated);
    saveLocalCachedEvents(updated);
    setIsModalOpen(false);
    setSelectedEvent(null);
    teSound.click(600, 0.03);

    if (token && !eventId.startsWith('apple-') && !eventId.startsWith('evt-')) {
      try {
        await deleteGoogleCalendarEvent(token, eventId);
      } catch (err: unknown) {
        console.error('Failed to delete on Google Calendar:', err);
      }
    }
  };

  const openNewEventModal = (date: Date = currentDate) => {
    teSound.click(1100, 0.02);
    setSelectedEvent(null);
    setModalDate(date);
    setIsModalOpen(true);
  };

  const openEditEventModal = (ev: TEEvent) => {
    teSound.click(1050, 0.02);
    setSelectedEvent(ev);
    setIsModalOpen(true);
  };

  const handleImportAppleEvents = (imported: TEEvent[]) => {
    const merged = [...imported, ...events];
    setEvents(merged);
    saveLocalCachedEvents(merged);
  };

  return (
    <div className="min-h-screen bg-[#101114] text-[#eceff4] flex flex-col font-mono-te select-none">
      
      {/* Linux Window Decoration Top Bar */}
      <div className="bg-[#121317] border-b border-[#242630] px-3 py-1 flex items-center justify-between text-[10px] text-[#717684]">
        {/* Linux GNOME / X11 Style Window Title */}
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-[#00d2c4]" />
          <span className="font-silkscreen text-[9px] text-[#9ca1b0]">
            op-cal-field@linux:~# calendar.service
          </span>
          <span className="bg-[#1e2029] text-[8px] font-mono-te px-1.5 py-0.2 rounded text-[#ff4c00]">
            x86_64-linux-gnu
          </span>
          {token && (
            <span className="bg-[#00d2c4]/10 text-[#00d2c4] border border-[#00d2c4]/30 text-[8px] px-1.5 py-0.2 rounded flex items-center gap-1 font-mono-te">
              <UserCheck size={9} />
              <span>AUTO-RESTORED</span>
            </span>
          )}
        </div>

        {/* Linux Window Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLinuxModalOpen(true)}
            className="hover:text-white flex items-center gap-1.5 text-[9px] font-silkscreen text-[#e95420] bg-[#e95420]/15 hover:bg-[#e95420]/25 px-2.5 py-0.5 rounded border border-[#e95420]/40 transition-colors shadow-sm"
          >
            <Package size={11} className="text-[#e95420]" />
            <span>UBUNTU / LINUX .DEB</span>
          </button>
          
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#292c36]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f8c822]/80 cursor-pointer" title="Minimize" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#00d2c4]/80 cursor-pointer" title="Maximize" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff4c00]/80 cursor-pointer" title="Close" />
          </div>
        </div>
      </div>

      {/* Mechanical Alarm Live Banner */}
      <TEAlarmBanner alert={activeAlert} onDismiss={dismissAlert} />

      {/* TOP TE CHASSIS RIDGE & SYSTEM BAR */}
      <header className="bg-[#181a1f] border-b-2 border-[#2b2e38] px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-md">
        
        {/* Brand identity & Model Number */}
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-[#ff4c00] shadow-[0_0_8px_#ff4c00] animate-pulse flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-silkscreen text-xs sm:text-sm font-bold tracking-widest text-white">
                OP-CAL // LINUX APP
              </span>
              <span className="bg-[#ff4c00] text-black text-[9px] font-silkscreen px-1.5 py-0.2 rounded font-bold">
                FIELD v2.2
              </span>
            </div>
            <span className="text-[9px] text-[#717684] tracking-wider hidden sm:inline">
              AUTOMATIC GOOGLE ACCOUNT PERSISTENCE & LOCAL ENGINE
            </span>
          </div>
        </div>

        {/* Tactical Actions Deck */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Apple Calendar Sync Trigger Button */}
          <button
            onClick={() => {
              teSound.click(900, 0.02);
              setIsAppleModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded bg-[#20232c] hover:bg-[#2c313e] text-[#e0e3ed] text-[10px] font-silkscreen tracking-wider border border-[#3b4050] flex items-center gap-1.5 transition-all shadow active:scale-95"
            title="Sync with Apple Calendar (.ics import/export)"
          >
            <Apple size={13} className="text-white" />
            <span className="hidden sm:inline">APPLE CAL</span>
          </button>

          {/* Google Calendar Connection Status Badge / Sign-in */}
          {token ? (
            <div className="flex items-center gap-2 bg-[#121316] border border-[#2b2e38] px-2.5 py-1 rounded text-[10px] font-mono-te">
              <span className="w-2 h-2 rounded-full bg-[#00d2c4] animate-pulse" />
              <span className="text-[#a1a6b4] hidden md:inline max-w-[130px] truncate" title={user?.email || 'Logged in'}>
                {user?.email ? user.email.split('@')[0] : 'GOOGLE ACTIVE'}
              </span>
              <button
                onClick={refreshEvents}
                disabled={isSyncing}
                className="text-[#ff4c00] hover:text-white p-0.5"
                title="Refresh Calendar Events"
              >
                <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleLogout}
                className="text-[#6d717f] hover:text-[#ff4c00] p-0.5"
                title="Disconnect Google Account"
              >
                <LogOut size={11} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthorizing}
                className="px-3 py-1.5 rounded bg-[#ff4c00] hover:bg-[#e24400] text-white text-[10px] font-silkscreen tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,76,0,0.3)] transition-all active:scale-95"
              >
                <Radio size={12} className={isAuthorizing ? 'animate-spin' : ''} />
                <span>{isAuthorizing ? 'CONNECTING...' : 'SYNC GOOGLE CAL'}</span>
              </button>
              <button
                onClick={handleManualTokenEntry}
                className="p-1.5 rounded bg-[#1e2027] hover:bg-[#2c303c] border border-[#343744] text-[#8e93a2] hover:text-white"
                title="Manual Token Entry / Fallback"
              >
                <KeyRound size={12} />
              </button>
            </div>
          )}

          {/* Sound Synthesizer toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded border ${
              soundEnabled
                ? 'bg-[#1e2026] border-[#00d2c4]/40 text-[#00d2c4]'
                : 'bg-[#151619] border-[#292b33] text-[#636875]'
            }`}
            title="Acoustic Click Engine"
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* New Event Button */}
          <button
            onClick={() => openNewEventModal(currentDate)}
            className="px-3.5 py-1.5 rounded bg-[#2c2f38] hover:bg-[#ff4c00] hover:text-white text-[#d6dae5] text-[10px] font-silkscreen tracking-wider border border-[#444855] transition-all flex items-center gap-1.5 shadow active:translate-y-0.5"
          >
            <Plus size={13} />
            <span>NEW EVENT</span>
          </button>

        </div>

      </header>

      {/* SYNTH TAPE DECK DISPLAY & STEPPER CONTROLS */}
      <TETapeDisplay
        currentDate={currentDate}
        onDateChange={(d) => setCurrentDate(d)}
        viewMode={viewMode}
        onViewModeChange={(m) => setViewMode(m)}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onRefresh={refreshEvents}
        isSyncing={isSyncing}
        eventsCount={events.length}
      />

      {/* CALENDAR VIEW CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {authError && (
          <div className="bg-[#2a1414] border-b border-[#ff4c00] px-4 py-2 text-xs text-[#ff8c8c] font-mono-te flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>Google Sign-In Notice: {authError}</span>
            </div>
            <button
              onClick={handleGoogleSignIn}
              className="text-[#00d2c4] underline font-silkscreen text-[10px] hover:text-white"
            >
              RETRY SIGN-IN
            </button>
          </div>
        )}

        {syncError && (
          <div className="bg-[#291313] border-b border-[#ff4c00] px-4 py-1.5 text-xs text-[#ff8080] font-mono-te flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span>Sync status: {syncError}</span>
            </div>
            <button
              onClick={handleGoogleSignIn}
              className="text-[#ff4c00] underline font-bold hover:text-white"
            >
              Re-authorize Account
            </button>
          </div>
        )}

        {viewMode === 'MONTH' && (
          <TEMonthView
            currentDate={currentDate}
            events={events}
            onSelectDate={(d) => setCurrentDate(d)}
            onSelectEvent={openEditEventModal}
            onCreateEvent={openNewEventModal}
          />
        )}

        {(viewMode === 'WEEK' || viewMode === 'DAY') && (
          <TEWeekDayView
            currentDate={currentDate}
            events={events}
            mode={viewMode}
            onSelectEvent={openEditEventModal}
            onCreateEvent={openNewEventModal}
          />
        )}

        {viewMode === 'AGENDA' && (
          <TEAgendaView
            events={events}
            onSelectEvent={openEditEventModal}
            onCreateEvent={openNewEventModal}
          />
        )}
      </main>

      {/* TE FOOTER CHASSIS DETAILS & LINUX KERNEL SPECS */}
      <footer className="bg-[#141518] border-t border-[#262831] px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#686d7c] font-mono-te gap-2 select-none">
        <div className="flex items-center gap-3">
          <span className="font-silkscreen text-[#ff4c00]">OP-CAL // LINUX RUNTIME</span>
          <span>•</span>
          <span>HOST: POSIX / LINUX KERNEL</span>
          <span>•</span>
          <span>SESSION: {token ? 'PERSISTED (AUTO-LOGIN ACTIVE)' : 'OFFLINE LOCAL'}</span>
          <span>•</span>
          <span>SFX: {soundEnabled ? 'ON' : 'MUTED'}</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsLinuxModalOpen(true)}
            className="text-[#00d2c4] hover:underline flex items-center gap-1 font-silkscreen text-[9px]"
          >
            <Terminal size={11} />
            <span>DESKTOP LAUNCHER HELPER</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d2c4]" />
            <span className="text-[9px] font-silkscreen text-white">READY</span>
          </div>
        </div>
      </footer>

      {/* EVENT MODAL / TRIGGER SEQUENCER */}
      {isModalOpen && (
        <TEEventModal
          event={selectedEvent}
          selectedDate={modalDate}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveEvent}
          onDelete={selectedEvent ? handleDeleteEvent : undefined}
          isSaving={isSaving}
        />
      )}

      {/* APPLE CALENDAR SYNC MODAL */}
      {isAppleModalOpen && (
        <TEAppleSyncModal
          events={events}
          onImportEvents={handleImportAppleEvents}
          onClose={() => setIsAppleModalOpen(false)}
        />
      )}

      {/* LINUX APPLICATION LAUNCHER MODAL */}
      {isLinuxModalOpen && (
        <TELinuxAppModal
          onClose={() => setIsLinuxModalOpen(false)}
        />
      )}

    </div>
  );
}
