import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRole extends Document {
  key: string;
  label: string;
  modules: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    key: {
      type: String,
      required: [true, 'Please provide a role key'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_]+$/, 'Role key may only contain A–Z, 0–9 and underscore'],
    },
    label: {
      type: String,
      required: [true, 'Please provide a role label'],
      trim: true,
    },
    modules: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Role: Model<IRole> = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);
export default Role;
