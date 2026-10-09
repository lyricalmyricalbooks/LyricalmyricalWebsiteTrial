// Studio media library (2.4): the admin-only Firestore `media/{id}` records and their Storage files.
// Kept apart from api.ts so the Studio fixture (studio/fixture/fakeStudioApi.ts) can swap it for an
// in-memory copy. Until firestore.rules with the `media` block is deployed, reads fail with
// permission-denied and Studio shows the library as "not switched on" (isMediaDenied).
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { MediaItem } from "./studio/mediaLibrary";

export const isMediaDenied = (error: any) =>
  error?.code === "permission-denied" || /insufficient permissions/i.test(String(error?.message || ""));

export const mediaApi = {
  list: async (): Promise<MediaItem[]> => {
    const snap = await getDocs(collection(db, "media"));
    return snap.docs.map(d => ({ ...(d.data() as MediaItem), id: d.id }));
  },
  save: async (item: MediaItem): Promise<void> => {
    // Firestore refuses `undefined`; a JSON copy drops it.
    await setDoc(doc(db, "media", item.id), JSON.parse(JSON.stringify(item)));
  },
  /** Deletes the record first, then its files (a left-over file is harmless; a record without files isn't). */
  remove: async (item: MediaItem, paths: string[]): Promise<void> => {
    await deleteDoc(doc(db, "media", item.id));
    await mediaApi.removeFiles(paths);
  },
  removeFiles: async (paths: string[]): Promise<void> => {
    if (!paths.length) return;
    const [{ getStorage, ref, deleteObject }, { getApp }] = await Promise.all([import("firebase/storage"), import("firebase/app")]);
    const storage = getStorage(getApp());
    await Promise.all(paths.map(path => deleteObject(ref(storage, path)).catch((error: any) => {
      if (error?.code !== "storage/object-not-found") console.warn("Could not delete media file", path, error?.code || error);
    })));
  },
};
