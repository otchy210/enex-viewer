import type { ApiResponse } from '../api/message';

type MessageSectionProps = {
  data: ApiResponse;
};

export function MessageSection({ data }: MessageSectionProps) {
  return (
    <section>
      <p>{data.message}</p>
      <small>{data.timestamp}</small>
    </section>
  );
}
