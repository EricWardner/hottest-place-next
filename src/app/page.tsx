'use client'
import HottestMETAR from './components/HottestMETAR';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-32">
      <QueryClientProvider client={queryClient}>
        <HottestMETAR />
      </QueryClientProvider>
    </main>
  );
}
