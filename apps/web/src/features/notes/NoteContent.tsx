import { useMemo } from 'react';

interface NoteContentProps {
  html: string;
}

export function NoteContent({ html }: NoteContentProps) {
  const safeMarkup = useMemo(() => ({ __html: html }), [html]);
  return <div className="note-content" dangerouslySetInnerHTML={safeMarkup} />;
}
