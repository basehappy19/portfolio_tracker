import { Suspense } from 'react'
import { getPrograms, getSuggestions } from '@/app/actions'
import TrackerApp from '@/components/TrackerApp'

export default async function GuestPage() {
  const [programs, suggestions] = await Promise.all([
    getPrograms(),
    getSuggestions()
  ])
  
  return (
    <Suspense fallback={<div style={{ padding: 32, textAlign: 'center' }}>กำลังโหลด...</div>}>
      <TrackerApp initialPrograms={programs} suggestions={suggestions} readOnly />
    </Suspense>
  )
}
