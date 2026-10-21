import mongoose, { Schema, Document, Model } from 'mongoose';

export type KnowledgeKind = 'document' | 'video';

export const KNOWLEDGE_CATEGORIES = ['Drawing', 'GR', 'Circular', 'Document', 'Other'] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export interface IKnowledgeResource extends Document {
  title: string;
  description?: string;
  /** document = uploaded file, video = YouTube link */
  kind: KnowledgeKind;
  category: KnowledgeCategory;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  videoUrl?: string;
  tags: string[];
  /** Owner — uploader's user id. */
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeResourceSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    kind: {
      type: String,
      enum: ['document', 'video'],
      default: 'document',
      index: true,
    },
    category: {
      type: String,
      enum: KNOWLEDGE_CATEGORIES,
      default: 'Document',
      index: true,
    },
    fileUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    videoUrl: { type: String },
    tags: { type: [String], default: [] },
    createdBy: {
      type: String,
      required: [true, 'Uploader is required'],
      index: true,
    },
    createdByName: { type: String, default: '' },
  },
  { timestamps: true }
);

KnowledgeResourceSchema.index({ createdAt: -1 });

const KnowledgeResource: Model<IKnowledgeResource> =
  mongoose.models.KnowledgeResource ||
  mongoose.model<IKnowledgeResource>('KnowledgeResource', KnowledgeResourceSchema);

export default KnowledgeResource;
