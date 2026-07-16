/**
 * MongoDB → PostgreSQL ma’lumot migratsiyasi
 *
 *   npm run docker:up
 *   npm run db:push
 *   npm run db:migrate-data
 */
import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();
const BATCH = 200;

function oid(doc) {
  if (!doc) return null;
  if (typeof doc === 'string') return doc;
  return String(doc._id ?? doc);
}

function refId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  return String(val._id ?? val);
}

function newId() {
  return randomBytes(12).toString('hex');
}

function toJson(val, fallback = null) {
  if (val === undefined || val === null) return fallback;
  return JSON.parse(JSON.stringify(val));
}

async function migrateRoles(col) {
  const docs = await col.find().toArray();
  console.log(`→ roles: ${docs.length}`);
  for (const d of docs) {
    await prisma.role.upsert({
      where: { id: oid(d) },
      create: {
        id: oid(d),
        role: d.role,
        province: d.province,
        permissions: d.permissions ?? [],
        createdAt: d.createdAt ?? new Date(),
        updatedAt: d.updatedAt ?? new Date(),
      },
      update: {},
    });
  }
}

async function migrateDevices(col) {
  const docs = await col.find().toArray();
  console.log(`→ devices: ${docs.length}`);
  for (const d of docs) {
    await prisma.device.upsert({
      where: { id: oid(d) },
      create: {
        id: oid(d),
        mac: d.mac,
        ip: d.ip,
        hostname: d.hostname,
        note: d.note,
        lastSeen: d.lastSeen,
        createdAt: d.createdAt ?? new Date(),
        updatedAt: d.updatedAt ?? new Date(),
      },
      update: {},
    });
  }
}

async function migrateUsers(db) {
  const users = await db.collection('users').find().toArray();
  console.log(`→ users: ${users.length}`);

  for (const u of users) {
    const userId = oid(u);
    const personal = u.personal ?
      await db.collection('personals').findOne({ _id: u.personal })
    : null;
    const auth =
      u.auth ? await db.collection('auths').findOne({ _id: u.auth }) : null;
    const job = u.job ? await db.collection('jobs').findOne({ _id: u.job }) : null;

    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        createdAt: u.createdAt ?? new Date(),
        updatedAt: u.updatedAt ?? new Date(),
      },
      update: {},
    });

    if (personal) {
      await prisma.personal.upsert({
        where: { id: oid(personal) },
        create: {
          id: oid(personal),
          userId,
          name: personal.name,
          fName: personal.fName,
          sName: personal.sName,
          province: personal.province,
          createdAt: personal.createdAt ?? new Date(),
          updatedAt: personal.updatedAt ?? new Date(),
        },
        update: {},
      });
    }

    if (auth) {
      await prisma.auth.upsert({
        where: { id: oid(auth) },
        create: {
          id: oid(auth),
          userId,
          login: auth.login,
          password: auth.password,
          createdAt: auth.createdAt ?? new Date(),
          updatedAt: auth.updatedAt ?? new Date(),
        },
        update: {},
      });
    }

    if (job) {
      await prisma.job.upsert({
        where: { id: oid(job) },
        create: {
          id: oid(job),
          userId,
          roleId: refId(job.role),
          position: job.position,
          organ: job.organ,
          department: job.department,
          militaryRank: job.militaryRank,
          isUserTrue: job.isUserTrue ?? false,
          createdAt: job.createdAt ?? new Date(),
          updatedAt: job.updatedAt ?? new Date(),
        },
        update: {},
      });
    }

    for (const deviceId of (u.devices ?? []).map(refId).filter(Boolean)) {
      await prisma.userDevice.upsert({
        where: { userId_deviceId: { userId, deviceId } },
        create: { userId, deviceId },
        update: {},
      });
    }
  }
}

async function migrateBolimBolim(db) {
  for (const [mongoName, prismaDelegate, field] of [
    ['bolims', prisma.bolim, 'bolim'],
    ['bolinmas', prisma.bolinma, 'bolinma'],
  ]) {
    const docs = await db.collection(mongoName).find().toArray();
    console.log(`→ ${mongoName}: ${docs.length}`);
    for (const d of docs) {
      await prismaDelegate.upsert({
        where: { id: oid(d) },
        create: {
          id: oid(d),
          province: d.province,
          [field]: d[field],
          createdAt: d.createdAt ?? new Date(),
          updatedAt: d.updatedAt ?? new Date(),
        },
        update: {},
      });
    }
  }
}

