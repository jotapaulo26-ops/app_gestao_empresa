import { NextResponse } from 'next/server';
import { getUsuarioByToken } from '@/lib/db';

export async function GET(request: Request) {
  try {
    let token = '';

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/erp_sessao_token=([^;]+)/);
      if (match && match[1]) {
        token = match[1];
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Nenhuma sessão ativa.' }, { status: 401 });
    }

    const sessionData = getUsuarioByToken(token);
    if (!sessionData) {
      return NextResponse.json({ error: 'Sessão expirada ou inválida.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      usuario: {
        id: sessionData.usuario.id,
        nome: sessionData.usuario.nome,
        email: sessionData.usuario.email,
        lojaId: sessionData.usuario.lojaId,
        nomeLoja: sessionData.usuario.nomeLoja,
      },
      lojaId: sessionData.usuario.lojaId,
      nomeLoja: sessionData.loja.nomeLoja,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao validar sessão.' }, { status: 500 });
  }
}
