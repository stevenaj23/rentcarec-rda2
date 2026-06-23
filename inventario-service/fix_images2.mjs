import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres.lbqyzvdongzxdbidwdcg:Stevenrosero2323@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true' } }
});

const updates = [
  { id: '001fab94-b042-4d5f-8e3f-bfe1d16a7d8a', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/2016_Toyota_HiLux_Invincible_D-4D_4WD_2.4_Front.jpg/330px-2016_Toyota_HiLux_Invincible_D-4D_4WD_2.4_Front.jpg' },
  { id: '2f387a24-7da7-40f1-979f-04ce5bcb4d07', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/2025_Kia_Sportage_S_front_only.jpg/330px-2025_Kia_Sportage_S_front_only.jpg' },
  { id: 'c4065095-1598-4914-be0d-a6cdf5268ad2', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/2011_Nissan_Versa_1.6_Sedan.jpg/330px-2011_Nissan_Versa_1.6_Sedan.jpg' },
  { id: '6b5891de-5437-438e-91ce-4026bdc6acd9', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/2024_Mazda_CX-5_2.5_S_Select_in_Platinum_Quartz_Metallic%2C_front_right.jpg/330px-2024_Mazda_CX-5_2.5_S_Select_in_Platinum_Quartz_Metallic%2C_front_right.jpg' },
  { id: '3bfab747-bd7d-4a41-a596-f80f5ae20ffe', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Ford_Ranger_%28T6%2C_P703%29_Wildtrak_IMG_7320.jpg/330px-Ford_Ranger_%28T6%2C_P703%29_Wildtrak_IMG_7320.jpg' },
  { id: 'e556b209-fe2a-4ca2-8eca-abf4d1d67eb8', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Toyota_RAV4_XLE_%28facelift%29_%28front%29.jpg/330px-Toyota_RAV4_XLE_%28facelift%29_%28front%29.jpg' },
  { id: '860476d8-426c-46de-9a09-d7eabe50fc14', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Toyota_Corolla_Hybrid_%28E210%29_IMG_4338.jpg/330px-Toyota_Corolla_Hybrid_%28E210%29_IMG_4338.jpg' },
  { id: 'ab901f37-aee6-483c-bcfa-828f6ab1ecef', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/2018_Nissan_Navara_Tekna_DCi_Automatic_2.3.jpg/330px-2018_Nissan_Navara_Tekna_DCi_Automatic_2.3.jpg' },
];

for (const { id, url } of updates) {
  await prisma.vehiculo.update({ where: { id }, data: { imagenUrl: url }, select: { id: true } });
  console.log(`✓ ${id.substring(0,8)} actualizado`);
}
await prisma.$disconnect();
console.log('Listo.');
