import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJurisdiction extends Document {
  name: string;
  /** DIVISION or SUB_DIVISION */
  type: 'DIVISION' | 'SUB_DIVISION';
  /**
   * Key used to match data records (Package/ApprovedWork subDivision).
   * Defaults to the name; stays stable even if the display name changes.
   */
  matchKey: string;
  /** Parent division (for sub-divisions) */
  parent?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const JurisdictionSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Please provide a jurisdiction name'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['DIVISION', 'SUB_DIVISION'],
    required: [true, 'Please provide a jurisdiction type'],
    default: 'SUB_DIVISION',
  },
  matchKey: {
    type: String,
    trim: true,
    default: '',
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Jurisdiction',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Same name may exist once per level (Bhavnagar is both a Division and a Sub Division).
JurisdictionSchema.index({ name: 1, type: 1 }, { unique: true });

const Jurisdiction: Model<IJurisdiction> =
  mongoose.models.Jurisdiction || mongoose.model<IJurisdiction>('Jurisdiction', JurisdictionSchema);
export default Jurisdiction;
