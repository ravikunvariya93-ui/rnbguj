import mongoose, { Schema, Document, Model } from 'mongoose';

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
  /** Assigned role keys. First entry is the primary (display) role. */
  roles: string[];
  officeType: 'DIVISION' | 'SUB_DIVISION';
  jurisdiction: string;
  /** Sub-division whose bills this user passes (Auditor posted in Division office). Stores the doc id. */
  /** Sub-divisions whose bills this user passes (Auditor posted in Division office). Stores doc ids. */
  assignedSubDivisions: string[];
  nameHistory: INameHistoryEntry[];
  createdAt: Date;
}

const NameHistoryEntrySchema = new Schema<INameHistoryEntry>({
  name: { type: String, required: true },
  designation: { type: String },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: String },
}, { _id: false });

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
  roles: {
    type: [String],
    default: [],
  },
  officeType: {
    type: String,
    enum: ['DIVISION', 'SUB_DIVISION'],
    default: 'DIVISION',
  },
  jurisdiction: {
    type: String,
    default: '',
    trim: true,
  },
  assignedSubDivisions: {
    type: [String],
    default: [],
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
