import { useMemo } from 'react'
import { useSystem } from '../context/SystemContext'
import {
  createStore,
  FITACADEMY_CONFIG,
  FIGHTLOCATION_CONFIG,
} from '../services/storageService'

export function useStore() {
  const { activeSystem } = useSystem()

  const store = useMemo(() => createStore(activeSystem), [activeSystem])

  const config =
    activeSystem === 'fightlocation' ? FIGHTLOCATION_CONFIG : FITACADEMY_CONFIG

  const isFight = activeSystem === 'fightlocation'

  // groups = sessions (fitacademy) or branches (fightlocation)
  const groups = isFight ? config.branches : config.sessions

  return { store, config, isFight, groups, systemId: activeSystem }
}
