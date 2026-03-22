import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6 },
  name:     { type: String, default: 'Admin' },
  picture:  { type: String },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },

  // OTP for password reset only
  otp:         { type: String },
  otpExpiry:   { type: Date },
  otpPurpose:  { type: String, enum: ['password_reset'] },
  otpAttempts: { type: Number, default: 0 },

  // Auto WhatsApp reminder settings
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

// Generate OTP for password reset
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp         = otp;
  this.otpExpiry   = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  this.otpPurpose  = 'password_reset';
  this.otpAttempts = 0;
  return otp;
};

userSchema.methods.verifyOTP = function (inputOtp) {
  if (!this.otp || !this.otpExpiry)       return false;
  if (new Date() > this.otpExpiry)         return false;
  if (this.otpAttempts >= 5)               return false;
  if (this.otp !== inputOtp.trim()) {
    this.otpAttempts++;
    return false;
  }
  // Clear OTP after success
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
