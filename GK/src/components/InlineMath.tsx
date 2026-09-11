import React from 'react';
import { MathView } from './MathView';
import { NOTATIONS, NotationKey } from '../domain/notationRegistry';

interface InlineMathProps {
  latex?: string;
  symbol?: NotationKey;
  className?: string;
  title?: string;
}

export const InlineMath: React.FC<InlineMathProps> = ({
  latex,
  symbol,
  className = '',
  title
}) => {
  let mathString = latex || '';
  let tooltip = title;

  if (symbol && NOTATIONS[symbol]) {
    mathString = NOTATIONS[symbol].latex;
    if (!tooltip) {
      tooltip = `${NOTATIONS[symbol].name}: ${NOTATIONS[symbol].description}`;
    }
  }

  return (
    <span className={`inline-math-wrapper ${className}`} title={tooltip}>
      <MathView latex={mathString} displayMode={false} />
    </span>
  );
};
