// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ResourcesPage from './page';
import { allResourceItems, resourceGroups } from '@/content/resources';

describe('ResourcesPage', () => {
  it('renders the job-hunting library header with real counts', () => {
    render(<ResourcesPage />);

    expect(screen.getByText('FIELD LIBRARY')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '求职资料库' })).toBeInTheDocument();
    expect(screen.getByText('条目').nextElementSibling).toHaveTextContent(
      String(allResourceItems.length),
    );
    expect(screen.getByText('分区').nextElementSibling).toHaveTextContent(
      String(resourceGroups.length),
    );
  });

  it('renders every resource group with its items', () => {
    render(<ResourcesPage />);

    expect(screen.getByRole('heading', { name: 'JD 能力对照清单' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '面试高频题' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '速查表' })).toBeInTheDocument();

    for (const item of allResourceItems) {
      expect(screen.getByRole('heading', { name: item.title })).toBeInTheDocument();
    }
  });

  it('links each detailed item to its own page', () => {
    render(<ResourcesPage />);

    expect(screen.getAllByRole('link', { name: '阅读全文' })).toHaveLength(
      allResourceItems.filter((item) => item.body).length,
    );
  });
});
