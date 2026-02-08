export type ResourceMeta = {
  id: string;
  fileName?: string;
  mime?: string;
  size?: number;
};

export type NoteDetail = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  contentHtml: string;
  resources: ResourceMeta[];
};

export type ImportSession = {
  id: string;
  createdAt: string;
  noteCount: number;
  warnings: string[];
  notes: NoteDetail[];
};
