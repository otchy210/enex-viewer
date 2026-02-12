export const getMessagePayload = (): { message: string; timestamp: string } => ({
  message: 'Hello from TypeScript REST API',
  timestamp: new Date().toISOString()
});
