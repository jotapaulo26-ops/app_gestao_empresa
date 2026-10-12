import { NextResponse } from 'next/server';
import { getConfiguracaoLoja, saveConfiguracaoLoja } from '@/lib/db';
import { extrairLojaId } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: Request) {
  const lojaId = extrairLojaId(request) || undefined;
  const config = getConfiguracaoLoja(lojaId);
  return NextResponse.json(config, { headers: NO_CACHE_HEADERS });
}

export async function POST(request: Request) {
  try {
    const lojaId = extrairLojaId(request) || undefined;
    const data = await request.json();
    const config = saveConfiguracaoLoja(data, lojaId);
    return NextResponse.json(config, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar configurações' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
