import { useState, useEffect, useRef, useCallback } from 'react';
import type { AssetTypes } from '@/types/asset';
import { buildNoteKey } from '@/types/note';
import { getAssetNote, setAssetNote } from '@/utils/notesDb';

export type NoteSavedStatus = 'saved' | 'unsaved' | 'saving';

const DEBOUNCE_MS = 1500;

/**
 * 按 category:SYMBOL 加载 / 防抖写入资产笔记。
 * 切换资产时取消未完成的防抖保存，避免旧内容写到新 key。
 */
export function useAssetNote(category: AssetTypes, symbol: string) {
  const [content, setContent] = useState('');
  const [savedStatus, setSavedStatus] = useState<NoteSavedStatus>('saved');
  const [savedTime, setSavedTime] = useState('Just now');

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeKeyRef = useRef(buildNoteKey(category, symbol));
  const noteKey = buildNoteKey(category, symbol);

  // 切换资产：清防抖、加载对应笔记
  useEffect(() => {
    let cancelled = false;
    activeKeyRef.current = noteKey;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setContent('');
    setSavedStatus('saved');
    setSavedTime('Just now');

    getAssetNote(category, symbol).then(note => {
      if (cancelled || activeKeyRef.current !== noteKey) return;
      setContent(note?.content ?? '');
      setSavedStatus('saved');
      if (note?.updatedAt) {
        setSavedTime(formatSavedTime(note.updatedAt));
      }
    });

    return () => {
      cancelled = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [noteKey, category, symbol]);

  const handleChange = useCallback(
    (val: string) => {
      setContent(val);
      setSavedStatus('unsaved');

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const saveCategory = category;
      const saveSymbol = symbol;
      const saveKey = buildNoteKey(saveCategory, saveSymbol);

      saveTimerRef.current = setTimeout(() => {
        setSavedStatus('saving');
        setAssetNote(saveCategory, saveSymbol, val)
          .then(note => {
            if (activeKeyRef.current !== saveKey) return;
            setSavedStatus('saved');
            setSavedTime(formatSavedTime(note.updatedAt));
          })
          .catch(() => {
            if (activeKeyRef.current !== saveKey) return;
            setSavedStatus('unsaved');
          });
      }, DEBOUNCE_MS);
    },
    [category, symbol]
  );

  return { content, savedStatus, savedTime, handleChange };
}

function formatSavedTime(updatedAt: number): string {
  const diff = Date.now() - updatedAt;
  if (diff < 60_000) return 'Just now';
  return new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
