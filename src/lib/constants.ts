export const STATUS_META: Record<string, { color: string, category: string }> = {
  "รอประกาศเกณฑ์":        { color:"neutral", category:"pending" },
  "ยังไม่เปิดรับสมัคร":     { color:"neutral", category:"pending" },
  "รอยื่นสมัคร":           { color:"warn",    category:"pending" },
  "ยื่นสมัครแล้ว":         { color:"accent",  category:"pending" },
  "ติดสัมภาษณ์":           { color:"accent",  category:"pending" },
  "รอยืนยันสิทธิ์":         { color:"warn",    category:"pending" },
  "ยืนยันสิทธิ์แล้ว":       { color:"success", category:"terminal" },
  "ไม่ผ่านการคัดเลือก":     { color:"danger",  category:"terminal" },
  "สละสิทธิ์":             { color:"neutral", category:"terminal" },
  "ยกเลิก/ไม่ยื่น":        { color:"neutral", category:"terminal" }
}

export const STATUS_ORDER = Object.keys(STATUS_META)

export const NEXT_STATUS: Record<string, string[]> = {
  "รอประกาศเกณฑ์":     ["รอยื่นสมัคร"],
  "ยังไม่เปิดรับสมัคร":  ["รอยื่นสมัคร"],
  "รอยื่นสมัคร":        ["ยื่นสมัครแล้ว"],
  "ยื่นสมัครแล้ว":       ["ติดสัมภาษณ์", "ไม่ผ่านการคัดเลือก"],
  "ติดสัมภาษณ์":        ["รอยืนยันสิทธิ์", "ไม่ผ่านการคัดเลือก"],
  "รอยืนยันสิทธิ์":      ["ยืนยันสิทธิ์แล้ว", "สละสิทธิ์"],
  "ยืนยันสิทธิ์แล้ว":    [],
  "ไม่ผ่านการคัดเลือก":  [],
  "สละสิทธิ์":          [],
  "ยกเลิก/ไม่ยื่น":     []
}

export const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
export const INTERVIEW_FORMAT_LABEL: Record<string, string> = { onsite:"Onsite", online:"Online" }
