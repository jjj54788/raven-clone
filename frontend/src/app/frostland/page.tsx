'use client';

import { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import { Snowflake, SkipForward, Save, Home, Trophy, HelpCircle, Volume2, VolumeX } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';

import GameMenu from '@/components/game/GameMenu';
import GameCanvas from '@/components/game/GameCanvas';
import GameHUD from '@/components/game/GameHUD';
import BuildPanel from '@/components/game/BuildPanel';
import BuildingInfo from '@/components/game/BuildingInfo';
import EventModal from '@/components/game/EventModal';
import GameOverModal from '@/components/game/GameOverModal';
import LogPanel from '@/components/game/LogPanel';
import SaveLoadPanel from '@/components/game/SaveLoadPanel';
import StatsPanel from '@/components/game/StatsPanel';
import TutorialOverlay from '@/components/game/TutorialOverlay';

import { gameReducer, createInitialState } from '@/game/engine';
import type { GameState, Difficulty } from '@/game/types';
import { saveGame, getGameLeaderboard } from '@/lib/api';
import { getAudio } from '@/game/audio';

export default function FrostlandPage() {
  const { userName, authReady } = useAuth();
  const { locale } = useLanguage();
  const zh = locale === 'zh';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [screen, setScreen] = useState<'menu' | 'game' | 'leaderboard'>('menu');
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [dayFlash, setDayFlash] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const prevDayRef = useRef(0);
  const [leaderboard, setLeaderboard] = useState<
    { id: string; daysSurvived: number; score: number; updatedAt: string; user: { id: string; name: string; avatarUrl: string | null } }[]
  >([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Game state via reducer
  const [state, dispatch] = useReducer(gameReducer, null as unknown as GameState);

  // Auto-save every 5 turns
  const lastAutoSaveDay = useRef(0);
  useEffect(() => {
    if (!state || state.phase !== 'playing') return;
    if (state.day > 1 && state.day % 5 === 0 && state.day !== lastAutoSaveDay.current) {
      lastAutoSaveDay.current = state.day;
      saveGame({
        gameState: state as unknown as Record<string, unknown>,
        daysSurvived: state.day,
        score: state.score,
        isAutosave: true,
      }).catch(() => {});
    }
  }, [state?.day, state?.phase]);

  // Audio: start/stop BGM when entering/leaving game
  useEffect(() => {
    if (screen === 'game') {
      const audio = getAudio();
      audio.startBGM();
      return () => audio.stopBGM();
    }
  }, [screen]);

  // Audio: adjust wind intensity based on temperature
  useEffect(() => {
    if (state && screen === 'game') {
      getAudio().setWindIntensity(state.globalTemperature);
    }
  }, [state?.globalTemperature, screen]);

  // Audio: play SFX on day advance
  useEffect(() => {
    if (!state || state.day <= 1) return;
    if (state.day !== prevDayRef.current && prevDayRef.current > 0) {
      getAudio().playSfx('dayAdvance');
    }
  }, [state?.day]);

  // Audio: play SFX on events
  useEffect(() => {
    if (state?.pendingEvent) {
      getAudio().playSfx('event');
    }
  }, [state?.pendingEvent]);

  // Audio: play SFX on game over / victory
  useEffect(() => {
    if (state?.phase === 'victory') getAudio().playSfx('victory');
    if (state?.phase === 'game_over') getAudio().playSfx('defeat');
  }, [state?.phase]);

  // Day transition flash effect
  useEffect(() => {
    if (!state || state.day <= 1) return;
    if (state.day !== prevDayRef.current && prevDayRef.current > 0) {
      setDayFlash(true);
      const t = setTimeout(() => setDayFlash(false), 600);
      return () => clearTimeout(t);
    }
    prevDayRef.current = state.day;
  }, [state?.day]);
  // Keep prevDayRef in sync (also handles initial)
  useEffect(() => {
    if (state) prevDayRef.current = state.day;
  }, [state?.day]);

  // Keyboard shortcuts
  useEffect(() => {
    if (screen !== 'game' || !state) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          // End Day — only when playing and no pending event/modal
          if (state.phase === 'playing' && !state.pendingEvent && !showSaveLoad && !showTutorial) {
            e.preventDefault();
            dispatch({ type: 'END_DAY' });
          }
          break;
        case 'Escape':
          // Cancel building placement, close save/load, or close tutorial
          if (showTutorial) {
            setShowTutorial(false);
          } else if (showSaveLoad) {
            setShowSaveLoad(false);
          } else if (state.selectedBuildingType) {
            dispatch({ type: 'SELECT_BUILDING_TYPE', buildingType: null });
          }
          break;
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowSaveLoad(true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, state?.phase, state?.pendingEvent, state?.selectedBuildingType, showSaveLoad, showTutorial]);

  const handleNewGame = useCallback((difficulty: Difficulty) => {
    dispatch({ type: 'NEW_GAME', difficulty });
    lastAutoSaveDay.current = 0;
    prevDayRef.current = 0;
    setScreen('game');
    // Show tutorial on first game (check localStorage)
    try {
      if (!localStorage.getItem('frostland_tutorial_seen')) {
        setShowTutorial(true);
        localStorage.setItem('frostland_tutorial_seen', '1');
      }
    } catch {}
  }, []);

  const handleQuit = useCallback(() => {
    setScreen('menu');
  }, []);

  const handleLeaderboard = useCallback(async () => {
    setScreen('leaderboard');
    setLbLoading(true);
    try {
      const data = await getGameLeaderboard(20);
      setLeaderboard(data);
    } catch {
      setLeaderboard([]);
    }
    setLbLoading(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a1628]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onShowHistory={() => {}}
        userName={userName}
      />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Menu Screen */}
        {screen === 'menu' && (
          <GameMenu
            locale={locale}
            onNewGame={handleNewGame}
            onLeaderboard={handleLeaderboard}
          />
        )}

        {/* Leaderboard Screen */}
        {screen === 'leaderboard' && (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0a1628] px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <Trophy size={22} className="text-amber-400/80" />
            </div>
            <h2 className="text-lg font-bold tracking-wider text-slate-200">{zh ? '排行榜' : 'LEADERBOARD'}</h2>

            {lbLoading ? (
              <p className="text-sm text-slate-600">{zh ? '加载中...' : 'Loading...'}</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-slate-600">
                {zh ? '暂无记录。成为第一个完成游戏的人！' : 'No entries yet. Be the first to complete a game!'}
              </p>
            ) : (
              <div className="w-full max-w-md space-y-1.5">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="frostpunk-panel flex items-center gap-3 p-3"
                  >
                    <span
                      className={`w-7 text-center font-mono text-lg font-bold ${
                        i === 0
                          ? 'text-amber-400/80'
                          : i === 1
                            ? 'text-slate-400'
                            : i === 2
                              ? 'text-orange-400/70'
                              : 'text-slate-600'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-slate-300">
                        {entry.user.name}
                      </span>
                      <div className="text-[10px] text-slate-600">
                        {zh ? '第' : 'Day'} {entry.daysSurvived}
                      </div>
                    </div>
                    <span className="font-mono text-lg font-bold text-amber-300/80">
                      {entry.score}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setScreen('menu')}
              className="mt-2 rounded-lg bg-slate-800/40 px-5 py-2 text-sm text-slate-400 ring-1 ring-slate-700/50 transition hover:bg-slate-700/40 hover:text-slate-300"
            >
              {zh ? '返回' : 'Back'}
            </button>
          </div>
        )}

        {/* Game Screen */}
        {screen === 'game' && state && (
          <>
            {/* Day transition flash overlay */}
            {dayFlash && (
              <div className="pointer-events-none absolute inset-0 z-30 bg-white/30 animate-[day-flash_0.6s_ease-out_forwards]" />
            )}

            {/* HUD - Top */}
            <div className="absolute left-0 right-0 top-0 z-10 p-3">
              <GameHUD state={state} locale={locale} />
            </div>

            {/* Canvas - Center */}
            <div className="flex-1">
              <GameCanvas state={state} dispatch={dispatch} />
            </div>

            {/* Stats Panel - Left */}
            <StatsPanel state={state} locale={locale} />

            {/* Build Panel - Right */}
            <div className="absolute right-3 top-16 z-10">
              <BuildPanel state={state} dispatch={dispatch} locale={locale} />
            </div>

            {/* Building Info - Bottom Left */}
            <BuildingInfo state={state} dispatch={dispatch} locale={locale} />

            {/* Log Panel - Bottom Center */}
            <div className="absolute bottom-3 left-1/2 z-10 w-full max-w-md -translate-x-1/2 lg:max-w-lg">
              <LogPanel state={state} locale={locale} />
            </div>

            {/* Action Buttons - Bottom Right */}
            <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
              <button
                onClick={() => {
                  const muted = getAudio().toggleMute();
                  setAudioMuted(muted);
                }}
                className="frostpunk-panel flex items-center gap-1.5 !rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                title={zh ? (audioMuted ? '取消静音' : '静音') : (audioMuted ? 'Unmute' : 'Mute')}
              >
                {audioMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className="frostpunk-panel flex items-center gap-1.5 !rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                title={zh ? '帮助' : 'How to Play'}
              >
                <HelpCircle size={13} />
              </button>
              <button
                onClick={handleQuit}
                className="frostpunk-panel flex items-center gap-1.5 !rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                title={zh ? '返回菜单' : 'Quit to Menu'}
              >
                <Home size={13} />
              </button>
              <button
                onClick={() => setShowSaveLoad(true)}
                className="frostpunk-panel flex items-center gap-1.5 !rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                title={zh ? '存档 (Ctrl+S)' : 'Save/Load (Ctrl+S)'}
              >
                <Save size={13} />
              </button>
              <button
                onClick={() => {
                  getAudio().playSfx('click');
                  dispatch({ type: 'END_DAY' });
                }}
                disabled={state.phase !== 'playing' || !!state.pendingEvent}
                className={`flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium tracking-wide text-blue-200 shadow-lg ring-1 ring-blue-400/20 transition-all hover:bg-[#254a75] disabled:cursor-not-allowed disabled:opacity-40 ${
                  state.phase === 'playing' && !state.pendingEvent
                    ? 'animate-[pulse-glow_2.5s_ease-in-out_infinite]'
                    : ''
                }`}
              >
                <SkipForward size={15} />
                {zh ? '结束今天' : 'End Day'}
                <span className="hidden text-[10px] text-blue-300/50 sm:inline">[Enter]</span>
              </button>
            </div>

            {/* Event Modal */}
            <EventModal state={state} dispatch={dispatch} locale={locale} />

            {/* Game Over Modal */}
            <GameOverModal
              state={state}
              dispatch={dispatch}
              locale={locale}
              onQuit={handleQuit}
            />

            {/* Save/Load Panel */}
            {showSaveLoad && (
              <SaveLoadPanel
                state={state}
                dispatch={dispatch}
                locale={locale}
                onClose={() => setShowSaveLoad(false)}
              />
            )}

            {/* Tutorial Overlay */}
            {showTutorial && (
              <TutorialOverlay
                locale={locale}
                onClose={() => setShowTutorial(false)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
