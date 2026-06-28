import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SalesRepProfile from './SalesRepProfile'

export default function SalesManagerRepProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <SalesRepProfile
      repId={id}
      readOnly={false}
      onBack={() => navigate('/sales-manager/team')}
    />
  )
}
