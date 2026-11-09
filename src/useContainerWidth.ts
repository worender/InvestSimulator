import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Mierzy faktyczną szerokość kontenera (np. kolumny na desktopie), zamiast zakładać szerokość okna.
 * `initialWidth` to szacunek na pierwszy render, zanim przyjdzie pomiar z onLayout.
 */
export function useContainerWidth(initialWidth: number) {
  const [width, setWidth] = useState(initialWidth);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  }, []);

  return [width, onLayout] as const;
}
