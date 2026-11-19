/**
 * Hook mierzący szerokość kontenera.
 *
 * @module src/useContainerWidth
 */
import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Mierzy faktyczną szerokość kontenera (np. kolumny na desktopie), zamiast zakładać szerokość okna.
 * `initialWidth` to szacunek na pierwszy render, zanim przyjdzie pomiar z onLayout.
 *
 * Szerokość jest zaokrąglana do pełnych pikseli, a stan zmienia się tylko przy
 * faktycznej zmianie (brak zbędnych renderów).
 *
 * @param initialWidth Szacowana szerokość na pierwszy render (px).
 * @returns Krotka `[width, onLayout]` — `onLayout` należy przekazać do mierzonego widoku.
 *
 * @example
 * const [width, onLayout] = useContainerWidth(360);
 * return <View onLayout={onLayout}><Chart width={width} /></View>;
 */
export function useContainerWidth(initialWidth: number) {
  const [width, setWidth] = useState(initialWidth);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  }, []);

  return [width, onLayout] as const;
}
