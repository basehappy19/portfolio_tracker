import { Suspense } from 'react'
import { getPrograms } from './actions'
import TrackerApp from '@/components/TrackerApp'
import PinGate from '@/components/PinGate'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const programs = await getPrograms()

  return (
    <PinGate>
      <Suspense fallback={<div className="loading-screen">กำลังโหลดรายการ…</div>}>
        <TrackerApp initialPrograms={programs} />
      </Suspense>
    </PinGate>
  )
}
