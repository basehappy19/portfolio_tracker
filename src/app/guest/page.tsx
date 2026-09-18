import { Suspense } from 'react'
import { getPrograms } from '@/app/actions'
import TrackerApp from '@/components/TrackerApp'

export const dynamic = 'force-dynamic'

export default async function GuestPage() {
  const programs = await getPrograms()
  
  return (
    <Suspense fallback={<div style={{ padding: 32, textAlign: 'center' }}>กำลังโหลด...</div>}>
      <TrackerApp initialPrograms={programs} readOnly />
    </Suspense>
  )
}
