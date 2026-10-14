/**
 * IndexedDB 通用访问层
 *
 * 规则：底层只暴露 open / get / put / delete，不含业务字段。
 * 领域模块（如 notesDb）通过本文件操作具体 store。
 */

type UpgradeCallback = (db: IDBDatabase, oldVersion: number, newVersion: number | null) => void;

const dbCache = new Map<string, Promise<IDBDatabase>>();

function cacheKey(name: string, version: number): string {
  return `${name}@${version}`;
}

/** 打开数据库（同 name+version 复用连接 Promise） */
export function openDb(name: string, version: number, onUpgrade: UpgradeCallback): Promise<IDBDatabase> {
  const key = cacheKey(name, version);
  const cached = dbCache.get(key);
  if (cached) return cached;

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, version);

    req.onerror = () => {
      dbCache.delete(key);
      reject(req.error ?? new Error(`IndexedDB open failed: ${name}`));
    };

    req.onupgradeneeded = () => {
      onUpgrade(req.result, req.oldVersion, req.newVersion);
    };

    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbCache.delete(key);
      };
      resolve(db);
    };
  });

  dbCache.set(key, promise);
  return promise;
}

function runStore<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = run(store);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error(`IndexedDB ${mode} failed on ${storeName}`));
  });
}

export async function idbGet<T>(
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey
): Promise<T | undefined> {
  const result = await runStore(db, storeName, 'readonly', store => store.get(key));
  return result as T | undefined;
}

export async function idbPut<T>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  await runStore(db, storeName, 'readwrite', store => store.put(value));
}

export async function idbDelete(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<void> {
  await runStore(db, storeName, 'readwrite', store => store.delete(key));
}
