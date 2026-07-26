'use client';

import { rust } from '@codemirror/lang-rust';
import CodeMirror from '@uiw/react-codemirror';

export function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="overflow-hidden border border-line bg-[#101217] font-mono">
      <CodeMirror
        aria-label="Rust 代码编辑器"
        value={value}
        height="360px"
        theme="dark"
        extensions={[rust()]}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: false,
        }}
      />
    </div>
  );
}
