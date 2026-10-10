import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const metrics = getDashboardMetrics(lojaId);
    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao obter métricas do dashboard' }, { status: 500 });
  }
}
