import { Routes, Route, Navigate } from 'react-router-dom'
import { Browse } from '@/routes/Browse'
import { Settings } from '@/routes/Settings'

/** 라우트 정의. 딥링크가 안전하도록 HashRouter(main.tsx) 위에서 동작한다. */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/browse" replace />} />
      <Route path="/browse/*" element={<Browse />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/browse" replace />} />
    </Routes>
  )
}