async function migrateNomeklatura(col) {
  const docs = await col.find().toArray();
  console.log(`→ nomeklatura: ${docs.length}`);
  for (const d of docs) {
    const id = oid(d);
    await prisma.nomeklatura.upsert({
      where: { id },
      create: {
        id,
        registrationIndex: d.registrationIndex,
        title: d.title,
        grif: d.grif,
        saqlashMuddati: toJson(d.saqlashMuddati, ''),
        qonunTuri: d.qonunTuri,
        ownerId: refId(d.owner),
        creatorId: refId(d.nameklaturaniYaratganUser),
        ownerRegion: d.ownerRegion,
        author: toJson(d.author, {}),
        status: d.status ?? 'CREATED',
        createdAt: d.createdAt ?? new Date(),
        updatedAt: d.updatedAt ?? new Date(),
      },
      update: {},
    });

    for (const bolimId of (d.bolim ?? []).map(refId).filter(Boolean)) {
      await prisma.nomeklaturaBolim.upsert({
        where: { nomeklaturaId_bolimId: { nomeklaturaId: id, bolimId } },
        create: { nomeklaturaId: id, bolimId },
        update: {},
      });
    }
    for (const bolinmaId of (d.bolinma ?? []).map(refId).filter(Boolean)) {
      await prisma.nomeklaturaBolinma.upsert({
        where: { nomeklaturaId_bolinmaId: { nomeklaturaId: id, bolinmaId } },
        create: { nomeklaturaId: id, bolinmaId },
        update: {},
      });
    }
  }
}

async function migrateDocuments(col) {
  const total = await col.countDocuments();
  console.log(`→ documents: ${total}`);

  let skip = 0;
  while (skip < total) {
    const batch = await col.find().skip(skip).limit(BATCH).toArray();
    for (const d of batch) {
      const id = oid(d);
      await prisma.document.upsert({
        where: { id },
        create: {
          id,
          title: d.title,
          grif: d.grif,
          position: d.position,
          militaryRank: d.militaryRank,
          fullName: d.fullName,
          copyNumber: d.copyNumber ?? [],
          copyIndex: d.copyIndex,
          copyTotal: d.copyTotal,
          approvers: toJson(d.approvers, []),
          sender: toJson(d.sender),
          receiver: toJson(d.receiver, []),
          author: toJson(d.author),
          bosSigned: toJson(d.bosSigned),
          forwardedSigner: toJson(d.forwardedSigner),
          forwardedTo: toJson(d.forwardedTo, []),
          ownerAcceptedBy: toJson(d.ownerAcceptedBy),
          ownerId: refId(d.owner),
          status: d.status ?? 'yangi',
          sharedWithAdmin: d.sharedWithAdmin ?? false,
          sentToCommander: d.sentToCommander ?? false,
          sentToCommanderAt: d.sentToCommanderAt,
          submittedToKotibiyat: d.submittedToKotibiyat ?? false,
          submittedToKotibiyatAt: d.submittedToKotibiyatAt,
          createdByKotibiyat: d.createdByKotibiyat ?? false,
          nomenclatureId: d.nomenclatureId ? refId(d.nomenclatureId) : null,
          registrationIndex: d.registrationIndex,
          year: d.year,
          ownerRegion: d.ownerRegion,
          sourceRegion: d.sourceRegion,
          parentId: d.parentId ? refId(d.parentId) : null,
          isCopy: d.isCopy ?? false,
          forwardedById: d.forwardedBy ? refId(d.forwardedBy) : null,
          forwardedAt: d.forwardedAt,
          forwardedComment: d.forwardedComment,
          currentViewIndex: d.currentViewIndex ?? 0,
          replyToId: d.replyTo ? refId(d.replyTo) : null,
          resolvedAt: d.resolvedAt,
          ownerAccepted: d.ownerAccepted ?? false,
          ownerAcceptedAt: d.ownerAcceptedAt,
          createdAt: d.createdAt ?? new Date(),
          updatedAt: d.updatedAt ?? new Date(),
        },
        update: {},
      });

      if (d.content && Object.keys(d.content).length > 0) {
        await prisma.documentContent.upsert({
          where: { documentId: id },
          create: {
            documentId: id,
            content: toJson(d.content, {}),
            updatedAt: new Date(),
          },
          update: { content: toJson(d.content, {}), updatedAt: new Date() },
        });
      }

      for (const userId of (d.allowedUsers ?? []).map(refId).filter(Boolean)) {
        await prisma.documentAllowedUser.upsert({
          where: { documentId_userId: { documentId: id, userId } },
          create: { documentId: id, userId },
          update: {},
        });
      }

      for (const attId of (d.attachmentText ?? []).map(refId).filter(Boolean)) {
        await prisma.documentAttachment.upsert({
          where: { documentId_attachmentId: { documentId: id, attachmentId: attId } },
          create: { documentId: id, attachmentId: attId },
          update: {},
        });
      }
    }
    skip += BATCH;
    console.log(`  ... ${Math.min(skip, total)}/${total}`);
  }
}

