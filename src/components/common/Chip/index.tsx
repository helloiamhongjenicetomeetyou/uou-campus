import type { ReactNode } from 'react';
import * as s from './style.css';

interface Props {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  accent?: string;
  title?: string;
}

const Chip = ({ children, selected, onClick, accent, title }: Props) => {
  return (
    <button
      type="button"
      className={selected ? s.selected : s.chip}
      onClick={onClick}
      title={title}
      aria-pressed={onClick ? selected : undefined}
      style={selected && accent ? { color: accent } : undefined}
    >
      {children}
    </button>
  );
};

export default Chip;
