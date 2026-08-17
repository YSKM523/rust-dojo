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
  // judgeMode==='stdout' 必填（作者预生成）。
  // judgeMode==='compile' 选填：填了就同时比对输出，堵住"删光逻辑只留空 main 也能过"的洞。
  expectedStdout?: string;
  hiddenTests?: string;       // judgeMode==='tests' 必填：#[cfg(test)] mod tests {...} 源码
  // 选填：追加到提交代码末尾的编译期断言（stdout/compile 模式用）。
  // 典型用法是函数签名断言，卡住"改签名绕过题目要求"的写法：
  //   const _SIG: for<'a> fn(&'a str, &'a str) -> &'a str = longest;
  // 学员把 &str 换成 &String、把借用换成 String 返回，都会直接 E0308 编译失败。
  assertSource?: string;
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
