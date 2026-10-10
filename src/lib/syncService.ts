import { apiFetch } from './api';
import {
  obterFilaSincronizacao,
  removerDaFila,
  SyncTask,
} from './indexedDb';

export type StatusSincronizacao = 'SINCRONIZADO' | 'SINCRONIZANDO' | 'OFFLINE' | 'PENDENTE';

type Listener = (status: StatusSincronizacao, pendentes: number, ultimoBackup: string | null) => void;

class SyncService {
  private status: StatusSincronizacao = 'SINCRONIZADO';
  private listeners: Set<Listener> = new Set();
  private processando: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private ultimoBackup: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.status = 'PENDENTE';
        this.notificar();
        this.processarFila();
      });

      window.addEventListener('offline', () => {
        this.status = 'OFFLINE';
        this.notificar();
      });

      // Checa a cada 15 segundos
      this.timer = setInterval(() => {
        this.processarFila();
      }, 15000);

      // Executa checagem inicial
      setTimeout(() => {
        this.processarFila();
      }, 1500);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status, 0, this.ultimoBackup);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notificar(pendentes: number = 0) {
    this.listeners.forEach((l) => {
      l(this.status, pendentes, this.ultimoBackup);
    });
  }

  public async processarFila(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.processando) return;

    if (!navigator.onLine) {
      this.status = 'OFFLINE';
      const fila = await obterFilaSincronizacao();
      this.notificar(fila.length);
      return;
    }

    const fila = await obterFilaSincronizacao();
    if (fila.length === 0) {
      this.status = 'SINCRONIZADO';
      this.notificar(0);
      return;
    }

    this.processando = true;
    this.status = 'SINCRONIZANDO';
    this.notificar(fila.length);

    try {
      for (const tarefa of fila) {
        try {
          const res = await apiFetch(tarefa.endpoint, {
            method: tarefa.method,
            headers: { 'Content-Type': 'application/json' },
            body: tarefa.body ? JSON.stringify(tarefa.body) : undefined,
          });

          if (res.ok || res.status === 200 || res.status === 201) {
            await removerDaFila(tarefa.id);
          } else {
            console.warn(`Tentativa de sincronização falhou (${res.status}):`, tarefa.endpoint);
          }
        } catch (err) {
          console.warn('Erro de rede ao enviar tarefa:', err);
          break; // Se deu erro de conexão, aguarda a próxima rodada
        }
      }

      const filaRestante = await obterFilaSincronizacao();
      const agora = new Date();
      this.ultimoBackup = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;

      if (filaRestante.length === 0) {
        this.status = 'SINCRONIZADO';
      } else {
        this.status = 'PENDENTE';
      }
      this.notificar(filaRestante.length);
    } catch (err) {
      console.error('Erro no processamento da fila de sincronização:', err);
      this.status = 'PENDENTE';
      this.notificar(fila.length);
    } finally {
      this.processando = false;
    }
  }

  public forcarSincronizacao(): Promise<void> {
    return this.processarFila();
  }
}

export const syncService = new SyncService();
