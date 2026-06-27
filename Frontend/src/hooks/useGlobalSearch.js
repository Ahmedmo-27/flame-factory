import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * useGlobalSearch — searches members across both systems.
 * Returns props to spread onto the search input and the dropdown state.
 */
export function useGlobalSearch({ store, flMemberService, isFight, groups }) {
  const navigate = useNavigate()
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [idx, setIdx]         = useState(0)
  const inputRef  = useRef(null)
  const dropRef   = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !store) return []
    const members = store.memberService.getAll()
    return members
      .filter((m) =>
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q))
      )
      .slice(0, 8)
      .map((m) => {
        const groupId = isFight ? m.branch : m.session
        const label   = groups?.find((g) => g.id === groupId)?.label || groupId || ''
        const status  = store.memberService.getStatus(m)
        const basePath = isFight ? '/fl/members' : '/members'
        return { id: m.id, name: m.name, phone: m.phone, label, status, path: `${basePath}/${m.id}` }
      })
  }, [query, store, isFight, groups])

  useEffect(() => { setIdx(0) }, [results])

  // Close on outside click
  useEffect(() => {
    function onClickOut(e) {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[idx]) go(results[idx].path)
    }
    else if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  function go(path) {
    navigate(path)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return {
    query, setQuery, open, setOpen,
    results, idx, setIdx,
    inputRef, dropRef,
    handleKeyDown, go,
  }
}
