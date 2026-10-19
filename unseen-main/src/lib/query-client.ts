import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  const client = new QueryClient();
  client.setQueryDefaults(['admin'], { refetchOnWindowFocus: false });
  return client;
}
