const { PrismaClient } = require('@prisma/client')
const { findCoordinatorsNearLocation } = require('../src/services/locationService')

const p = new PrismaClient()

;(async () => {
  const orphans = await p.caregiver.findMany({
    where: {
      verificationStatus: 'VERIFIED',
      coordinatorId: null,
    },
    include: { user: { select: { name: true, email: true } } },
  })

  console.log(`Found ${orphans.length} verified caregiver(s) without coordinator assignment`)

  for (const caregiver of orphans) {
    let coordinatorId = null

    if (caregiver.latitude != null && caregiver.longitude != null) {
      const nearby = await findCoordinatorsNearLocation(
        caregiver.latitude,
        caregiver.longitude,
      )
      coordinatorId = nearby[0]?.id ?? null
      if (nearby[0]) {
        console.log(
          `  ${caregiver.user.name} (#${caregiver.id}) → coordinator #${coordinatorId} (${nearby[0].agencyName || nearby[0].userId})`,
        )
      }
    }

    if (!coordinatorId) {
      console.log(`  ${caregiver.user.name} (#${caregiver.id}) — no nearby coordinator, skipped`)
      continue
    }

    await p.caregiver.update({
      where: { id: caregiver.id },
      data: {
        coordinatorId,
        registrationSource: 'COORDINATOR',
      },
    })
  }

  console.log('Backfill complete')
  await p.$disconnect()
})()
