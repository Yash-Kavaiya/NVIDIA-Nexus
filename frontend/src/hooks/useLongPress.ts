import { useState, useRef, useCallback } from 'react';

interface LongPressOptions {
  threshold?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

export function useLongPress({ threshold = 500, onLongPress, onClick }: LongPressOptions) {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<any>();
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    setIsPressing(true);

    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
      setIsPressing(false);
    }, threshold);
  }, [threshold, onLongPress]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsPressing(false);

    if (!isLongPress.current && onClick) {
      onClick();
    }
  }, [onClick]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    isPressing,
  };
}
