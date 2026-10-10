'use client';

import React, { useState, useEffect } from 'react';
import { ConfiguracaoLoja, TipoChavePix } from '@/types';
import {
  Store,
  QrCode,
  Save,
  CheckCircle2,
  FileText,
  Phone,
  MapPin,
  Building2,
  Sparkles,
} from 'lucide-react';

interface LojaConfigViewProps {
  config?: ConfiguracaoLoja;
  onRefresh: () => void;
}

export default function LojaConfigView({ config, onRefresh }: LojaConfigViewProps) {
  const [formData, setFormData] = useState<ConfiguracaoLoja>({
    nomeLoja: config?.nomeLoja || 'ERP & PDV Manu',
    cnpjCpf: config?.cnpjCpf || '',
    telefone: config?.telefone || '',
    endereco: config?.endereco || '',
    cidade: config?.cidade || 'São Paulo - SP',
    mensagemRodape: config?.mensagemRodape || 'Agradecemos a sua preferência! Volte sempre.',
    chavePix: config?.chavePix || '',
    tipoChavePix: config?.tipoChavePix || 'CELULAR',
    titularPix: config?.titularPix || '',
    cidadePix: config?.cidadePix || 'SAO PAULO',
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      setSuccessMsg('Configurações salvas com sucesso! As notas e faturas já estão atualizadas.');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Banner Principal */}
      <div className="p-4 bg-gradient-to-br from-pink-950/40 via-zinc-950 to-black rounded-3xl border border-pink-500/50 shadow-neon-pink">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-pink-400" />
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            Minha Loja & Dados da Nota
          </h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Personalize as informações da sua empresa e a chave Pix que aparecerão nos cupons e faturas em PDF.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 pb-16">
        {/* Bloco 1: Identificação da Loja */}
        <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800/90 space-y-3">
          <h3 className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> Informações Comerciais
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">
              Nome da Loja / Fantasia *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Confeitaria Manu Gourmet"
              value={formData.nomeLoja}
              onChange={(e) => setFormData({ ...formData, nomeLoja: e.target.value })}
              className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                CNPJ ou CPF
              </label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={formData.cnpjCpf}
                onChange={(e) => setFormData({ ...formData, cnpjCpf: e.target.value })}
                className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">
              Endereço Completo
            </label>
            <input
              type="text"
              placeholder="Rua, número, bairro..."
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">
              Cidade / Estado
            </label>
            <input
              type="text"
              placeholder="São Paulo - SP"
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">
              Mensagem de Rodapé da Nota / Cupom
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Obrigado pela preferência! Volte sempre."
              value={formData.mensagemRodape}
              onChange={(e) => setFormData({ ...formData, mensagemRodape: e.target.value })}
              className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {/* Bloco 2: Chave Pix para Cobranças */}
        <div className="bg-zinc-950 p-4 rounded-3xl border border-emerald-500/40 shadow-neon-green space-y-3">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <QrCode className="w-4 h-4" /> Configuração do Pix para Cobranças
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Tipo de Chave Pix
              </label>
              <select
                value={formData.tipoChavePix}
                onChange={(e) => setFormData({ ...formData, tipoChavePix: e.target.value as TipoChavePix })}
                className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold focus:outline-none"
              >
                <option value="CELULAR">Celular</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="ALEATORIA">Chave Aleatória</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Chave Pix *
              </label>
              <input
                type="text"
                required
                placeholder="Digite a chave pix"
                value={formData.chavePix}
                onChange={(e) => setFormData({ ...formData, chavePix: e.target.value })}
                className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Nome do Titular / Favorecido *
              </label>
              <input
                type="text"
                required
                placeholder="Nome cadastrado no banco"
                value={formData.titularPix}
                onChange={(e) => setFormData({ ...formData, titularPix: e.target.value })}
                className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Cidade da Conta
              </label>
              <input
                type="text"
                placeholder="SAO PAULO"
                value={formData.cidadePix}
                onChange={(e) => setFormData({ ...formData, cidadePix: e.target.value })}
                className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold uppercase focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Pré-visualização da Nota Térmica */}
        <div className="p-4 bg-white text-black rounded-3xl space-y-2 text-xs font-mono">
          <div className="text-center pb-2 border-b border-dashed border-zinc-400">
            <p className="font-black text-sm">{formData.nomeLoja || 'NOME DA SUA LOJA'}</p>
            {formData.cnpjCpf && <p className="text-[10px] text-zinc-600">Doc: {formData.cnpjCpf}</p>}
            {formData.telefone && <p className="text-[10px] text-zinc-600">WhatsApp: {formData.telefone}</p>}
            {formData.endereco && <p className="text-[10px] text-zinc-600">{formData.endereco}</p>}
          </div>

          <div className="text-[11px] py-1 text-zinc-500 text-center">
            [... itens do pedido ...]
          </div>

          <div className="pt-2 border-t border-dashed border-zinc-400 space-y-1">
            <p className="text-center text-[10px] font-bold text-zinc-700">
              {formData.mensagemRodape}
            </p>
            {formData.chavePix && (
              <div className="p-1.5 bg-zinc-100 rounded text-[10px] text-center border border-zinc-300">
                <span>Pague com Pix ({formData.tipoChavePix}): </span>
                <strong className="block font-mono text-zinc-900">{formData.chavePix}</strong>
                <span className="text-[9px] text-zinc-500">Favorecido: {formData.titularPix}</span>
              </div>
            )}
          </div>
        </div>

        {successMsg && (
          <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </p>
        )}

        {errorMsg && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-3 rounded-2xl font-bold">
            {errorMsg}
          </p>
        )}

        {/* Botão Salvar na Thumb Zone */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-pink-500 hover:bg-pink-400 text-black font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-neon-pink active:scale-95 transition-all"
        >
          <Save className="w-5 h-5" />
          <span>{loading ? 'Salvando...' : 'Salvar Dados da Minha Loja'}</span>
        </button>
      </form>
    </div>
  );
}
