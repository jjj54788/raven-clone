import { Suspense } from 'react';
import AiExploreClient from './AiExploreClient';

export default function AiExplorePage() {
  return (
    <Suspense
      fallback={(
        <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
          <div className="text-gray-400">Loading...</div>
        </div>
      )}
    >
      <AiExploreClient />
    </Suspense>
  );
}
