import { NextResponse } from 'next/server';
import { autenticarUsuario } from '@/lib/db';
import { hashSenha } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, senha } = body;

    if (!email?.trim() || !senha) {
      return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
    }

    const senhaHash = hashSenha(senha);
    const result = autenticarUsuario({
      email,
      senhaHash,
    });

    if (!result.success || !result.usuario || !result.token) {
      return NextResponse.json({ error: result.error || 'Credenciais inválidas.' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      usuario: {
        id: result.usuario.id,
        nome: result.usuario.nome,
        email: result.usuario.email,
        lojaId: result.usuario.lojaId,
        nomeLoja: result.usuario.nomeLoja,
      },
      token: result.token,
      lojaId: result.usuario.lojaId,
    });

    response.cookies.set('erp_sessao_token', result.token, {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30, // 30 dias (sessão persistente)
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno no login.' }, { status: 500 });
  }
}
