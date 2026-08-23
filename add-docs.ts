import { prisma } from './src/lib/db'

const docsByUni = {
  'จุฬาลงกรณ์มหาวิทยาลัย ': [],
  'จุฬาลงกรณ์มหาวิทยาลัย': [],
  'มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต': ['ปพ.1'],
  'มหาวิทยาลัยมหิดล': ['ปพ.1', 'Video Presentation', 'เรียงความภาษาไทย'],
  'มหาวิทยาลัยมหาสารคาม': ['หนังสือรับรองจากโรงเรียน', 'ปพ.1'],
  'มหาวิทยาลัยเทคโนโลยีสุรนารี': ['ปพ.1', 'หนังสือรับรองเป็นนักเรียนจากห้องเรียนทีเน้นด้านวิทยาศาสตร์'],
  'มหาวิทยาลัยเชียงใหม่': ['ปพ.1'],
  'มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตภูเก็ต': ['ปพ.1'],
  'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี': ['ปพ.1'],
  'มหาวิทยาลัยพระจอมเกล้าเจ้าคุณทหารลาดกระบัง วิทยาเขตชุมพร': ['ปพ.1'],
  'มหาวิทยาลัยศรีนครินทรวิโรฒ วิทยาเขตองค์รักษ์': ['ปพ.1'],
  'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ': [],
  'มหาวิทยาลัยบูรพา ': [],
  'มหาวิทยาลัยบูรพา': [],
  'มหาวิทยาลัยราชภัฏสวนสุนันทา': ['ปพ.1'],
  'มหาวิทยาลัยอุบลราชธานี': ['ปพ.1', 'หนังสือรับรองจำนวนหน่วยกิตและผลการเรียน']
}

async function main() {
  const programs = await prisma.program.findMany({
    include: { university: true }
  })

  for (const program of programs) {
    const uniName = program.university.name.trim()
    
    // Find matching uni key (handling trailing spaces if any)
    let matchedKey = Object.keys(docsByUni).find(k => k.trim() === uniName)
    
    if (matchedKey) {
      const docs = docsByUni[matchedKey]
      
      // Delete existing documents
      await prisma.document.deleteMany({
        where: { programId: program.id }
      })

      // Create new documents
      if (docs.length > 0) {
        await prisma.document.createMany({
          data: docs.map(text => ({
            programId: program.id,
            text,
            done: false
          }))
        })
      }
    }
  }
  console.log('Done adding documents!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
