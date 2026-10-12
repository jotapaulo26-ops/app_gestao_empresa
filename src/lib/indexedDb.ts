/**
 * Gerenciador de Armazenamento Local no Celular (IndexedDB)
 * Arquitetura Local-First para alta performance e suporte offline total.
 */

export interface SyncTask {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  timestamp: number;
  tentativas: number;
}

const DB_NAME = 'ErpPdvManuLocalDB';
const DB_VERSION = 2; // Versão 2 para garantir criação de todas as objectStores

let dbPromise: Promise<IDBDatabase> | null = null;

export function openLocalDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB não suportado'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const stores = ['produtos', 'categorias', 'insumos', 'clientes', 'pedidos', 'configuracoes', 'syncQueue'];

        for (const st of stores) {
          if (!db.objectStoreNames.contains(st)) {
            db.createObjectStore(st, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('IndexedDB bloqueado por outra aba aberta');
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

/**
 * Salva múltiplos itens em uma collection local (substitui ou atualiza)
 */
export async function salvarItensLocais<T>(storeName: string, itens: T[]): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openLocalDB();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`ObjectStore ${storeName} não existe ainda.`);
      return;
    }

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
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openLocalDB();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`ObjectStore ${storeName} não existe ainda.`);
      return;
    }

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
    if (typeof window === 'undefined' || !window.indexedDB) return [];
    const db = await openLocalDB();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`ObjectStore ${storeName} não encontrado no IndexedDB local.`);
      return [];
    }

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
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openLocalDB();
    if (!db.objectStoreNames.contains(storeName)) return;

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
    if (typeof window === 'undefined' || !window.indexedDB) return fullTask;
    const db = await openLocalDB();
    if (!db.objectStoreNames.contains('syncQueue')) return fullTask;

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
    if (typeof window === 'undefined' || !window.indexedDB) return [];
    const db = await openLocalDB();
    if (!db.objectStoreNames.contains('syncQueue')) return [];

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
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openLocalDB();
    if (!db.objectStoreNames.contains('syncQueue')) return;

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

/**
 * Atualiza o número de tentativas de uma tarefa
 */
export async function atualizarTentativaNaFila(id: string, tentativas: number): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openLocalDB();
    if (!db.objectStoreNames.contains('syncQueue')) return;

    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      if (getReq.result) {
        const item = getReq.result;
        item.tentativas = tentativas;
        store.put(item);
      }
    };
  } catch (err) {
    console.warn(`Erro ao atualizar tentativas da fila ${id}:`, err);
  }
}

/**
 * Limpa completamente a fila de sincronização (destrava fila em loop)
 */
export async function limparFilaSincronizacao(): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openLocalDB();
    if (!db.objectStoreNames.contains('syncQueue')) return;

    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    store.clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Erro ao limpar fila de sincronização:', err);
  }
}

/**
 * Limpa todos os dados locais do IndexedDB para trocar de loja sem misturar
 */
export async function limparTodosOsDadosLocais(): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    const db = await openLocalDB();
    const stores = ['produtos', 'categorias', 'insumos', 'clientes', 'pedidos', 'configuracoes'];
    for (const st of stores) {
      if (db.objectStoreNames.contains(st)) {
        const tx = db.transaction(st, 'readwrite');
        tx.objectStore(st).clear();
      }
    }
  } catch (err) {
    console.warn('Erro ao limpar dados locais do IndexedDB:', err);
  }
}

