'use client'

import { useEffect, useRef, useState } from 'react'
import { getLocalLogo, getUniDomain, getUniColor, getUniAbbr, abbrFontScale } from '@/lib/university'

// ลำดับความสำคัญ: 1) โลโก้ที่ผู้ใช้อัปโหลด 2) ไฟล์โลโก้ใน /public
// 3) favicon จากเว็บมหาวิทยาลัย 4) แบดจ์ตัวย่อ + สีประจำมหาวิทยาลัย
export default function UniversityLogo({ university, logoUrl, size = 40 }: { university: string; logoUrl?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const localLogo = getLocalLogo(university)
  const domain = getUniDomain(university)
  const color = getUniColor(university)
  const abbr = getUniAbbr(university)
  const src = logoUrl || localLogo || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null)
  const radius = Math.round(size * 0.26)

  // รูปที่โหลดพังก่อน React hydrate จะไม่ยิง onError → ตรวจซ้ำตอน mount
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) setImgError(true)
  }, [src])

  if (!src || imgError) return (
    <div
      title={university}
      aria-hidden
      style={{
        width: size, height: size, borderRadius: radius, background: color, flexShrink: 0,
        display: 'grid', placeItems: 'center', color: '#fff',
        fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: -0.3,
        fontSize: size * abbrFontScale(abbr.length), lineHeight: 1,
      }}
    >
      {abbr}
    </div>
  )

  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0, background: '#fff', overflow: 'hidden',
      boxShadow: `inset 0 0 0 1px var(--border)`, display: 'grid', placeItems: 'center', padding: Math.round(size * 0.1),
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        loading="lazy"
        alt=""
        title={university}
        width={size} height={size}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={() => setImgError(true)}
      />
    </div>
  )
}
