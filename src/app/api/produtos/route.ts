import { NextResponse } from 'next/server';
import { getProdutos, saveProduto, deleteProduto } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function GET(request: Request) {
  const lojaId = extrairLojaId(request) || undefined;
  const produtos = getProdutos(lojaId);
  return NextResponse.json(produtos);
}

export async function POST(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const data = await request.json();
    if (!data.nome?.trim()) {
      return NextResponse.json({ error: 'O nome do produto é obrigatório.' }, { status: 400 });
    }
    const produto = saveProduto({
      ...data,
      precoVenda: Number(data.precoVenda) || 0,
      margemLucroPct: Number(data.margemLucroPct) || 0,
      custoInsumos: Number(data.custoInsumos) || 0,
      custoEmbalagem: Number(data.custoEmbalagem) || 0,
      custoMaoDeObra: Number(data.custoMaoDeObra) || 0,
      custoTotal: Number(data.custoTotal) || 0,
      estoqueAtual: Number(data.estoqueAtual) || 0,
      estoqueMinimo: Number(data.estoqueMinimo) || 0,
    }, lojaId);
    return NextResponse.json(produto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar produto' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do produto não informado.' }, { status: 400 });
    }
    const result = deleteProduto(id, lojaId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir produto' }, { status: 500 });
  }
}
