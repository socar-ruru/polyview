import { Routes, Route, Navigate } from 'react-router-dom'
import { Browse } from '@/routes/Browse'
import { Settings } from '@/routes/Settings'
import { MenuBridge } from '@/components/MenuBridge'

/** 라우트 정의. URL 해시를 Scalar 에 양보하기 위해 MemoryRouter(main.tsx) 위에서 동작한다. */
export default function App() {
  return (
    <>
      {/* 네이티브 메뉴 이벤트를 라우터/컨텍스트 안에서 처리한다. */}
      <MenuBridge />
      <Routes>
        <Route path="/" element={<Navigate to="/browse" replace />} />
        <Route path="/browse/*" element={<Browse />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/browse" replace />} />
      </Routes>
    </>
  )
}
