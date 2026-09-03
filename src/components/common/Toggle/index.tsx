import * as s from './style.css';

interface Props {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

/** 켜고 끄는 옵션 한 줄. 설명은 라벨 밑에 작게 붙는다. */
const Toggle = ({ label, hint, checked, onChange, disabled }: Props) => (
  <label className={disabled ? s.rowDisabled : s.row}>
    <input
      type="checkbox"
      className={s.input}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className={s.box} aria-hidden />
    <span className={s.text}>
      <span className={s.label}>{label}</span>
      {hint && <span className={s.hint}>{hint}</span>}
    </span>
  </label>
);

export default Toggle;
