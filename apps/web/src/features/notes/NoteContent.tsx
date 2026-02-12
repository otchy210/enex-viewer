import { useMemo, type ReactElement } from 'react';

interface NoteContentProps {
  html: string;
}

export function NoteContent({ html }: NoteContentProps): ReactElement {
  const safeMarkup = useMemo(() => ({ __html: html }), [html]);
  return <div className="note-content" dangerouslySetInnerHTML={safeMarkup} />;
}
