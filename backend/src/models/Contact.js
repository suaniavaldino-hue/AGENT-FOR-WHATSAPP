import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, default: '' },
    status: {
      type: String,
      enum: ['novo_lead', 'em_atendimento', 'proposta', 'fechado'],
      default: 'novo_lead'
    },
    tags: { type: [String], default: [] },
    notes: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model('Contact', contactSchema);
