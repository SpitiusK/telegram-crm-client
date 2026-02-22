import { useRef, useState, useEffect, type ReactNode } from 'react'

interface LazyMediaProps {
  width: number
  height: number
  className?: string
  children: ReactNode
}

export function LazyMedia({ width, height, className, children }: LazyMediaProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (visible) {
    return <>{children}</>
  }

  return (
    <div
      ref={ref}
      className={`bg-black/10 rounded-lg ${className ?? ''}`}
      style={{ width, height }}
    />
  )
}
