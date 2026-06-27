import React from 'react'
import { useAuth } from '../../context/AuthContext'
import SalesRepProfile from '../sales-manager/SalesRepProfile'

export default function SalesProfile() {
  const { user } = useAuth()

  return <SalesRepProfile repId={user?.id} readOnly />
}
