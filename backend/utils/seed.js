import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';

dotenv.config();

// ── Admin credentials — change before first deploy ────────────────────────────
// Or pass via env: SEED_EMAIL=x SEED_PASSWORD=y SEED_NAME=z node utils/seed.js
const ADMIN_EMAIL    = process.env.SEED_EMAIL    || 'vaultledger05@gmail.com';
const ADMIN_PASSWORD = process.env.SEED_PASSWORD || 'VaultLedger@2026';
const ADMIN_NAME     = process.env.SEED_NAME     || 'Admin';

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');

  // Safety check: abort if ANY users exist in the database.
  // This prevents wiping live data if SEED_EMAIL differs from the stored admin.
  const totalUsers = await User.countDocuments();
  if (totalUsers > 0) {
    console.log(`ℹ️  Database already contains ${totalUsers} user(s). Seed aborted.`);
    console.log('   To fully re-seed, manually delete all documents in MongoDB Atlas and re-run.');
    process.exit(0);
  }

  // No users exist — safe to seed from scratch
  await Loan.deleteMany({});
  await Payment.deleteMany({});

  // Create admin
  const admin = await User.create({
    email:    ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    name:     ADMIN_NAME,
  });

  console.log('');
  console.log('✅ Admin created:');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log('   Password: [hidden — check your SEED_PASSWORD env var]');
  console.log('   ⚠️  Change this password immediately after first login!');

  // ── Sample loan data ──────────────────────────────────────────────────────
  const now    = new Date();
  const months = (n) => new Date(now.getFullYear(), now.getMonth() - n, now.getDate());

  const loans = await Loan.insertMany([
    {
      borrowerName:    'Amit Verma',
      borrowerPhone:   '+91 9876543210',
      borrowerAddress: 'Sector 15, Noida, UP',
      principal: 500000, interestRate: 12, interestType: 'SI',
      startDate: months(18), status: 'active',
      emiEnabled: true, emiAmount: 9334, tenure: 60,
      penaltyEnabled: true, penaltyType: 'percentage', penaltyRate: 2, penaltyGraceDays: 5,
      notes: 'Business loan for shop renovation',
      owner: admin._id,
    },
    {
      borrowerName:    'Priya Singh',
      borrowerPhone:   '+91 9876543211',
      borrowerAddress: 'Karol Bagh, New Delhi',
      principal: 250000, interestRate: 15, interestType: 'CI',
      compoundingFrequency: 'monthly',
      startDate: months(10), status: 'active',
      emiEnabled: false, penaltyEnabled: false,
      notes: 'Personal loan for medical expenses',
      owner: admin._id,
    },
    {
      borrowerName:    'Suresh Kumar',
      borrowerPhone:   '+91 9876543212',
      borrowerAddress: 'Lajpat Nagar, New Delhi',
      principal: 100000, interestRate: 18, interestType: 'SI',
      startDate: months(6), status: 'active',
      emiEnabled: true, emiAmount: 2533, tenure: 48,
      penaltyEnabled: true, penaltyType: 'flat', penaltyRate: 500, penaltyGraceDays: 3,
      owner: admin._id,
    },
    {
      borrowerName:    'Meera Joshi',
      borrowerPhone:   '+91 9876543213',
      borrowerAddress: 'Vaishali, Ghaziabad',
      principal: 750000, interestRate: 10, interestType: 'CI',
      compoundingFrequency: 'yearly',
      startDate: months(24), status: 'closed', closedDate: months(2),
      emiEnabled: true, emiAmount: 15936, tenure: 60,
      notes: 'Home renovation — fully repaid',
      owner: admin._id,
    },
    {
      borrowerName:    'Vikram Malhotra',
      borrowerPhone:   '+91 9876543214',
      borrowerAddress: 'Dwarka, New Delhi',
      principal: 300000, interestRate: 14, interestType: 'SI',
      startDate: months(4), status: 'paused',
      pausePeriods: [{ startDate: months(1), reason: 'Borrower hospitalized', isActive: true }],
      emiEnabled: false,
      owner: admin._id,
    },
    {
      borrowerName:    'Anita Kapoor',
      borrowerPhone:   '+91 9876543215',
      borrowerAddress: 'Rohini, New Delhi',
      principal: 150000, interestRate: 16, interestType: 'CI',
      compoundingFrequency: 'monthly',
      startDate: months(8), status: 'active',
      emiEnabled: true, emiAmount: 3652, tenure: 48,
      owner: admin._id,
    },
  ]);
  console.log(`✅ ${loans.length} sample loans created`);

  // Payments
  const payments = await Payment.insertMany([
    ...Array.from({ length: 18 }, (_, i) => ({
      loan: loans[0]._id, amount: 9334,
      paymentDate: new Date(now.getFullYear(), now.getMonth() - 17 + i, 5),
      type: 'emi', owner: admin._id,
    })),
    { loan: loans[1]._id, amount: 50000, paymentDate: months(8), type: 'partial', owner: admin._id },
    { loan: loans[1]._id, amount: 40000, paymentDate: months(5), type: 'partial', owner: admin._id },
    { loan: loans[1]._id, amount: 30000, paymentDate: months(2), type: 'partial', owner: admin._id },
    ...Array.from({ length: 4 }, (_, i) => ({
      loan: loans[2]._id, amount: 2533,
      paymentDate: new Date(now.getFullYear(), now.getMonth() - 5 + i, 10),
      type: 'emi', owner: admin._id,
    })),
    { loan: loans[3]._id, amount: 750000, paymentDate: months(2), type: 'full', note: 'Full settlement', owner: admin._id },
    ...Array.from({ length: 5 }, (_, i) => ({
      loan: loans[5]._id, amount: 3652,
      paymentDate: new Date(now.getFullYear(), now.getMonth() - 7 + i, 15),
      type: 'emi', owner: admin._id,
    })),
  ]);
  console.log(`✅ ${payments.length} payment records created`);

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('─────────────────────────────────────');
  console.log(' LOGIN CREDENTIALS');
  console.log('─────────────────────────────────────');
  console.log(` Email:    ${ADMIN_EMAIL}`);
  console.log(' Password: [hidden — use the value you set for SEED_PASSWORD]');
  console.log('─────────────────────────────────────');
  console.log(' ⚠️  Change password via Settings after first login!');
  console.log('');
  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
