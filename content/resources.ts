import type { ModuleDef } from '@/lib/rust/types';

export type ResourceKind = 'article' | 'template' | 'reference';

export interface ResourceItem {
  id: string;
  kind: ResourceKind;
  title: string;
  summary: string;
  category: string;
  level: ModuleDef['tierLabel'];
  tags: string[];
  moduleId?: string;
  exerciseId?: string;
  readingTime?: string;
  body?: string;
  code?: string;
}

export interface ResourceGroup {
  id: 'basics' | 'articles' | 'templates' | 'references';
  title: string;
  eyebrow: string;
  summary: string;
  items: ResourceItem[];
}

export interface ScenarioCard {
  title: string;
  question: string;
  moduleId: string;
  exerciseId?: string;
  tags: string[];
}

export const resourceGroups: ResourceGroup[] = [];
export const featuredResources: ResourceItem[] = [];
export const allResourceItems: ResourceItem[] = [];

export function getResourceById(id: string): ResourceItem | undefined {
  return allResourceItems.find((item) => item.id === id);
}

export const scenarioCards: ScenarioCard[] = [];
