/**
 * Wrapper de fetch que injeta automaticamente os headers de autenticação
 * da loja (x-loja-id e Authorization) salvos no navegador do celular.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});

  if (typeof window !== 'undefined') {
    const lojaId = localStorage.getItem('erp_usuario_loja_id');
    const token = localStorage.getItem('erp_usuario_token');

    if (lojaId && !headers.has('x-loja-id')) {
      headers.set('x-loja-id', lojaId);
    }
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}
