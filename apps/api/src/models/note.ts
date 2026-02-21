export interface ResourceMeta {
  id: string;
  fileName?: string;
  mime?: string;
  size?: number;
  hash?: string;
  storagePath?: string;
}

export interface NoteDetail {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  contentHtml: string;
  resources: ResourceMeta[];
}

export interface ImportSession {
  id: string;
  hash: string;
  createdAt: string;
  noteCount: number;
  warnings: string[];
  notes: NoteDetail[];
  noteListIndex: {
    noteId: string;
    title: string;
    createdAt?: string;
    updatedAt?: string;
    tags: string[];
    searchText: string;
    excerpt: string;
    sortKey: number;
  }[];
}
