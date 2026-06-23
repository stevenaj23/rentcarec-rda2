import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.lbqyzvdongzxdbidwdcg:Stevenrosero2323@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

const updates = [
  { id: '001fab94-b042-4d5f-8e3f-bfe1d16a7d8a', url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/2021_Toyota_Hilux_Invincible_D-4D_4WD_2.4.jpg' },
  { id: '2f387a24-7da7-40f1-979f-04ce5bcb4d07', url: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Kia_Sportage_1.6_T-GDI_HEV_2WD_%282022%29.jpg' },
  { id: 'c4065095-1598-4914-be0d-a6cdf5268ad2', url: 'https://upload.wikimedia.org/wikipedia/commons/7/76/2020_Nissan_Versa_SV_1.6L%2C_front_2.29.20.jpg' },
  { id: '6b5891de-5437-438e-91ce-4026bdc6acd9', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Mazda_CX-5_%28front%29.jpg' },
  { id: '3bfab747-bd7d-4a41-a596-f80f5ae20ffe', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Ford_Ranger_Double_Cab_02.jpg' },
  { id: 'e556b209-fe2a-4ca2-8eca-abf4d1d67eb8', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Toyota_RAV4_2.5L_LTD_HEV_2022_%282%29.jpg' },
  { id: '860476d8-426c-46de-9a09-d7eabe50fc14', url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/2022_Toyota_Corolla_Touring_G.jpg' },
  { id: 'ab901f37-aee6-483c-bcfa-828f6ab1ecef', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/2021_Nissan_Navara_facelift.jpg' },
];

for (const { id, url } of updates) {
  const result = await prisma.vehiculo.update({
    where: { id },
    data: { imagenUrl: url },
    select: { id: true, imagenUrl: true }
  });
  console.log(`✓ ${id.substring(0,8)} → ${result.imagenUrl}`);
}

await prisma.$disconnect();
console.log('\nTodas las imágenes actualizadas.');
