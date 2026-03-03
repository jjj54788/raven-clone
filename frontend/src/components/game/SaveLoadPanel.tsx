'use client';

import { useEffect, useState } from 'react';
import { Save, Download, Trash2, X, Loader2 } from 'lucide-react';
import type { GameState, GameAction } from '@/game/types';
import {
  saveGame,
  listGameSaves,
  loadGameSave,
  deleteGameSave,
} from '@/lib/api';

interface SaveLoadPanelProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  locale: string;
  onClose: () => void;
}

interface SaveEntry {
  id: string;
  name: string;
  daysSurvived: number;
  score: number;
  isAutosave: boolean;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SaveLoadPanel({
  state,
  dispatch,
  locale,
  onClose,
}: SaveLoadPanelProps) {
  const zh = locale === 'zh';
  const [saves, setSaves] = useState<SaveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    loadSaves();
  }, []);

  async function loadSaves() {
    setLoading(true);
    try {
      const data = await listGameSaves();
      setSaves(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!state) return;
    setSaving(true);
    try {
      await saveGame({
        name: saveName || undefined,
        gameState: state as unknown as Record<string, unknown>,
        daysSurvived: state.day,
        score: state.score,
        isCompleted: state.phase === 'victory',
      });
      setSaveName('');
      await loadSaves();
    } catch {
      // ignore
    }
    setSaving(false);
  }

  async function handleLoad(id: string) {
    try {
      const data = await loadGameSave(id);
      dispatch({ type: 'LOAD_GAME', state: data.gameState as unknown as GameState });
      onClose();
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteGameSave(id);
      await loadSaves();
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="frostpunk-panel mx-4 w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">
            {zh ? '存档管理' : 'SAVE / LOAD'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-700/40 hover:text-slate-300"
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick Save */}
        {state?.phase === 'playing' && (
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={zh ? '存档名称（可选）' : 'Save name (optional)'}
              className="flex-1 rounded-md bg-slate-900/50 px-3 py-2 text-sm text-slate-200 outline-none ring-1 ring-slate-700/50 placeholder:text-slate-600 focus:ring-[#c8956b]/30"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-[#1e3a5f] px-3 py-2 text-sm text-blue-200 ring-1 ring-blue-400/20 hover:bg-[#254a75] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {zh ? '保存' : 'Save'}
            </button>
          </div>
        )}

        {/* Save List */}
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={22} className="animate-spin text-slate-600" />
            </div>
          ) : saves.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-600">
              {zh ? '暂无存档' : 'No saves yet'}
            </p>
          ) : (
            saves.map((save) => (
              <div
                key={save.id}
                className="flex items-center gap-3 rounded-lg bg-slate-900/30 p-2.5 ring-1 ring-slate-700/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-slate-300">
                      {save.name}
                    </span>
                    {save.isAutosave && (
                      <span className="rounded bg-blue-500/10 px-1.5 text-[9px] text-blue-400/70 ring-1 ring-blue-500/15">
                        auto
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-600">
                    {zh ? '第' : 'Day'} {save.daysSurvived} · {zh ? '分数' : 'Score'}{' '}
                    {save.score} ·{' '}
                    {new Date(save.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleLoad(save.id)}
                  className="rounded-md bg-slate-700/30 p-1.5 hover:bg-slate-600/30"
                  title={zh ? '载入' : 'Load'}
                >
                  <Download size={13} className="text-emerald-400/80" />
                </button>
                <button
                  onClick={() => handleDelete(save.id)}
                  className="rounded-md bg-slate-700/30 p-1.5 hover:bg-slate-600/30"
                  title={zh ? '删除' : 'Delete'}
                >
                  <Trash2 size={13} className="text-red-400/70" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
