/**
 * Gerenciador de Armazenamento Local no Celular (IndexedDB)
 * Arquitetura Local-First para alta performance e suporte offline total.
 */

export interface SyncTask {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: any;
  timestamp: number;
  tentativas: number;
}

const DB_NAME = 'ErpPdvManuLocalDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openLocalDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB só funciona no cliente'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('produtos')) {
        db.createObjectStore('produtos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categorias')) {
        db.createObjectStore('categorias', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('insumos')) {
        db.createObjectStore('insumos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('clientes')) {
        db.createObjectStore('clientes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pedidos')) {
        db.createObjectStore('pedidos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('configuracoes')) {
        db.createObjectStore('configuracoes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Salva múltiplos itens em uma collection local (substitui ou atualiza)
 */
export async function salvarItensLocais<T>(storeName: string, itens: T[]): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const item of itens) {
      store.put(item);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`Erro ao salvar itens locais em ${storeName}:`, err);
  }
}

/**
 * Salva ou atualiza um item específico
 */
export async function salvarItemLocal<T>(storeName: string, item: T): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`Erro ao salvar item local em ${storeName}:`, err);
  }
}

/**
 * Recupera todos os itens de uma tabela local
 */
export async function obterItensLocais<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`Erro ao ler itens locais de ${storeName}:`, err);
    return [];
  }
}

/**
 * Remove um item pelo ID
 */
export async function removerItemLocal(storeName: string, id: string): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`Erro ao remover item local em ${storeName}:`, err);
  }
}

// =================== FILA DE SINCRONIZAÇÃO (OUTBOX) ===================

/**
 * Adiciona uma ação de criação/edição/exclusão na fila para envio à nuvem
 */
export async function enfileirarSincronizacao(task: Omit<SyncTask, 'id' | 'timestamp' | 'tentativas'>): Promise<SyncTask> {
  const fullTask: SyncTask = {
    ...task,
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    tentativas: 0,
  };

  try {
    const db = await openLocalDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    store.add(fullTask);

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Erro ao enfileirar tarefa de sincronização:', err);
  }

  return fullTask;
}

/**
 * Obtém tarefas pendentes na fila
 */
export async function obterFilaSincronizacao(): Promise<SyncTask[]> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Erro ao obter fila de sincronização:', err);
    return [];
  }
}

/**
 * Remove uma tarefa concluída da fila
 */
export async function removerDaFila(id: string): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    store.delete(id);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`Erro ao remover da fila ${id}:`, err);
  }
}
