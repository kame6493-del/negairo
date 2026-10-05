import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// App Review 用の録画ビルドだけ(VITE_REVIEW_TOUR=1)。製品版では import ごと消える
if (import.meta.env.VITE_REVIEW_TOUR === '1') void import('./dev/reviewTour').then((m) => m.runReviewTour());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
