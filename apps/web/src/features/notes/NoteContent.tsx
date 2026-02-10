import { useMemo } from 'react';

type NoteContentProps = {
  html: string;
};

export function NoteContent({ html }: NoteContentProps) {
  const safeMarkup = useMemo(() => ({ __html: html }), [html]);
  return <div className="note-content" dangerouslySetInnerHTML={safeMarkup} />;
}
