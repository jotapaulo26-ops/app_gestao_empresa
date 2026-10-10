import { NextResponse } from 'next/server';
import { getPedidos, createPedido } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function GET(request: Request) {
  const lojaId = extrairLojaId(request) || undefined;
  const pedidos = getPedidos(lojaId);
  return NextResponse.json(pedidos);
}

export async function POST(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const data = await request.json();
    if (!data.itens || data.itens.length === 0) {
      return NextResponse.json({ error: 'O pedido deve conter pelo menos um item.' }, { status: 400 });
    }
    const result = createPedido(data, lojaId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.pedido);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao registrar pedido' }, { status: 500 });
  }
}
