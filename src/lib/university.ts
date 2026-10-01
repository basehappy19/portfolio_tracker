/* ข้อมูลประจำมหาวิทยาลัย: ลิงก์ระบบรับสมัคร, โดเมน (favicon), ตัวย่อ, สีประจำสถาบัน, โลโก้ในเครื่อง */

const ADMISSION_URLS: Record<string, string> = {
  'จุฬาลงกรณ์': 'https://admission.chula.ac.th/',
  'ธรรมศาสตร์': 'https://www.tuadmissions.in.th/',
  'มหิดล': 'https://tcas.mahidol.ac.th/',
  'เชียงใหม่': 'https://www1.reg.cmu.ac.th/ugradapply/',
  'เกษตรศาสตร์': 'https://admission.ku.ac.th/',
  'ขอนแก่น': 'https://admissions.kku.ac.th/',
  'ลาดกระบัง': 'https://new.reg.kmitl.ac.th/admission/',
  'พระจอมเกล้าธนบุรี': 'https://admission.kmutt.ac.th/',
  'พระนครเหนือ': 'https://admission.kmutnb.ac.th/',
  'ศิลปากร': 'https://admission.su.ac.th/',
  'ศรีนครินทรวิโรฒ': 'https://admission.swu.ac.th/',
  'สงขลานครินทร์': 'https://entrance.psu.ac.th/',
  'บูรพา': 'https://reg.buu.ac.th/',
  'นเรศวร': 'https://admission.nu.ac.th/',
  'เทคโนโลยีสุรนารี': 'https://sutgateway.sut.ac.th/',
  'มหาสารคาม': 'https://admission.msu.ac.th/',
}

export function getAdmissionUrl(university: string) {
  for (const [key, url] of Object.entries(ADMISSION_URLS)) {
    if (university.includes(key)) return url
  }
  return `https://www.google.com/search?q=${encodeURIComponent('ระบบรับสมัครนักศึกษา ' + university)}`
}

/* ============ University Domain (สำหรับดึง favicon จริง) ============ */
const UNI_DOMAIN: Record<string, string> = {
  'จุฬาลงกรณ์':         'chula.ac.th',
  'ธรรมศาสตร์':         'tu.ac.th',
  'มหิดล':             'mahidol.ac.th',
  'มหาสารคาม':          'msu.ac.th',
  'เทคโนโลยีสุรนารี':   'sut.ac.th',
  'เชียงใหม่':          'cmu.ac.th',
  'สงขลานครินทร์':      'psu.ac.th',
  'พระจอมเกล้าธนบุรี':  'kmutt.ac.th',
  'ลาดกระบัง':          'kmitl.ac.th',
  'ศรีนครินทรวิโรฒ':    'swu.ac.th',
  'พระนครเหนือ':        'kmutnb.ac.th',
  'บูรพา':             'buu.ac.th',
  'สวนสุนันทา':         'ssru.ac.th',
  'อุบลราชธานี':        'ubu.ac.th',
  'เกษตรศาสตร์':        'ku.ac.th',
  'ขอนแก่น':           'kku.ac.th',
  'นเรศวร':            'nu.ac.th',
  'สยาม':              'siam.edu',
  'กรุงเทพ':           'bu.ac.th',
  'รังสิต':            'rsu.ac.th',
  'อัสสัมชัญ':          'au.edu',
  'หอการค้าไทย':        'utcc.ac.th',
  'ศิลปากร':           'su.ac.th',
  'สถาบันเทคโนโลยีพระจอมเกล้า': 'kmitl.ac.th',
}

export function getUniDomain(university: string): string | null {
  for (const [key, domain] of Object.entries(UNI_DOMAIN)) {
    if (university.includes(key)) return domain
  }
  return null
}

/* ============ University Abbreviation ============ */
// ตัวย่อทางการที่รู้จักทั่วไปของแต่ละสถาบัน (ใช้เป็น fallback เมื่อโหลด favicon ไม่ได้)
const UNI_ABBR: Record<string, string> = {
  'จุฬาลงกรณ์':         'CU',
  'ธรรมศาสตร์':         'TU',
  'มหิดล':             'MU',
  'มหาสารคาม':          'MSU',
  'เทคโนโลยีสุรนารี':   'SUT',
  'เชียงใหม่':          'CMU',
  'สงขลานครินทร์':      'PSU',
  'พระจอมเกล้าธนบุรี':  'KMUTT',
  'ลาดกระบัง':          'KMITL',
  'ศรีนครินทรวิโรฒ':    'SWU',
  'พระนครเหนือ':        'KMUTNB',
  'บูรพา':             'BUU',
  'สวนสุนันทา':         'SSRU',
  'อุบลราชธานี':        'UBU',
  'เกษตรศาสตร์':        'KU',
  'ขอนแก่น':           'KKU',
  'นเรศวร':            'NU',
  'สยาม':              'SIAM',
  'กรุงเทพ':           'BU',
  'รังสิต':            'RSU',
  'อัสสัมชัญ':          'ABAC',
  'หอการค้าไทย':        'UTCC',
  'ศิลปากร':           'SU',
}

