import React from 'react';
import { InlineMath } from './InlineMath';
import { NotationKey } from '../domain/notationRegistry';

interface MathLabelProps {
  prefix?: string;
  symbol?: NotationKey;
  latex?: string;
  suffix?: string;
  className?: string;
}

export const MathLabel: React.FC<MathLabelProps> = ({
  prefix,
  symbol,
  latex,
  suffix,
  className = ''
}) => {
  return (
    <span className={`math-label ${className}`}>
      {prefix && <span>{prefix} </span>}
      {(symbol || latex) && <InlineMath symbol={symbol} latex={latex} />}
      {suffix && <span> {suffix}</span>}
    </span>
  );
};
