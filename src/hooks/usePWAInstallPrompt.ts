import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

export const usePWAInstallPrompt = () => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => isStandaloneMode());

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const deferred = event as BeforeInstallPromptEvent;
      setPromptEvent(deferred);
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      setPromptEvent(null);
      setIsInstallable(false);
      setIsStandalone(true);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (event: MediaQueryListEvent) => setIsStandalone(event.matches);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!promptEvent) return null;
    await promptEvent.prompt();
    const result = await promptEvent.userChoice;
    setPromptEvent(null);
    setIsInstallable(false);
    return result.outcome;
  }, [promptEvent]);

  return {
    isInstallable,
    isStandalone,
    promptInstall
  };
};
