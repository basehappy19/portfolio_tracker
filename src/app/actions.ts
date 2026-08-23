'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getPrograms() {
  const programs = await prisma.program.findMany({
    include: { 
      documents: true,
      university: true,
      faculty: true,
      major: true,
      curriculum: true,
      round: true
    },
    orderBy: { createdAt: 'asc' }
  })
  
  return programs.map((p: any) => ({
    ...p,
    university: p.university?.name || '',
    faculty: p.faculty?.name || '',
    major: p.major?.name || '',
    curriculum: p.curriculum?.name || '',
    round: p.round?.name || '',
  }))
}

export async function verifyPin(pin: string) {
  return pin === process.env.TRACKER_PIN
}

export async function getSuggestions() {
  const [unis, facs, majors, currs] = await Promise.all([
    prisma.university.findMany({ select: { name: true } }),
    prisma.faculty.findMany({ select: { name: true } }),
    prisma.major.findMany({ select: { name: true } }),
    prisma.curriculum.findMany({ select: { name: true } }),
  ])
  return {
    universities: unis.map(u => u.name),
    faculties: facs.map(f => f.name),
    majors: majors.map(m => m.name),
    curriculums: currs.map(c => c.name),
  }
}

async function resolveRelations(data: any) {
  const { university, faculty, major, curriculum, round, ...rest } = data
  const relations: any = {}

  if (university) {
    const u = await prisma.university.upsert({ where: { name: university }, update: {}, create: { name: university } })
    relations.universityId = u.id
  }
  if (faculty) {
    const f = await prisma.faculty.upsert({ where: { name: faculty }, update: {}, create: { name: faculty } })
    relations.facultyId = f.id
  } else {
    relations.facultyId = null
  }
  if (major) {
    const m = await prisma.major.upsert({ where: { name: major }, update: {}, create: { name: major } })
    relations.majorId = m.id
  } else {
    relations.majorId = null
  }
  if (curriculum) {
    const c = await prisma.curriculum.upsert({ where: { name: curriculum }, update: {}, create: { name: curriculum } })
    relations.curriculumId = c.id
  } else {
    relations.curriculumId = null
  }
  if (round) {
    const r = await prisma.round.upsert({ where: { name: round }, update: {}, create: { name: round } })
    relations.roundId = r.id
  } else {
    relations.roundId = null
  }

  return { rest, relations }
}

export async function createProgram(data: any) {
  const { documents, ...programData } = data
  const { rest, relations } = await resolveRelations(programData)
  
  const created = await prisma.program.create({
    data: {
      ...rest,
      ...relations,
      documents: {
        create: documents || []
      }
    },
    include: { documents: true, university: true, faculty: true, major: true, curriculum: true, round: true }
  })
  revalidatePath('/')
  
  return {
    ...created,
    university: created.university?.name || '',
    faculty: created.faculty?.name || '',
    major: created.major?.name || '',
    curriculum: created.curriculum?.name || '',
    round: created.round?.name || '',
  }
}

export async function updateProgram(id: string, data: any) {
  const { documents, ...programData } = data
  const { rest, relations } = await resolveRelations(programData)
  
  await prisma.program.update({
    where: { id },
    data: {
      ...rest,
      ...relations,
      documents: {
        deleteMany: {},
        create: documents || []
      }
    }
  })
  revalidatePath('/')
}

export async function deleteProgram(id: string) {
  await prisma.program.delete({ where: { id } })
  revalidatePath('/')
}

export async function toggleDocument(docId: string, done: boolean) {
  await prisma.document.update({
    where: { id: docId },
    data: { done }
  })
  revalidatePath('/')
}

export async function setFeePaid(programId: string, feePaid: boolean) {
  await prisma.program.update({
    where: { id: programId },
    data: { feePaid }
  })
  revalidatePath('/')
}

export async function setPriority(programId: string, priority: number) {
  await prisma.program.update({
    where: { id: programId },
    data: { priority }
  })
  revalidatePath('/')
}

export async function updateStatus(programId: string, status: string) {
  await prisma.program.update({
    where: { id: programId },
    data: { status }
  })
  revalidatePath('/')
}

export async function seedPrograms(programsData: any[]) {
  for (const p of programsData) {
    const { id, documents, ...programData } = p
    await prisma.program.create({
      data: {
        ...programData,
        documents: {
          create: documents || []
        }
      }
    })
  }
  revalidatePath('/')
}
