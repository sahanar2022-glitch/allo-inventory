import { prisma } from "./prisma";

export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  const expired = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    select: { id: true, productId: true, warehouseId: true, quantity: true },
  });

  if (expired.length === 0) return 0;

  await prisma.reservation.updateMany({
    where: { id: { in: expired.map((r: { id: string; productId: string; warehouseId: string; quantity: number }) => r.id) } },
    data: { status: "RELEASED" },
  });

  for (const r of expired as { id: string; productId: string; warehouseId: string; quantity: number }[]) {
    await prisma.stockLevel.update({
      where: {
        productId_warehouseId: {
          productId: r.productId,
          warehouseId: r.warehouseId,
        },
      },
      data: { reserved: { decrement: r.quantity } },
    });
  }

  return expired.length;
}
