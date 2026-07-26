// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectChecklist } from '@/components/ProjectChecklist';
import { clearProgress, getCompleted, markCompleted } from '@/lib/progress/store';
import type { ProjectDef } from '@/lib/rust/types';

const project: ProjectDef = {
  id: 'px',
  afterModuleId: 'm1',
  title: '测试项目',
  summary: '摘要',
  brief: '## 目标',
  items: [
    { id: 'px-01', text: '第一条验收', testCommand: 'cargo test', hint: '这是提示' },
    { id: 'px-02', text: '第二条验收' },
  ],
};

beforeEach(() => {
  localStorage.clear();
  clearProgress();
});

describe('ProjectChecklist', () => {
  it('展示完成度与全部验收项', () => {
    markCompleted('px-01');
    render(<ProjectChecklist project={project} />);
    expect(screen.getByText(/1\s*\/\s*2\s*已验收/)).toBeInTheDocument();
    expect(screen.getByText(/第一条验收/)).toBeInTheDocument();
    expect(screen.getByText(/第二条验收/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('勾选写入进度，取消勾选移除进度', () => {
    render(<ProjectChecklist project={project} />);
    const boxes = screen.getAllByRole('checkbox');

    fireEvent.click(boxes[0]);
    expect(getCompleted()).toContain('px-01');
    expect(screen.getByText(/1\s*\/\s*2\s*已验收/)).toBeInTheDocument();

    fireEvent.click(boxes[0]);
    expect(getCompleted()).not.toContain('px-01');
    expect(screen.getByText(/0\s*\/\s*2\s*已验收/)).toBeInTheDocument();
  });

  it('渲染 testCommand 代码块并支持复制', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<ProjectChecklist project={project} />);

    expect(screen.getByText('cargo test')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /复制命令/ }));
    expect(writeText).toHaveBeenCalledWith('cargo test');
    await waitFor(() => expect(screen.getByText('已复制')).toBeInTheDocument());
  });

  it('提示默认折叠，点击后展开', () => {
    render(<ProjectChecklist project={project} />);
    expect(screen.queryByText('这是提示')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /看提示/ }));
    expect(screen.getByText('这是提示')).toBeInTheDocument();
  });
});
