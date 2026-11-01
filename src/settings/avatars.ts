import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

/**
 * Zdjęcie z galerii trafia najpierw do pamięci tymczasowej
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
