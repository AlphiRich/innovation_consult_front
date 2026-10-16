import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/routes';
import { registerServiceWorker } from '@/offline/registerServiceWorker';
import { UpdateBanner } from '@/offline/UpdateBanner';

export function App() {
  const [updateReady, setUpdateReady] = useState(false);

  // Registered here rather than in main.tsx so the prompt has somewhere to
  // render. It is a no-op in development and where service workers are
  // unavailable — see registerServiceWorker.ts.
  useEffect(() => {
    registerServiceWorker(() => setUpdateReady(true));
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
      {updateReady && <UpdateBanner onDismiss={() => setUpdateReady(false)} />}
    </AppProviders>
  );
}
