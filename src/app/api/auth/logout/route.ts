import { NextResponse } from 'next/server';
import { encerrarSessao } from '@/lib/db';

export async function POST(request: Request) {
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

    if (token) {
      encerrarSessao(token);
    }

    const response = NextResponse.json({ success: true, message: 'Logout realizado com sucesso.' });
    response.cookies.delete('erp_sessao_token');
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao realizar logout.' }, { status: 500 });
  }
}
