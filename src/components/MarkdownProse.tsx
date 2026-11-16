'use client';

import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[12px] text-blue-600 dark:text-blue-400"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function MarkdownProse({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (line === '---' || line === '***') {
      flushList();
      nodes.push(<hr key={`hr-${key++}`} className="border-slate-200 dark:border-slate-800 my-3" />);
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      nodes.push(
        <h3 key={`h3-${key++}`} className="text-sm font-bold text-slate-900 dark:text-white pt-2">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      nodes.push(
        <h2 key={`h2-${key++}`} className="text-base font-bold text-slate-900 dark:text-white pt-2">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith('# ')) {
      flushList();
      nodes.push(
        <h2 key={`h1-${key++}`} className="text-base font-bold text-slate-900 dark:text-white pt-2">
          {renderInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    if (line.startsWith('* ') || line.startsWith('- ')) {
      listItems.push(<li key={`li-${key++}`}>{renderInline(line.slice(2))}</li>);
      continue;
    }

    flushList();
    nodes.push(
      <p key={`p-${key++}`} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-2">{nodes}</div>;
}
