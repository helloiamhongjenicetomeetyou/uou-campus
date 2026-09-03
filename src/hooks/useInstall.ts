import { useCallback, useEffect, useState } from 'react';

/** 크롬 계열만 던져 주는 이벤트라 lib.dom 에 타입이 없다. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** 이미 홈 화면에서 띄운 상태인지. iOS 는 표준 표시가 아니라 따로 본다. */
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && Boolean(navigator.standalone));

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  /* 아이패드는 최근 사파리에서 맥으로 위장한다. 터치 여부로 가른다. */
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

type Mode = 'none' | 'prompt' | 'ios';

/**
 * 홈 화면에 설치하기.
 *
 * 크롬 계열은 beforeinstallprompt 를 잡아 뒀다가 버튼을 누를 때 띄운다.
 * iOS 사파리는 그런 이벤트가 없어서 '공유 → 홈 화면에 추가' 를 안내만 한다.
 */
export const useInstall = () => {
  const [saved, setSaved] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  /* 기기 종류는 도중에 바뀌지 않는다. 이펙트가 아니라 처음 값으로 잡는다. */
  const [ios] = useState(() => isIos() && !isStandalone());

  useEffect(() => {
    const onPrompt = (event: Event) => {
      /* 기본 배너를 막고 우리 버튼으로 옮긴다. */
      event.preventDefault();
      setSaved(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setSaved(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!saved) return;
    await saved.prompt();
    const { outcome } = await saved.userChoice;
    /* 한 번 쓴 이벤트는 다시 못 쓴다. 거절했으면 버튼도 접는다. */
    setSaved(null);
    if (outcome === 'accepted') setInstalled(true);
  }, [saved]);

  const mode: Mode = installed
    ? 'none'
    : saved
      ? 'prompt'
      : ios
        ? 'ios'
        : 'none';

  return { mode, install };
};
