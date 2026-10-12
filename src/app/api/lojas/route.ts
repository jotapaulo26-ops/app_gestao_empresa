import { NextResponse } from 'next/server';
import { getOrCreateLoja, getLoja } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const codigo = url.searchParams.get('codigo');
    if (!codigo) {
      return NextResponse.json({ error: 'Código não informado' }, { status: 400 });
    }

    const cleanCodigo = codigo.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');
    const loja = getLoja(cleanCodigo);
    return NextResponse.json({
      success: true,
      loja: {
        id: loja.id,
        nomeLoja: loja.nomeLoja,
        criadoEm: loja.criadoEm,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao consultar loja' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codigoLoja, nomeLoja } = body;

    if (!codigoLoja && !nomeLoja) {
      return NextResponse.json({ error: 'Informe ao menos o nome ou código da loja' }, { status: 400 });
    }

    const idFinal = (codigoLoja || nomeLoja || 'LOJA-NOVA')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '-');

    const loja = getOrCreateLoja(idFinal, nomeLoja || idFinal);

    return NextResponse.json({
      success: true,
      loja: {
        id: loja.id,
        nomeLoja: loja.nomeLoja,
        criadoEm: loja.criadoEm,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao registrar loja' }, { status: 500 });
  }
}
