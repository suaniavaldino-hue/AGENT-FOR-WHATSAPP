import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    senderType: { type: String, enum: ['agent', 'contact', 'bot'], required: true },
    text: { type: String, default: '' },
    type: { type: String, enum: ['text', 'image', 'video', 'document'], default: 'text' },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    status: { type: String, enum: ['pending', 'sent', 'delivered', 'read', 'failed'], default: 'sent' },
    meta: { type: Object, default: {} }
  },
  { timestamps: true }
);

export default mongoose.model('Message', messageSchema);
