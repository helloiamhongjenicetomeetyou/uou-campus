const layout = {
  contentWidth: '1160px',
  sideMargin: '28px',
  sideMarginMobile: '16px',
  /**
   * 가로로 돌린 폰에서 왼쪽에 세우는 기둥의 폭.
   *
   * 상단 띠가 이만큼 비켜 앉아야 하므로 한 곳에 적어 두고 나눠 쓴다.
   * 좁은 폰(667px)에서도 지도에 370px 은 남는 값이다.
   */
  railWidth: 'min(44%, 330px)',
  radius: {
    sm: '6px',
    md: '10px',
    pill: '999px',
  },
} as const;

export default layout;
