// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectCard } from '@/components/ProjectCard';
import { clearProgress, markCompleted } from '@/lib/progress/store';
import type { ProjectDef } from '@/lib/rust/types';

const project: ProjectDef = {
  id: 'px',
  afterModuleId: 'm1',
  title: '测试项目',
  summary: '一句话摘要',
  brief: '## 目标',
  items: [
    { id: 'px-01', text: '第一条' },
    { id: 'px-02', text: '第二条' },
    { id: 'px-03', text: '第三条' },
  ],
};

beforeEach(() => {
  localStorage.clear();
  clearProgress();
});

describe('ProjectCard', () => {
  it('链接到项目页并标注为实战项目', () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/project/px');
    expect(screen.getByText('实战项目')).toBeInTheDocument();
    expect(screen.getByText('测试项目')).toBeInTheDocument();
  });

  it('只统计本项目的验收项进度', () => {
    markCompleted('px-01');
    markCompleted('m1-01'); // 其他命名空间的进度不应计入
    render(<ProjectCard project={project} />);
    expect(screen.getByText(/1\s*\/\s*3\s*已验收/)).toBeInTheDocument();
  });
});
