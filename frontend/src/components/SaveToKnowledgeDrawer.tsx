'use client';

import { useEffect, useState } from 'react';
import { BookMarked, Check, Save, X } from 'lucide-react';
import { createKnowledgeNote, type KnowledgeNote } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';

interface SaveToKnowledgeDrawerProps {
  open: boolean;
  onClose: () => void;
  initialTitle: string;
  initialContent: string;
  source?: string;
  sourceUrl?: string;
  initialTags?: string[];
  onSaved?: (note: KnowledgeNote) => void;
}

export default function SaveToKnowledgeDrawer({
  open,
  onClose,
  initialTitle,
  initialContent,
  source,
  sourceUrl,
  initialTags,
  onSaved,
}: SaveToKnowledgeDrawerProps) {
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [myNotes, setMyNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields each time the drawer opens
  useEffect(() => {
    if (!open) return;
    setTitle((initialTitle || '').slice(0, 120).trim() || t('kb.untitledNote'));
    setMyNotes('');
    setTags(initialTags ?? []);
    setTagInput('');
    setSaving(false);
    setSaved(false);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC to close + lock body scroll
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleAddTag = () => {
    const val = tagInput.trim().toLowerCase();
    if (!val || tags.includes(val)) return;
    setTags((prev) => [...prev, val]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    const nextTitle = title.trim() || t('kb.untitledNote');
    const commentBlock = myNotes.trim()
      ? `\n\n---\n\n**${t('kb.myNotes')}:**\n${myNotes.trim()}`
      : '';
    const finalContent = `${initialContent}${commentBlock}`;

    setSaving(true);
    setError(null);
    try {
      const note = await createKnowledgeNote({
        title: nextTitle,
        content: finalContent,
        source: source || undefined,
        sourceUrl: sourceUrl || undefined,
        tags,
      });
      setSaved(true);
      onSaved?.(note);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(e?.message || t('kb.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onMouseDown={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md border-l border-gray-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <BookMarked size={16} className="text-purple-600" />
            <span className="text-sm font-semibold text-gray-900">{t('kb.drawerTitle')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="h-full overflow-y-auto px-4 py-4 pb-24 space-y-4">
          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 1. Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('kb.fieldTitle')}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800
                         focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>

          {/* 2. Captured content (read-only, collapsible) */}
          {initialContent && (
            <details>
              <summary className="mb-1 cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700">
                {t('kb.fieldCaptured')}
              </summary>
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-mono">
                {initialContent}
              </div>
            </details>
          )}

          {/* 3. My Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('kb.fieldMyNotes')}
            </label>
            <textarea
              value={myNotes}
              onChange={(e) => setMyNotes(e.target.value)}
              rows={4}
              placeholder={t('kb.myNotesPlaceholder')}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800
                         focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100
                         placeholder:text-gray-400"
            />
          </div>

          {/* 4. Tags */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('kb.fieldTags')}
            </label>
            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="rounded-full p-0.5 hover:text-purple-900 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder={t('kb.tagPlaceholder')}
                className="h-8 flex-1 rounded-lg border border-gray-200 px-2.5 text-xs text-gray-700
                           focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100
                           placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {t('kb.tagAdd')}
              </button>
            </div>
          </div>

          {/* Source info (read-only, shown if present) */}
          {(source || sourceUrl) && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              {source && <span className="font-medium">{source}</span>}
              {source && sourceUrl && <span className="mx-1">·</span>}
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-purple-600 hover:underline"
                >
                  {(() => {
                    try { return new URL(sourceUrl).hostname.replace(/^www\./, ''); } catch { return sourceUrl; }
                  })()}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t('kb.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white
                         hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
            >
              {saved ? <Check size={15} /> : <Save size={15} />}
              {saved ? t('kb.saved') : saving ? t('kb.saving') : t('kb.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
