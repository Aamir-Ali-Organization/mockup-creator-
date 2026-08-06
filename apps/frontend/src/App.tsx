import { Route, Routes } from 'react-router-dom';
import { QuotePage } from '@/pages/QuotePage';
import { SuccessPage } from '@/pages/SuccessPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<QuotePage />} />
      <Route path="/success/:id" element={<SuccessPage />} />
    </Routes>
  );
}
