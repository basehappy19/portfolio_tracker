'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getPrograms() {
  return prisma.program.findMany({
    include: { documents: true },
    orderBy: { createdAt: 'asc' }
  })
}

export async function getSuggestions() {
  const [unis, facs, majors, currs] = await Promise.all([
    prisma.program.findMany({ select: { university: true }, distinct: ['university'], where: { university: { not: '' } } }),
    prisma.program.findMany({ select: { faculty: true }, distinct: ['faculty'], where: { faculty: { not: '' } } }),
    prisma.program.findMany({ select: { major: true }, distinct: ['major'], where: { major: { not: '' } } }),
    prisma.program.findMany({ select: { curriculum: true }, distinct: ['curriculum'], where: { curriculum: { not: '' } } }),
  ])
  return {
    universities: unis.map(u => u.university),
    faculties: facs.map(f => f.faculty),
    majors: majors.map(m => m.major).filter(Boolean),
    curriculums: currs.map(c => c.curriculum).filter(Boolean),
  }
}

export async function createProgram(data: any) {
  const { documents, ...programData } = data
  const created = await prisma.program.create({
    data: {
      ...programData,
      documents: {
        create: documents || []
      }
    },
    include: { documents: true }
  })
  revalidatePath('/')
  return created
}

export async function updateProgram(id: string, data: any) {
  const { documents, ...programData } = data
  
  await prisma.program.update({
    where: { id },
    data: {
      ...programData,
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
