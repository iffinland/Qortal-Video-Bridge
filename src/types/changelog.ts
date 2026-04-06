export interface ChangelogEntry {
  id: string;
  content: string;
  createdAt: string;
}

export interface ChangelogDocument {
  entries: ChangelogEntry[];
}
