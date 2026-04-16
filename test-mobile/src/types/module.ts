export interface ModuleItem {
  id: string;
  itemType: "lesson" | "assessment" | string;
  order: number;
}

export interface ModuleSection {
  id: string;
  title: string;
  order: number;
  items: ModuleItem[];
}

export interface ClassModule {
  id: string;
  classId: string;
  title: string;
  description?: string | null;
  order: number;
  isLocked?: boolean;
  progressPercent?: number;
  sections: ModuleSection[];
}
