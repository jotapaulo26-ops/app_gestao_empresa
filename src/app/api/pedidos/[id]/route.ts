import { NextResponse } from 'next/server';
import { cancelPedido, updateStatusProducaoPedido } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'ID do pedido não informado.' }, { status: 400 });
    }
    const result = cancelPedido(id, lojaId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Pedido cancelado e estoque/crediário estornados com sucesso.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao cancelar pedido' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'ID do pedido não informado.' }, { status: 400 });
    }
    const body = await request.json();
    const { statusProducao } = body;
    if (!statusProducao) {
      return NextResponse.json({ error: 'statusProducao não informado.' }, { status: 400 });
    }
    const result = updateStatusProducaoPedido(id, statusProducao, lojaId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, pedido: result.pedido });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar status do pedido' }, { status: 500 });
  }
}

export const PUT = PATCH;
