import { NextResponse } from 'next/server';
import { getCategorias, saveCategoria, deleteCategoria } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function GET(request: Request) {
  const lojaId = extrairLojaId(request) || undefined;
  const categorias = getCategorias(lojaId);
  return NextResponse.json(categorias);
}

export async function POST(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const data = await request.json();
    if (!data.nome?.trim()) {
      return NextResponse.json({ error: 'O nome da categoria é obrigatório.' }, { status: 400 });
    }
    const categoria = saveCategoria(data, lojaId);
    return NextResponse.json(categoria);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar categoria' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID da categoria não informado.' }, { status: 400 });
    }
    const cascade = searchParams.get('cascade') === 'true';
    const result = deleteCategoria(id, cascade, lojaId);
    if (!result.success) {
      return NextResponse.json({
        error: result.error,
        temProdutos: true,
        deletedProductsCount: result.deletedProductsCount,
      }, { status: 400 });
    }
    return NextResponse.json({ success: true, deletedProductsCount: result.deletedProductsCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir categoria' }, { status: 500 });
  }
}
