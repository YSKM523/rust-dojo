// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { allModules } from '@/content/modules';
import { allProjects } from '@/content/projects';
import LearnPage from './page';

describe('LearnPage', () => {
  it('renders the populated training route', () => {
    render(<LearnPage />);

    expect(screen.getByText('TRAINING ROUTE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '训练路径' })).toBeInTheDocument();

    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href') ?? '');
    for (const mod of allModules) {
      expect(links).toContain(`/learn/${mod.id}`);
    }
    for (const project of allProjects) {
      expect(links).toContain(`/project/${project.id}`);
    }
  });
});