export function getUniAbbr(university: string): string {
  for (const [key, abbr] of Object.entries(UNI_ABBR)) {
    if (university.includes(key)) return abbr
  }
  // ไม่รู้จัก: ใช้อักษรไทยตัวแรก (ตัดคำนำหน้าทั่วไปออก) แทน
  return university.replace(/^(มหาวิทยาลัย|สถาบันเทคโนโลยี|สถาบัน)/, '').trim().charAt(0) || university.charAt(0)
}

/* ============ University Brand Color ============ */
// สีประจำมหาวิทยาลัยจริง (อ้างอิงจากประกาศ/หน้าเว็บทางการของแต่ละสถาบัน)
const UNI_COLOR: Record<string, string> = {
  'จุฬาลงกรณ์':          '#ec4899', // สีชมพู
  'ธรรมศาสตร์':          '#dc2626', // สีเหลือง-แดง
  'มหิดล':               '#2563eb', // สีน้ำเงิน
  'มหาสารคาม':           '#a16207', // สีเหลือง-เทา
  'เทคโนโลยีสุรนารี':     '#ea580c', // สีแสด-ทอง
  'เชียงใหม่':            '#7c3aed', // สีม่วงดอกรัก
  'สงขลานครินทร์':        '#1e40af', // สีน้ำเงิน
  'พระจอมเกล้าธนบุรี':    '#d97706', // สีแสด-เหลือง
  'ลาดกระบัง':            '#c2410c', // สีแสด
  'ศรีนครินทรวิโรฒ':      '#b91c1c', // สีเทา-แดง
  'พระนครเหนือ':          '#991b1b', // สีแดงหมากสุก
  'บูรพา':               '#57534e', // สีเทา-ทอง
  'สวนสุนันทา':           '#db2777', // สีน้ำเงิน-ชมพู
  'อุบลราชธานี':          '#eab308', // สีเหลือง
  'เกษตรศาสตร์':          '#16a34a', // สีเขียว
  'ขอนแก่น':             '#171717', // สีดำ-เหลือง
  'นเรศวร':              '#7c2d92', // สีม่วง
  'ศิลปากร':             '#059669', // สีเขียวเวอร์ริเดียน
}

export function hashHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return hash % 360
}

export function getUniColor(university: string): string {
  for (const [key, color] of Object.entries(UNI_COLOR)) {
    if (university.includes(key)) return color
  }
  // มหาวิทยาลัยที่ไม่มีในรายการ: สร้างสีที่คงที่เฉพาะตัว (สีเดิมทุกครั้งสำหรับชื่อเดิม)
  return `hsl(${hashHue(university)}, 60%, 42%)`
}

// ขนาดตัวอักษรของแบดจ์ ลดลงเมื่อตัวย่อยาวขึ้น เพื่อให้อ่านออกชัดเจนเสมอ
export function abbrFontScale(len: number): number {
  if (len <= 2) return 0.40
  if (len === 3) return 0.34
  if (len === 4) return 0.28
  if (len === 5) return 0.23
  return 0.19
}

// มหาวิทยาลัยที่ Google favicon คืนไอคอนสำรองทั่วไปแบบ "โหลดสำเร็จ" (ไม่ error) เช่น วงกลมตัวอักษรเดียวลอย ๆ
// จึง onError ตรวจจับไม่ได้ว่าโลโก้จริงไม่มี — สำหรับกลุ่มนี้ใช้ไฟล์โลโก้จริงที่เก็บไว้ใน /public แทน
// (วางไฟล์ไว้ที่ public/<key>.png แล้วอ้างอิงด้วย path เริ่มต้นด้วย / ตรง ๆ)
const LOCAL_LOGO: Record<string, string> = {
  'สวนสุนันทา':          '/ssru.png',  // มหาวิทยาลัยราชภัฏสวนสุนันทา
  'อุบลราชธานี':          '/ubu.png',   // มหาวิทยาลัยอุบลราชธานี
  'พระจอมเกล้าธนบุรี':    '/kmutt.png', // มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
  'เทคโนโลยีสุรนารี':      '/sut.png',   // มหาวิทยาลัยเทคโนโลยีสุรนารี
  'ลาดกระบัง':            '/kmitl.png', // สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง
}

export function getLocalLogo(university: string): string | null {
  for (const [key, path] of Object.entries(LOCAL_LOGO)) {
    if (university.includes(key)) return path
  }
  return null
}
