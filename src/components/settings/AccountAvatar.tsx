/**
 * Okrągły awatar konta.
 *
 * @module src/components/settings/AccountAvatar
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme";

/**
 * Właściwości {@link AccountAvatar}.
 * @inline
 */
type AccountAvatarProps = {
  /** Adres zdjęcia; brak — wyświetlana jest pierwsza litera nazwy. */
  uri?: string | null;
  /** Nazwa konta (źródło inicjału). */
  name: string;
  /** Średnica w px. */
  size?: number;
  /** Obwódka w kolorze akcentu zamiast domyślnej. */
  accentBorder?: boolean;
};

/**
 * Okrągły awatar konta: zdjęcie albo pierwsza litera nazwy (dla pustej nazwy `I`).
 *
 * @param props Właściwości komponentu.
 */
export function AccountAvatar({
  uri,
  name,
  size = 46,
  accentBorder = false,
}: AccountAvatarProps) {
  const { colors } = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || "I";

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: accentBorder ? colors.accent : colors.borderGlass,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={180}
          style={{ width: size, height: size }}
        />
      ) : initial ? (
        <View style={styles.initialWrap}>
          <View style={styles.initialBadge}>
            <Ionicons name="person" size={size * 0.42} color={colors.accent} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },
  initialWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initialBadge: {
    width: "68%",
    height: "68%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