async function migrateFiles(col) {
  const docs = await col.find().toArray();
  console.log(`→ files: ${docs.length}`);
  for (const d of docs) {
    await prisma.file.upsert({
      where: { id: oid(d) },
      create: {
        id: oid(d),
        nomi: d.nomi,
        raqami: d.raqami,
        maxfiylik: d.maxfiylik,
        sanasi: d.sanasi,
        ownerRegion: d.ownerRegion,
        userUploadId: refId(d.userUploadFile),
        filePath: d.filePath,
        createdAt: d.createdAt ?? new Date(),
        updatedAt: d.updatedAt ?? new Date(),
      },
      update: {},
    });
  }
}

async function migrateRegistrations(db) {
  const counters = await db.collection('registration_counters').find().toArray();
  console.log(`→ registration_counters: ${counters.length}`);
  for (const d of counters) {
    await prisma.registrationCounter.upsert({
      where: { ownerRegion_year: { ownerRegion: d.ownerRegion, year: d.year } },
      create: {
        id: oid(d) || newId(),
        ownerRegion: d.ownerRegion,
        year: d.year,
        seq: d.seq ?? 0,
        createdAt: d.createdAt ?? new Date(),
        updatedAt: d.updatedAt ?? new Date(),
      },
      update: { seq: d.seq ?? 0 },
    });
  }

  const regs = await db.collection('registration').find().toArray();
  console.log(`→ registration: ${regs.length}`);
  for (const d of regs) {
    await prisma.registration.upsert({
      where: {
        ownerRegion_year_documentId: {
          ownerRegion: d.ownerRegion,
          year: d.year,
          documentId: d.documentId,
        },
      },
      create: {
        id: oid(d) || newId(),
        registrationIndex: d.registrationIndex,
        year: d.year,
        ownerRegion: d.ownerRegion,
        documentId: d.documentId,
        createdAt: d.createdAt ?? new Date(),
        updatedAt: d.updatedAt ?? new Date(),
      },
      update: {},
    });
  }
}

async function migrateSecurity(db) {
  const logs = await db.collection('securitylogs').find().toArray();
  console.log(`→ securitylogs: ${logs.length}`);
  for (const d of logs) {
    await prisma.securityLog.upsert({
      where: { id: oid(d) },
      create: {
        id: oid(d),
        type: d.type,
        ip: d.ip,
        path: d.path,
        method: d.method ?? 'GET',
        userAgent: d.userAgent?.slice(0, 500),
        loginHint: d.loginHint,
        message: d.message,
        statusCode: d.statusCode,
        createdAt: d.createdAt ?? new Date(),
      },
      update: {},
    });
  }

  const blocked = await db.collection('blockedips').find().toArray();
  console.log(`→ blockedips: ${blocked.length}`);
  for (const d of blocked) {
    await prisma.blockedIp.upsert({
      where: { ip: d.ip },
      create: {
        id: oid(d) || newId(),
        ip: d.ip,
        reason: d.reason ?? '',
        blockedBy: d.blockedBy ?? '',
        source: d.source ?? 'manual',
        active: d.active ?? true,
        createdAt: d.createdAt ?? new Date(),
        updatedAt: d.updatedAt ?? new Date(),
      },
      update: {},
    });
  }
}

async function main() {
  const mongoUrl = process.env.MONGOURL;
  if (!mongoUrl) throw new Error('MONGOURL kerak');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL kerak');

  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db();

  console.log(`MongoDB: ${db.databaseName}`);
  console.log('Migratsiya boshlandi...\n');

  await migrateRoles(db.collection('roles'));
  await migrateDevices(db.collection('devices'));
  await migrateUsers(db);
  await migrateBolimBolim(db);
  await migrateNomeklatura(db.collection('nomeklatura'));
  await migrateDocuments(db.collection('documents'));
  await migrateFiles(db.collection('files'));
  await migrateRegistrations(db);
  await migrateSecurity(db);

  console.log('\n✓ Migratsiya tugadi');
  await client.close();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
