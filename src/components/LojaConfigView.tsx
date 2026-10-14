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
  Download,
  Upload,
  HardDrive,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { salvarConfigLocalEOnline } from '@/lib/dataService';
import { exportarBackupCompleto, importarBackupCompleto } from '@/lib/indexedDb';

interface LojaConfigViewProps {
  config?: ConfiguracaoLoja;
  lojaId?: string;
  onRefresh: () => void;
  onConfigUpdated?: (config: ConfiguracaoLoja) => void;
  onTrocarLoja?: () => void;
}

export default function LojaConfigView({ config, lojaId, onRefresh, onConfigUpdated, onTrocarLoja }: LojaConfigViewProps) {
  const [formData, setFormData] = useState<ConfiguracaoLoja>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('erp_loja_config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      nomeLoja: config?.nomeLoja || 'Minha Loja',
      cnpjCpf: config?.cnpjCpf || '',
      telefone: config?.telefone || '',
      endereco: config?.endereco || '',
      cidade: config?.cidade || 'São Paulo - SP',
      mensagemRodape: config?.mensagemRodape || 'Agradecemos a sua preferência! Volte sempre.',
      chavePix: config?.chavePix || '',
      tipoChavePix: config?.tipoChavePix || 'CELULAR',
      titularPix: config?.titularPix || '',
      cidadePix: config?.cidadePix || 'SAO PAULO',
    };
  });

  useEffect(() => {
    if (config) {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('erp_loja_config');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            // Se o localStorage já tiver dados salvos pelo usuário, prioriza o localStorage
            setFormData(parsed);
            return;
          } catch {}
        }
      }
      setFormData(config);
    }
  }, [config]);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);

  const handleExportBackup = async () => {
    try {
      setBackupLoading(true);
      setErrorMsg('');
      const backup = await exportarBackupCompleto();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dataStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup-erp-manu-local-${dataStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg('Backup exportado com sucesso! Salve o arquivo em local seguro.');
    } catch (err: any) {
      setErrorMsg('Erro ao gerar backup: ' + (err.message || 'Falha local'));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Deseja restaurar este backup? Todos os dados atuais deste aparelho serão substituídos pelo conteúdo do arquivo.')) {
      e.target.value = '';
      return;
    }

    try {
      setBackupLoading(true);
      setErrorMsg('');
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importarBackupCompleto(parsed);
      setSuccessMsg('Backup restaurado com sucesso no aparelho!');
      onRefresh();
    } catch (err: any) {
      setErrorMsg('Erro ao restaurar backup: ' + (err.message || 'Arquivo inválido'));
    } finally {
      setBackupLoading(false);
      e.target.value = '';
    }
  };

  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const saved = await salvarConfigLocalEOnline(formData);
      setFormData(saved);
      if (onConfigUpdated) {
        onConfigUpdated(saved);
      }
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

      {/* Card do Código da Loja (Multi-Aparelhos) */}
      <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Código deste Aparelho:</span>
          <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
            {lojaId || (typeof window !== 'undefined' ? localStorage.getItem('erp_usuario_loja_id') : '') || 'LOJA-LOCAL'}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Use este código para abrir exatamente esta mesma loja em outro celular ou tablet.
        </p>
        {onTrocarLoja && (
          <button
            type="button"
            onClick={onTrocarLoja}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"
          >
            Trocar de Loja neste Celular
          </button>
        )}
      </div>

      {/* Card de Backup e Segurança dos Dados (100% Offline) */}
      <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            Backup & Segurança dos Dados
          </h3>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Como seus dados ficam salvos 100% no seu aparelho sem precisar de internet, você pode baixar uma cópia de segurança (JSON) para guardar ou passar para outro celular.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Botão Baixar Backup */}
          <button
            type="button"
            onClick={async () => {
              try {
                const dados = await exportarBackupCompleto();
                const jsonStr = JSON.stringify(dados, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dataFormatada = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `backup-loja-${dados.lojaId}-${dataFormatada}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setSuccessMsg('Backup exportado com sucesso! Arquivo salvo no seu aparelho.');
              } catch (err: any) {
                setErrorMsg('Erro ao gerar arquivo de backup: ' + (err.message || 'Falha'));
              }
            }}
            className="py-2.5 px-3 bg-zinc-900 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_8px_rgba(0,240,255,0.15)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Backup</span>
          </button>

          {/* Botão Restaurar Backup */}
          <label className="py-2.5 px-3 bg-zinc-900 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_8px_rgba(0,255,136,0.15)] cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar Backup</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const texto = await file.text();
                  const backupObj = JSON.parse(texto);
                  await importarBackupCompleto(backupObj);
                  setSuccessMsg('Backup restaurado com sucesso! Recarregando sua loja...');
                  setTimeout(() => {
                    onRefresh();
                  }, 600);
                } catch (err: any) {
                  setErrorMsg('Erro ao importar backup: ' + (err.message || 'Arquivo inválido'));
                }
                e.target.value = '';
              }}
            />
          </label>
        </div>
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

        {/* Bloco: Armazenamento 100% Local & Backup */}
        <div className="bg-zinc-950 p-4 rounded-3xl border border-cyan-500/40 shadow-neon-cyan space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" /> Armazenamento 100% Local (IndexedDB)
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Offline-First
            </span>
          </div>

          <p className="text-[11px] text-zinc-400">
            Todos os seus dados (produtos, vendas, receitas, insumos, clientes e pagamentos) ficam salvos diretamente na memória deste aparelho.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={backupLoading}
              onClick={handleExportBackup}
              className="py-2.5 px-3 bg-zinc-900 hover:bg-cyan-500 hover:text-black border border-cyan-500/40 text-cyan-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            >
              <Download className="w-4 h-4" />
              <span>{backupLoading ? 'Gerando...' : 'Exportar Backup'}</span>
            </button>

            <label className="py-2.5 px-3 bg-zinc-900 hover:bg-purple-500 hover:text-white border border-purple-500/40 text-purple-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)] cursor-pointer text-center">
              <Upload className="w-4 h-4" />
              <span>Restaurar Backup</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                disabled={backupLoading}
                onChange={handleImportBackup}
              />
            </label>
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
