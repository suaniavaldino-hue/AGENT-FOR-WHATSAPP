import mongoose from 'mongoose';

const automationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    trigger: { type: String, enum: ['new_contact', 'keyword', 'manual'], default: 'keyword' },
    keyword: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    nodes: { type: [Object], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model('Automation', automationSchema);
