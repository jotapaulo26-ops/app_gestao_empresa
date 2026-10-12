'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verifica se já está rodando em modo standalone (já instalado)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Detecta iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

    // Captura o evento nativo do Chrome/Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else if (isIos) {
      setShowIosTip(true);
    } else {
      // Dica para Android no Chrome se o prompt ainda não disparou
      alert(
        'Para instalar no Google Chrome:\n1. Toque nos 3 pontinhos (⋮) no canto superior direito\n2. Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"'
      );
    }
  };

  // Se já está instalado como app na tela inicial, não precisa exibir
  if (isInstalled) return null;

  return (
    <>
      {/* Botão Baixar APK Android Direto */}
      <a
        href="/Cozinha.apk"
        download="Cozinha.apk"
        className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-[0_0_12px_rgba(0,240,255,0.15)] mb-2"
      >
        <Smartphone className="w-4 h-4 text-cyan-400" />
        <span>Baixar App Cozinha (.APK)</span>
        <Download className="w-3.5 h-3.5 ml-auto text-cyan-400" />
      </a>

      <button
        onClick={handleInstallClick}
        type="button"
        className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-[0_0_12px_rgba(0,255,136,0.15)] mb-3"
      >
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span>Instalar Aplicativo no Celular</span>
        <Download className="w-3.5 h-3.5 ml-auto text-emerald-400" />
      </button>

      {/* Dica para iPhone / iOS */}
      {showIosTip && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-sm">Instalar no iPhone (iOS)</h3>
              <button
                onClick={() => setShowIosTip(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 text-zinc-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              1. Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima ⬆️ no Safari).<br />
              2. Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> ➕.<br />
              3. Toque em <strong>Adicionar</strong>.
            </p>
            <button
              onClick={() => setShowIosTip(false)}
              className="w-full py-2.5 bg-emerald-500 text-black rounded-xl font-bold text-xs"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
