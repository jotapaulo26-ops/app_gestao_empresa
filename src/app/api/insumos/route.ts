import { NextResponse } from 'next/server';
import { getInsumos, saveInsumo, deleteInsumo } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function GET(request: Request) {
  const lojaId = extrairLojaId(request) || undefined;
  const insumos = getInsumos(lojaId);
  return NextResponse.json(insumos);
}

export async function POST(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const data = await request.json();
    if (!data.nome?.trim()) {
      return NextResponse.json({ error: 'O nome do insumo é obrigatório.' }, { status: 400 });
    }
    const insumo = saveInsumo({
      ...data,
      custoUnitario: Number(data.custoUnitario) || 0,
      estoqueAtual: Number(data.estoqueAtual) || 0,
      estoqueMinimo: Number(data.estoqueMinimo) || 0,
    }, lojaId);
    return NextResponse.json(insumo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar insumo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do insumo não informado.' }, { status: 400 });
    }
    const result = deleteInsumo(id, lojaId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir insumo' }, { status: 500 });
  }
}
