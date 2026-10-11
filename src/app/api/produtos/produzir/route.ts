import { NextResponse } from 'next/server';
import { produzirLoteProduto } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const body = await request.json();
    const { produtoId, quantidadeLotes = 1 } = body;

    if (!produtoId) {
      return NextResponse.json({ error: 'Informe o ID do produto.' }, { status: 400 });
    }

    const result = produzirLoteProduto(produtoId, quantidadeLotes, lojaId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao produzir lote' }, { status: 500 });
  }
}
