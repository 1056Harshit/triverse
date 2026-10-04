import * as ImagePicker from "expo-image-picker";

/** Square photo as base64 JPEG. `camera` opens the front camera (used for live selfies). */
export async function pickPhoto(camera = false): Promise<string | null> {
  const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true, cameraType: ImagePicker.CameraType.front };
  const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  return r.canceled ? null : r.assets[0].base64 ?? null;
}
