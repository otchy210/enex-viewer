export type StoredNote = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  content: string;
};

type StoredImport = {
  importId: string;
  notes: StoredNote[];
};

const importStore = new Map<string, StoredImport>();

export const saveImport = (importId: string, notes: StoredNote[]): void => {
  importStore.set(importId, { importId, notes });
};

export const getImport = (importId: string): StoredImport | undefined => {
  return importStore.get(importId);
};

export const clearImports = (): void => {
  importStore.clear();
};
