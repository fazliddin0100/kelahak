/**
 * Normurodov va Buxoro bo‘limidagi userlarni tekshirish
 * node scripts/debug-department-peers.mjs
 */
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(join(root, f), 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]+)"?\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
      }
    } catch {
      /* skip */
    }
  }
}

loadEnv();

const url = process.env.MONGOURL?.replace(/^"|"$/g, '');
if (!url) {
  console.error('MONGOURL yo‘q');
  process.exit(1);
}

const PersonalSchema = new mongoose.Schema({
  name: String,
  fName: String,
  sName: String,
  province: String,
});
const JobSchema = new mongoose.Schema({
  position: String,
  organ: String,
  department: String,
  militaryRank: String,
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  isUserTrue: Boolean,
});
const UserSchema = new mongoose.Schema({
  personal: { type: mongoose.Schema.Types.ObjectId, ref: 'Personal' },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
});
const RoleSchema = new mongoose.Schema({ role: String });

const Personal =
  mongoose.models.Personal || mongoose.model('Personal', PersonalSchema);
const Job = mongoose.models.Job || mongoose.model('Job', JobSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);

function norm(v) {
  if (!v) return '';
  return v
    .trim()
    .toLowerCase()
    .replace(/[''ʻ`']/g, "'")
    .replace(/\s+/g, ' ');
}

function isSameDept(a, t) {
  const aDept = norm(a.department);
  const tDept = norm(t.department);
  const aOrg = norm(a.organ);
  const tOrg = norm(t.organ);
  if (aDept && tDept && aDept === tDept) return true;
  if (aOrg && tOrg && aOrg === tOrg) return true;
  return false;
}

await mongoose.connect(url);

const target = await Personal.findOne({
  fName: /normurod/i,
  name: /normurod/i,
}).lean();

if (!target) {
  console.log('Normurodov Personal topilmadi, barcha shunga o‘xshash:');
  const similar = await Personal.find({
    $or: [
      { fName: /norm/i },
      { name: /norm/i },
      { sName: /norm/i },
    ],
  }).lean();
  console.log(JSON.stringify(similar, null, 2));
  await mongoose.disconnect();
  process.exit(0);
}

const anchorUser = await User.findOne({ personal: target._id })
  .populate('personal')
  .populate({ path: 'job', populate: { path: 'role' } })
  .lean();

console.log('\n=== ANCHOR (Normurodov) ===');
console.log('userId:', anchorUser?._id?.toString());
const ap = anchorUser?.personal;
const aj = anchorUser?.job;
console.log('FIO:', ap?.fName, ap?.name, ap?.sName);
console.log('province:', ap?.province);
console.log('organ:', aj?.organ);
console.log('department:', aj?.department);
console.log('isUserTrue:', aj?.isUserTrue);
console.log('role:', aj?.role?.role);

const province = ap?.province;
const provinceRegex = new RegExp(`^\\s*${province?.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
const inProvince = await Personal.find({ province: { $regex: provinceRegex } })
  .select('_id province fName name sName')
  .lean();
console.log('\n=== Viloyatda Personal soni ===', inProvince.length);
console.log('Namuna province qiymatlari:', [...new Set(inProvince.map((p) => p.province))].slice(0, 5));

const personIds = inProvince.map((p) => p._id);
const users = await User.find({
  _id: { $ne: anchorUser._id },
  personal: { $in: personIds },
})
  .populate('personal')
  .populate({ path: 'job', populate: { path: 'role' } })
  .lean();

console.log('\n=== Viloyatdagi boshqa Userlar (filtrsiz) ===', users.length);

const commanderRoles = new Set([
  'commander',
  'deputycommander',
  'departmentcommander',
  'departmentdeputy',
]);

const anchorUnit = { organ: aj?.organ ?? '', department: aj?.department ?? '' };

let passApproved = 0;
let passNotCommander = 0;
let passSameUnit = 0;

for (const u of users) {
  const p = u.personal;
  const j = u.job;
  if (!p || !j) continue;
  if (j.isUserTrue === false) continue;
  passApproved++;
  const roleName = norm(j.role?.role);
  if (commanderRoles.has(roleName)) continue;
  passNotCommander++;
  const noUnit = !norm(anchorUnit.department) && !norm(anchorUnit.organ);
  if (!noUnit && !isSameDept(anchorUnit, { organ: j.organ, department: j.department }))
    continue;
  passSameUnit++;
}

console.log('isUserTrue !== false:', passApproved);
console.log('komandir emas:', passNotCommander);
console.log('bir xil bo‘lim/organ:', passSameUnit);

console.log('\n=== Har bir user (qisqa) ===');
for (const u of users.slice(0, 30)) {
  const p = u.personal;
  const j = u.job;
  const roleName = norm(j?.role?.role);
  const same = isSameDept(anchorUnit, {
    organ: j?.organ,
    department: j?.department,
  });
  const ok =
    j?.isUserTrue !== false &&
    !commanderRoles.has(roleName) &&
    ( (!norm(anchorUnit.department) && !norm(anchorUnit.organ)) || same );
  console.log({
    ok,
    fio: `${p?.fName} ${p?.name} ${p?.sName}`,
    province: p?.province,
    organ: j?.organ,
    department: j?.department,
    isUserTrue: j?.isUserTrue,
    role: j?.role?.role,
    sameUnit: same,
  });
}

if (users.length > 30) console.log(`... va yana ${users.length - 30} ta`);

console.log('\n=== Buxoro bo‘yicha barcha unique department/organ ===');
const buxoroAll = await Personal.find({
  province: { $regex: /buxoro/i },
}).lean();
const buxoroIds = buxoroAll.map((p) => p._id);
const buxoroUsers = await User.find({ personal: { $in: buxoroIds } })
  .populate('job')
  .lean();
const depts = new Set();
const organs = new Set();
for (const u of buxoroUsers) {
  if (u.job?.department) depts.add(u.job.department);
  if (u.job?.organ) organs.add(u.job.organ);
}
console.log('departments:', [...depts].sort());
console.log('organs:', [...organs].sort());

await mongoose.disconnect();
