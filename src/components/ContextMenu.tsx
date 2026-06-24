import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export interface MenuItem {
  label: string
  onSelect: () => void
}

/** 커서 위치에 뜨는 작은 컨텍스트 메뉴. 바깥 클릭·Esc·리사이즈 시 닫힌다. */
function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div
        className="fixed min-w-[180px] overflow-hidden rounded-md border border-line bg-canvas py-1 text-sm shadow-lg"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              item.onSelect()
              onClose()
            }}
            className="block w-full px-3 py-1.5 text-left text-fg hover:bg-hover/50"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}

/**
 * 우클릭 컨텍스트 메뉴 상태 훅. `open(e, items)` 로 열고, 반환된 `menu` 를
 * 컴포넌트 어딘가에 렌더하면 된다(포털이라 위치는 무관).
 */
export function useContextMenu() {
  const [state, setState] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const close = useCallback(() => setState(null), [])
  const open = useCallback((e: ReactMouseEvent, items: MenuItem[]) => {
    e.preventDefault()
    setState({ x: e.clientX, y: e.clientY, items })
  }, [])
  const menu: ReactNode = state ? (
    <ContextMenu x={state.x} y={state.y} items={state.items} onClose={close} />
  ) : null
  return { open, menu }
}
