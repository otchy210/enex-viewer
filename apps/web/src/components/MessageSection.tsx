import type { ApiResponse } from '../api/message';
import type { ReactElement } from 'react';

interface MessageSectionProps {
  data: ApiResponse;
}

export function MessageSection({ data }: MessageSectionProps): ReactElement {
  return (
    <section>
      <p>{data.message}</p>
      <small>{data.timestamp}</small>
    </section>
  );
}
