import type { ApiResponse } from '../api/message';

interface MessageSectionProps {
  data: ApiResponse;
}

export function MessageSection({ data }: MessageSectionProps) {
  return (
    <section>
      <p>{data.message}</p>
      <small>{data.timestamp}</small>
    </section>
  );
}
