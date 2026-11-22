/**
 * Wybór i trwałe zapisywanie zdjęć profilowych.
 *
 * @module src/settings/avatars
 */

import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

/**
 * Kopiuje zdjęcie do trwałego katalogu aplikacji.
 *
 * Zdjęcie z galerii trafia najpierw do pamięci tymczasowej, którą system może
 * wyczyścić — dlatego jest kopiowane do `<documents>/avatars/avatar-<czas>.<rozszerzenie>`.
 * Rozszerzenie jest brane z adresu (bez query); niepoprawne zastępuje `jpg`.
 *
 * @param uri Adres tymczasowego pliku zdjęcia.
 * @returns Adres trwałej kopii; gdy kopiowanie się nie uda (np. na webie) — oryginalny `uri`.
 */
export async function persistAvatar(uri: string): Promise<string> {
  try {
    const directory = new Directory(Paths.document, "avatars");
    if (!directory.exists) directory.create();

    const cleanUri = uri.split("?")[0];
    const extension = cleanUri.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExtension = /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
    const destination = new File(
      directory,
      `avatar-${Date.now()}.${safeExtension}`,
    );

    await new File(uri).copy(destination);
    return destination.uri;
  } catch {
    return uri;
  }
}

/**
 * Prosi o dostęp do galerii, pozwala wybrać i przyciąć zdjęcie (kwadrat, jakość 0.8)
 * i zapisuje je trwale przez {@link persistAvatar}.
 *
 * @returns Adres zapisanego zdjęcia albo `null`, gdy odmówiono dostępu lub anulowano wybór.
 */
export async function pickAvatar(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;
  return persistAvatar(result.assets[0].uri);
}
