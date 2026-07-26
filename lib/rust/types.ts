export type JudgeMode = 'stdout' | 'compile' | 'tests';

export interface Exercise {
  id: string;                 // 'm1-01'
  moduleId: string;           // 'm1'..'m8'
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;             // 中文题面 markdown
  starterCode: string;
  solutionCode: string;
  judgeMode: JudgeMode;
  expectedStdout?: string;    // judgeMode==='stdout' 必填（作者预生成）
  hiddenTests?: string;       // judgeMode==='tests' 必填：#[cfg(test)] mod tests {...} 源码
  crateType?: 'bin' | 'lib';  // 默认 stdout/compile→'bin'，tests→'lib'
  hints?: string[];
}

export interface Verdict { passed: boolean; reason?: string; }

export interface JudgeResult {
  verdict: Verdict;
  stdout?: string;
  stderr?: string;            // 清理后的 rustc 诊断
  expectedStdout?: string;
}

export type TierKey = 'beginner' | 'intermediate' | 'advanced' | 'senior' | 'sprint';

export interface ModuleDef {
  id: string; // 'm1'
  order: number; // 1..4（本阶段）
  title: string; // '入门'
  tierKey: TierKey;
  tierLabel: string; // '小白' / '初级' / '中级'
  summary: string; // 一句话简介
  lesson: string; // 概念课 Markdown
}

export interface ChecklistItem { id: string; text: string; testCommand?: string; hint?: string; }
export interface ProjectDef {
  id: string;                 // 'p1'..'p4'
  afterModuleId: string;      // 排在该模块之后
  title: string;
  summary: string;
  brief: string;              // markdown
  items: ChecklistItem[];
}
