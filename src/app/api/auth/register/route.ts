import { NextResponse } from 'next/server';
import { cadastrarUsuario } from '@/lib/db';
import { hashSenha } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, nomeLoja, email, senha } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Informe o seu nome completo.' }, { status: 400 });
    }
    if (!nomeLoja?.trim()) {
      return NextResponse.json({ error: 'Informe o nome da sua loja.' }, { status: 400 });
    }
    if (!email?.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
    }
    if (!senha || senha.length < 4) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 4 caracteres.' }, { status: 400 });
    }

    const senhaHash = hashSenha(senha);
    const result = cadastrarUsuario({
      nome,
      nomeLoja,
      email,
      senhaHash,
    });

    if (!result.success || !result.usuario || !result.token) {
      return NextResponse.json({ error: result.error || 'Erro ao realizar cadastro.' }, { status: 400 });
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

    // Seta cookie httpOnly ou acessível para persistência no navegador
    response.cookies.set('erp_sessao_token', result.token, {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno no cadastro.' }, { status: 500 });
  }
}
