export type StatusSincronizacao = 'SINCRONIZADO' | 'SINCRONIZANDO' | 'OFFLINE' | 'PENDENTE';

type Listener = (status: StatusSincronizacao, pendentes: number, ultimoBackup: string | null) => void;

class SyncService {
  public subscribe(listener: Listener): () => void {
    listener('SINCRONIZADO', 0, null);
    return () => {};
  }

  public async atualizarContadorPendentes(): Promise<number> {
    return 0;
  }

  public async processarFila(): Promise<void> {}

  public async forcarSincronizacao(): Promise<void> {}

  public async limparFila(): Promise<void> {}
}

export const syncService = new SyncService();
