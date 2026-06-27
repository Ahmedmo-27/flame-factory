import React, { createContext, useContext, useState } from 'react'

export const SYSTEMS = {
  fitacademy: {
    id: 'fitacademy',
    name: 'Flame Factory',
    icon: '🔥',
    tagline: 'Fitness Academy',
    color: '#f97316',
  },
  fightlocation: {
    id: 'fightlocation',
    name: 'FightLocation',
    icon: '🥊',
    tagline: 'Fight & Fitness Centers',
    color: '#a855f7',
  },
}

const SystemContext = createContext(null)

export function SystemProvider({ children }) {
  const [activeSystem, setActiveSystem] = useState(
    () => localStorage.getItem('active_system') || null
  )

  function switchSystem(id) {
    localStorage.setItem('active_system', id)
    setActiveSystem(id)
  }

  function exitSystem() {
    localStorage.removeItem('active_system')
    setActiveSystem(null)
  }

  return (
    <SystemContext.Provider value={{ activeSystem, switchSystem, exitSystem, SYSTEMS }}>
      {children}
    </SystemContext.Provider>
  )
}

export function useSystem() {
  return useContext(SystemContext)
}
