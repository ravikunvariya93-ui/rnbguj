import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote extends Document {
    title: string;
    content: string;
    category: string;
    workName: string;
    priority: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const NoteSchema: Schema = new Schema({
    title: { type: String, required: true },
    content: { type: String },
    category: { type: String },
    workName: { type: String },
    priority: { type: String, default: 'Normal' },
    status: { type: String, default: 'Open' },
}, {
    timestamps: true,
});

// Avoid recompiling model in watch mode
const Note: Model<INote> = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default Note;
