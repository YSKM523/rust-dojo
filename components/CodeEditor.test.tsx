// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeEditor } from './CodeEditor';

const { rustExtension } = vi.hoisted(() => ({ rustExtension: { language: 'rust' } }));

vi.mock('@codemirror/lang-rust', () => ({
  rust: vi.fn(() => rustExtension),
}));

vi.mock('@uiw/react-codemirror', () => ({
  default: ({
    value,
    height,
    extensions,
    onChange,
    'aria-label': ariaLabel,
  }: {
    value: string;
    height: string;
    extensions: unknown[];
    onChange: (value: string) => void;
    'aria-label'?: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      value={value}
      data-height={height}
      data-extension={extensions[0] === rustExtension ? 'rust' : 'unknown'}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe('CodeEditor', () => {
  it('renders Rust CodeMirror at the workbench height and forwards changes', () => {
    const onChange = vi.fn();
    render(<CodeEditor value="fn main() {}" onChange={onChange} />);

    const editor = screen.getByLabelText('Rust 代码编辑器');
    expect(editor).toHaveValue('fn main() {}');
    expect(editor).toHaveAttribute('data-height', '360px');
    expect(editor).toHaveAttribute('data-extension', 'rust');

    fireEvent.change(editor, { target: { value: 'fn main() { println!("hi"); }' } });
    expect(onChange).toHaveBeenCalledWith('fn main() { println!("hi"); }');
  });
});
