import { Suspense } from 'react'
import { getPrograms } from './actions'
import TrackerApp from '@/components/TrackerApp'
import PinGate from '@/components/PinGate'

export default async function Page() {
  const programs = await getPrograms()
  return (
    <PinGate>
      <Suspense fallback={<div style={{ padding: 32, textAlign: 'center' }}>กำลังโหลด...</div>}>
        <TrackerApp initialPrograms={programs} />
      </Suspense>
    </PinGate>
  )
}
