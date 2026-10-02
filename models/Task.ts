import mongoose, { Schema, Document, Model } from 'mongoose';

export type TaskStatus = 'pending' | 'done';

export interface ITask extends Document {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate?: Date | null;
  /** Owner — tasks are strictly personal (only the creator's tasks are ever listed). */
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'done'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      required: [true, 'Task owner is required'],
      index: true,
    },
  },
  { timestamps: true }
);

TaskSchema.index({ createdBy: 1, createdAt: -1 });

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
export default Task;
