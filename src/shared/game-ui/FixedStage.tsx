import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import './game-ui.css';

type FixedStageFit = 'contain' | 'cover';

interface FixedStageProps {
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
  fit?: FixedStageFit;
  viewportClassName?: string;
  style?: CSSProperties;
}

export function FixedStage({
  width,
  height,
  children,
  className = '',
  fit = 'contain',
  viewportClassName = '',
  style,
}: FixedStageProps) {
  const stageMetrics = useFixedStageMetrics(width, height, fit);

  return (
    <div className={['game-fixed-stage-viewport', viewportClassName].filter(Boolean).join(' ')} data-fit={fit}>
      <div
        className={['game-fixed-stage', className].filter(Boolean).join(' ')}
        style={{
          width,
          height,
          transform: `scale(${stageMetrics.scale})`,
          marginLeft: `${(stageMetrics.viewportWidth - width * stageMetrics.scale) / 2}px`,
          marginTop: `${(stageMetrics.viewportHeight - height * stageMetrics.scale) / 2}px`,
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function useFixedStageScale(width: number, height: number, fit: FixedStageFit = 'contain'): number {
  return useFixedStageMetrics(width, height, fit).scale;
}

function getFixedStageScale(viewportWidth: number, viewportHeight: number, width: number, height: number, fit: FixedStageFit) {
  const widthScale = viewportWidth / width;
  const heightScale = viewportHeight / height;
  return fit === 'cover' ? Math.max(widthScale, heightScale) : Math.min(widthScale, heightScale);
}

function useFixedStageMetrics(width: number, height: number, fit: FixedStageFit) {
  const [metrics, setMetrics] = useState(() => {
    if (typeof window === 'undefined') {
      return { scale: 1, viewportWidth: width, viewportHeight: height };
    }

    return {
      scale: getFixedStageScale(window.innerWidth, window.innerHeight, width, height, fit),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        scale: getFixedStageScale(window.innerWidth, window.innerHeight, width, height, fit),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
    };

    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    return () => window.removeEventListener('resize', updateMetrics);
  }, [fit, height, width]);

  return metrics;
}
