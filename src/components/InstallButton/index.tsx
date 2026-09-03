import { useState } from 'react';
import * as s from './style.css';

interface Props {
  /** none 이면 설치할 게 없다 — 이미 설치했거나 이 브라우저가 못 한다. */
  mode: 'none' | 'prompt' | 'ios';
  install: () => void;
  /**
   * 상단 안내 띠가 이 자리를 쓰는 중인지.
   *
   * 걷는 중이나 지도에서 곳을 고르는 중에는 그쪽이 화면 위를 다 쓴다. 그때
   * 설치 단추까지 겹쳐 놓으면 정작 봐야 할 안내를 가린다.
   */
  blocked: boolean;
}

/**
 * 홈 화면에 설치하기. 지도 오른쪽 위에 따로 선다.
 *
 * 길찾기와 아무 상관이 없는 일이라 길찾기 패널에서 꺼냈다. 설치를 마치면
 * mode 가 none 이 되어 저절로 사라진다.
 */
const InstallButton = ({ mode, install, blocked }: Props) => {
  const [hint, setHint] = useState(false);
  /** 이번 방문에는 안 보겠다는 뜻. 새로 열면 다시 나온다. */
  const [closed, setClosed] = useState(false);

  if (mode === 'none' || blocked || closed) return null;

  return (
    <div className={s.holder}>
      <div className={mode === 'ios' && hint ? s.barOpen : s.bar}>
        <button
          type="button"
          className={s.label}
          onClick={() =>
            mode === 'prompt' ? install() : setHint((was) => !was)
          }
          aria-expanded={mode === 'ios' ? hint : undefined}
        >
          앱 설치
        </button>
        <button
          type="button"
          className={s.close}
          aria-label="설치 안내 닫기"
          onClick={() => setClosed(true)}
        >
          ×
        </button>
      </div>

      {mode === 'ios' && hint && (
        <p className={s.hint}>
          사파리 아래 <span className={s.hintStrong}>공유 버튼</span> 을 누르고{' '}
          <span className={s.hintStrong}>「홈 화면에 추가」</span> 를 고르세요.
          주소창이 사라지고 지도가 그만큼 넓어집니다.
        </p>
      )}
    </div>
  );
};

export default InstallButton;
