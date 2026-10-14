/**
 * 资产笔记领域层（IndexedDB）
 *
 * 唯一通过 idb.ts 读写 notes store 的入口。
 */

import type { AssetTypes } from '@/types/asset';
import type { AssetNote } from '@/types/note';
import { buildNoteKey } from '@/types/note';
import { openDb, idbGet, idbPut, idbDelete } from '@/utils/idb';

const DB_NAME = 'crypto-tracker';
const DB_VERSION = 1;
const STORE_NOTES = 'notes';

function openNotesDb(): Promise<IDBDatabase> {
  return openDb(DB_NAME, DB_VERSION, db => {
    if (!db.objectStoreNames.contains(STORE_NOTES)) {
      db.createObjectStore(STORE_NOTES, { keyPath: 'key' });
    }
  });
}

export async function getAssetNote(category: AssetTypes, symbol: string): Promise<AssetNote | undefined> {
  const db = await openNotesDb();
  const key = buildNoteKey(category, symbol);
  return idbGet<AssetNote>(db, STORE_NOTES, key);
}

export async function setAssetNote(
  category: AssetTypes,
  symbol: string,
  content: string
): Promise<AssetNote> {
  const db = await openNotesDb();
  const note: AssetNote = {
    key: buildNoteKey(category, symbol),
    category,
    symbol: symbol.toUpperCase(),
    content,
    updatedAt: Date.now()
  };
  await idbPut(db, STORE_NOTES, note);
  return note;
}

export async function deleteAssetNote(category: AssetTypes, symbol: string): Promise<void> {
  const db = await openNotesDb();
  await idbDelete(db, STORE_NOTES, buildNoteKey(category, symbol));
}
