const pad2 = (value: number): string => value.toString().padStart(2, '0');

export const formatLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());

  return `${String(year)}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
