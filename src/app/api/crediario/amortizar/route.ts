import { NextResponse } from 'next/server';
import { amortizarCrediario, getPagamentosCrediario } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function GET(request: Request) {
  const lojaId = extrairLojaId(request) || undefined;
  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get('clienteId') || undefined;
  const pagamentos = getPagamentosCrediario(clienteId, lojaId);
  return NextResponse.json(pagamentos);
}

export async function POST(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const data = await request.json();
    const { clienteId, valor, formaPagamento, observacao } = data;
    if (!clienteId) {
      return NextResponse.json({ error: 'Cliente é obrigatório.' }, { status: 400 });
    }
    if (!valor || Number(valor) <= 0) {
      return NextResponse.json({ error: 'Valor deve ser maior que zero.' }, { status: 400 });
    }
    const result = amortizarCrediario(clienteId, Number(valor), formaPagamento || 'PIX', observacao, lojaId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao amortizar crediário' }, { status: 500 });
  }
}
