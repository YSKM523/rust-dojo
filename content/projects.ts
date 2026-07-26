import type { ProjectDef } from '@/lib/rust/types';

export const allProjects: ProjectDef[] = [];

export function getProjectById(id: string): ProjectDef | undefined {
  return allProjects.find((project) => project.id === id);
}

export function projectsByModule(moduleId: string): ProjectDef[] {
  return allProjects.filter((project) => project.afterModuleId === moduleId);
}
