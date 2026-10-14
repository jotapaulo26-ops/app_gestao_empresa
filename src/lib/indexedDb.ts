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
const DB_VERSION = 3; // Versão 3 com pagamentosCrediario

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
        const stores = [
          'produtos',
          'categorias',
          'insumos',
          'clientes',
          'pedidos',
          'configuracoes',
          'syncQueue',
          'pagamentosCrediario',
        ];

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
    const stores = ['produtos', 'categorias', 'insumos', 'clientes', 'pedidos', 'configuracoes', 'pagamentosCrediario'];
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

/**
 * Exporta todos os dados salvos no aparelho como um objeto JSON estruturado
 */
export async function exportarBackupCompleto(): Promise<{
  versao: string;
  dataExportacao: string;
  lojaId: string;
  configuracoes: any[];
  categorias: any[];
  insumos: any[];
  produtos: any[];
  clientes: any[];
  pedidos: any[];
  pagamentosCrediario: any[];
  localSettings?: Record<string, string | null>;
}> {
  const [configuracoes, categorias, insumos, produtos, clientes, pedidos, pagamentosCrediario] = await Promise.all([
    obterItensLocais('configuracoes'),
    obterItensLocais('categorias'),
    obterItensLocais('insumos'),
    obterItensLocais('produtos'),
    obterItensLocais('clientes'),
    obterItensLocais('pedidos'),
    obterItensLocais('pagamentosCrediario'),
  ]);

  const lojaId = typeof window !== 'undefined' ? (localStorage.getItem('erp_usuario_loja_id') || 'LOJA-LOCAL') : 'LOJA-LOCAL';

  const localSettings: Record<string, string | null> = {};
  if (typeof window !== 'undefined') {
    localSettings['erp_loja_config'] = localStorage.getItem('erp_loja_config');
    localSettings['calc_gas_presets'] = localStorage.getItem('calc_gas_presets');
    localSettings['calc_eletrica_maquinas'] = localStorage.getItem('calc_eletrica_maquinas');
    localSettings['calc_eletrica_tarifa_kwh'] = localStorage.getItem('calc_eletrica_tarifa_kwh');
  }

  return {
    versao: '3.0-offline',
    dataExportacao: new Date().toISOString(),
    lojaId,
    configuracoes,
    categorias,
    insumos,
    produtos,
    clientes,
    pedidos,
    pagamentosCrediario,
    localSettings,
  };
}

/**
 * Importa um arquivo de backup JSON no banco do aparelho
 */
export async function importarBackupCompleto(backup: any): Promise<boolean> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Arquivo de backup inválido.');
  }

  // 1. Limpa o banco atual
  await limparTodosOsDadosLocais();

  // 2. Restaura coleções
  if (Array.isArray(backup.categorias) && backup.categorias.length > 0) {
    await salvarItensLocais('categorias', backup.categorias);
  }
  if (Array.isArray(backup.insumos) && backup.insumos.length > 0) {
    await salvarItensLocais('insumos', backup.insumos);
  }
  if (Array.isArray(backup.produtos) && backup.produtos.length > 0) {
    await salvarItensLocais('produtos', backup.produtos);
  }
  if (Array.isArray(backup.clientes) && backup.clientes.length > 0) {
    await salvarItensLocais('clientes', backup.clientes);
  }
  if (Array.isArray(backup.pedidos) && backup.pedidos.length > 0) {
    await salvarItensLocais('pedidos', backup.pedidos);
  }
  if (Array.isArray(backup.pagamentosCrediario) && backup.pagamentosCrediario.length > 0) {
    await salvarItensLocais('pagamentosCrediario', backup.pagamentosCrediario);
  }
  if (Array.isArray(backup.configuracoes) && backup.configuracoes.length > 0) {
    await salvarItensLocais('configuracoes', backup.configuracoes);
    const cfg = backup.configuracoes.find((c: any) => c.id === 'loja-config') || backup.configuracoes[0];
    if (cfg && typeof window !== 'undefined') {
      try {
        localStorage.setItem('erp_loja_config', JSON.stringify(cfg));
      } catch {}
    }
  }

  if (backup.localSettings && typeof window !== 'undefined') {
    for (const [key, val] of Object.entries(backup.localSettings)) {
      if (val !== null && typeof val === 'string') {
        localStorage.setItem(key, val);
      }
    }
  }

  if (backup.lojaId && typeof window !== 'undefined') {
    localStorage.setItem('erp_usuario_loja_id', backup.lojaId);
    localStorage.setItem('erp_loja_codigo', backup.lojaId);
  }

  return true;
}


