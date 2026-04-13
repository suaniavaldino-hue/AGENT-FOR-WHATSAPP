import mongoose from 'mongoose';

const pipelineStageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, required: true },
    key: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

export default mongoose.model('PipelineStage', pipelineStageSchema);
