import { useCallback, useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useNavigationVisibility } from './navigationVisibility';

const OFFSET_THRESHOLD = 8;

/**
 * Wspólna obsługa chowania dolnej nawigacji podczas przewijania.
 *
 * - panel, którego treść mieści się na ekranie, zawsze przywraca navbar,
 * - navbar chowa się dopiero po przewinięciu w dół i wraca przy przewijaniu w górę,
 * - powrót na górę listy zawsze pokazuje navbar.
 */
export function useScrollAwareNavigation() {
  const { setVisible } = useNavigationVisibility();
  const lastOffset = useRef(0);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);

  const restoreWhenContentFits = useCallback(() => {
    const viewport = viewportHeight.current;
    const content = contentHeight.current;
    if (viewport > 0 && content > 0 && content <= viewport + 1) {
      lastOffset.current = 0;
      setVisible(true);
    }
  }, [setVisible]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      restoreWhenContentFits();
    },
    [restoreWhenContentFits],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeight.current = height;
      restoreWhenContentFits();
    },
    [restoreWhenContentFits],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.y;
      const canScroll = contentHeight.current > viewportHeight.current + 1;

      if (!canScroll) {
        lastOffset.current = 0;
        setVisible(true);
        return;
      }

      if (offset <= 0) {
        lastOffset.current = 0;
        setVisible(true);
        return;
      }

      if (offset > lastOffset.current + OFFSET_THRESHOLD) {
        setVisible(false);
      } else if (offset < lastOffset.current - OFFSET_THRESHOLD) {
        setVisible(true);
      }

      lastOffset.current = offset;
    },
    [setVisible],
  );

  return { onLayout, onContentSizeChange, onScroll, scrollEventThrottle: 16 };
}
