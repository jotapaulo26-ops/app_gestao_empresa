import { apiFetch } from './api';
import {
  obterFilaSincronizacao,
  removerDaFila,
  atualizarTentativaNaFila,
  limparFilaSincronizacao,
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
        this.atualizarContadorPendentes();
      });

      window.addEventListener('offline', () => {
        this.status = 'OFFLINE';
        this.notificar();
      });

      // Checa pendências locais na inicialização sem disparar sincronização automática
      setTimeout(() => {
        this.atualizarContadorPendentes();
      }, 1000);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.atualizarContadorPendentes();
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async atualizarContadorPendentes(): Promise<number> {
    if (typeof window === 'undefined') return 0;
    try {
      const fila = await obterFilaSincronizacao();
      if (!navigator.onLine) {
        this.status = 'OFFLINE';
      } else if (fila.length > 0) {
        this.status = 'PENDENTE';
      } else {
        this.status = 'SINCRONIZADO';
      }
      this.notificar(fila.length);
      return fila.length;
    } catch {
      return 0;
    }
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

          // 1. Sucesso na operação (200, 201) ou se for DELETE de item já inexistente (404)
          if (
            res.ok ||
            res.status === 200 ||
            res.status === 201 ||
            (tarefa.method === 'DELETE' && res.status === 404)
          ) {
            await removerDaFila(tarefa.id);
            continue;
          }

          // 2. Erros definitivos do cliente (400, 401, 403, 404, 422)
          // Não adianta tentar infinitamente, descarta para não travar a fila da nuvem
          if (res.status >= 400 && res.status < 500) {
            console.warn(`Tarefa descartada por erro definitivo (${res.status}):`, tarefa.endpoint);
            await removerDaFila(tarefa.id);
            continue;
          }

          // 3. Erros de servidor (500, 502, 503) - tenta até 3 vezes
          const tentativas = (tarefa.tentativas || 0) + 1;
          if (tentativas >= 3) {
            console.warn(`Tarefa descartada após ${tentativas} tentativas:`, tarefa.endpoint);
            await removerDaFila(tarefa.id);
          } else {
            await atualizarTentativaNaFila(tarefa.id, tentativas);
          }
        } catch (err) {
          console.warn('Erro de rede ao sincronizar tarefa:', err);
          // Falha de rede real - interrompe o lote atual e aguarda reconexão
          break;
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
      console.error('Erro geral no processador de sincronização:', err);
      this.status = 'PENDENTE';
      this.notificar(fila.length);
    } finally {
      this.processando = false;
    }
  }

  public forcarSincronizacao(): Promise<void> {
    return this.processarFila();
  }

  public async limparFila(): Promise<void> {
    await limparFilaSincronizacao();
    this.status = 'SINCRONIZADO';
    this.notificar(0);
  }
}

export const syncService = new SyncService();
