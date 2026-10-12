import crypto from 'crypto';
import { getLojaIdByToken, getLoja } from './db';

const SALT = 'manu_erp_security_salt_2026';

/**
 * Cria um hash SHA-256 seguro com salt para senhas.
 */
export function hashSenha(senha: string): string {
  return crypto.createHash('sha256').update(senha + SALT).digest('hex');
}

/**
 * Gera um token de sessão seguro e aleatório.
 */
export function gerarTokenSessao(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Extrai o ID da loja a partir do Request HTTP:
 * 1. Header `x-loja-id`
 * 2. Header `Authorization: Bearer <token>`
 * 3. Cookie `erp_sessao_token`
 * 4. Fallback: Loja local padrão
 */
export function extrairLojaId(request: Request): string {
  // 1. Header direto x-loja-id
  const headerLojaId = request.headers.get('x-loja-id');
  if (headerLojaId && headerLojaId.trim()) {
    return headerLojaId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
  }

  // 2. Token no header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const lojaId = getLojaIdByToken(token);
    if (lojaId) return lojaId;
  }

  // 3. Cookie de sessão
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/erp_sessao_token=([^;]+)/);
  if (match && match[1]) {
    const lojaId = getLojaIdByToken(match[1]);
    if (lojaId) return lojaId;
  }

  // 4. Query param
  try {
    const url = new URL(request.url);
    const paramLojaId = url.searchParams.get('lojaId');
    if (paramLojaId) return paramLojaId;
  } catch {}

  // 5. Fallback automático para a loja do disco local
  const loja = getLoja();
  return loja.id;
}
