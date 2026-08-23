import { Suspense } from 'react'
import { getPrograms, getSuggestions } from './actions'
import TrackerApp from '@/components/TrackerApp'
import PinGate from '@/components/PinGate'

export default async function Page() {
  const [programs, suggestions] = await Promise.all([
    getPrograms(),
    getSuggestions()
  ])
  
  return (
    <PinGate>
      <Suspense fallback={<div style={{ padding: 32, textAlign: 'center' }}>กำลังโหลด...</div>}>
        <TrackerApp initialPrograms={programs} suggestions={suggestions} />
      </Suspense>
    </PinGate>
  )
}
