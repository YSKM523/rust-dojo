import type { ModuleDef } from '@/lib/rust/types';

export const allModules: ModuleDef[] = [];

// Authoring example:
// const example: ModuleDef = {
//   id: 'm1',
//   order: 1,
//   title: '示例模块',
//   tierKey: 'beginner',
//   tierLabel: '小白',
//   summary: '示例摘要',
//   lesson: ['## 标题', '', '正文'].join('\n'),
// };

export function getModuleById(id: string): ModuleDef | undefined {
  return allModules.find((module) => module.id === id);
}
