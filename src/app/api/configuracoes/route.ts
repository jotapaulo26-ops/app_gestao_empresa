import { NextResponse } from 'next/server';
import { getConfiguracaoLoja, saveConfiguracaoLoja } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export async function GET(request: Request) {
  const lojaId = extrairLojaId(request) || undefined;
  const config = getConfiguracaoLoja(lojaId);
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const data = await request.json();
    const config = saveConfiguracaoLoja(data, lojaId);
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar configurações' }, { status: 500 });
  }
}
