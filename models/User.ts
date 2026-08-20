import mongoose, { Schema, Document, Model } from 'mongoose';
import { ALL_AUDITOR_ROLES } from '@/lib/roles';

export interface INameHistoryEntry {
  name: string;
  designation?: string;
  changedAt: Date;
  changedBy?: string; // username of admin who made the change
}

export interface IUser extends Document {
  name: string;
  username: string;
  password?: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'VIEWER' | 'TENDERCLERK' | 'AUDITOR_BVN' | 'AUDITOR_TLJ' | 'AUDITOR_MHV' | 'AUDITOR_SHR' | 'AUDITOR_VLB' | 'AUDITOR_PLT';
  designation?: string;
  nameHistory: INameHistoryEntry[];
  createdAt: Date;
}

const NameHistoryEntrySchema = new Schema<INameHistoryEntry>({
  name: { type: String, required: true },
  designation: { type: String },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: String },
}, { _id: false });

const allRoles = ['ADMIN', 'SUPERVISOR', 'VIEWER', ...ALL_AUDITOR_ROLES];

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
  },
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  role: {
    type: String,
    enum: allRoles,
    default: 'VIEWER',
  },
  designation: {
    type: String,
    default: '',
  },
  nameHistory: {
    type: [NameHistoryEntrySchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
