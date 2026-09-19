import { useEffect, useState } from 'react'

// fetcher는 컴포넌트 밖에 선언된 함수를 넘긴다 (매 렌더마다 새로 만들면 무한 요청)
export function useApi(fetcher, initialData) {
  const [state, setState] = useState({ data: initialData, loading: true, error: null })

  useEffect(() => {
    let alive = true
    fetcher()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState((prev) => ({ ...prev, loading: false, error })))
    return () => {
      alive = false
    }
  }, [fetcher])

  return state
}
