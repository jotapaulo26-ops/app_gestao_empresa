import { NextResponse } from 'next/server';
import { getClientes, saveCliente, deleteCliente } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function GET(request: Request) {
  const lojaId = extrairLojaId(request) || undefined;
  const clientes = getClientes(lojaId);
  return NextResponse.json(clientes);
}

export async function POST(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const data = await request.json();
    if (!data.nome?.trim()) {
      return NextResponse.json({ error: 'O nome do cliente é obrigatório.' }, { status: 400 });
    }
    const cliente = saveCliente({
      ...data,
      limiteCredito: Number(data.limiteCredito) || 0,
      saldoDevedor: Number(data.saldoDevedor) || 0,
    }, lojaId);
    return NextResponse.json(cliente);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar cliente' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do cliente não informado.' }, { status: 400 });
    }
    const result = deleteCliente(id, lojaId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir cliente' }, { status: 500 });
  }
}
