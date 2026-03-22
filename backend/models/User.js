import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email:    { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone:    { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, minlength: 6 },
  name:     { type: String, default: 'Admin' },
  picture:  { type: String },
  authProvider: { type: String, enum: ['local', 'google', 'phone'], default: 'local' },

  // OTP for phone login and password reset
  otp:          { type: String },
  otpExpiry:    { type: Date },
  otpPurpose:   { type: String, enum: ['phone_login', 'password_reset'] },
  otpAttempts:  { type: Number, default: 0 },

  // Auto-reminder settings
  reminderEnabled:     { type: Boolean, default: false },
  reminderDaysBefore:  { type: Number, default: 3, min: 1, max: 30 },
  reminderTime:        { type: String, default: '09:00' },
  reminderWhatsappKey: { type: String, default: '' },
  reminderLastRun:     { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Generate and store a 6-digit OTP
userSchema.methods.generateOTP = function (purpose) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp         = otp;
  this.otpExpiry   = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  this.otpPurpose  = purpose;
  this.otpAttempts = 0;
  return otp;
};

// Verify OTP — returns true/false, increments attempts
userSchema.methods.verifyOTP = function (inputOtp, purpose) {
  if (!this.otp || !this.otpExpiry)   return false;
  if (this.otpPurpose !== purpose)    return false;
  if (new Date() > this.otpExpiry)    return false;
  if (this.otpAttempts >= 5)          return false; // max 5 attempts
  if (this.otp !== inputOtp.trim())   { this.otpAttempts++; return false; }
  // Clear OTP after successful verify
  this.otp = undefined;
  this.otpExpiry = undefined;
  this.otpPurpose = undefined;
  this.otpAttempts = 0;
  return true;
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  delete obj.otpAttempts;
  return obj;
};

export default mongoose.model('User', userSchema);
