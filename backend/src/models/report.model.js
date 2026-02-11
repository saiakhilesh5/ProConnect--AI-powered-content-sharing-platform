import mongoose from 'mongoose';

const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
      required: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    message: {
      type: String,
      maxlength: 500,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

// Prevent duplicate open reports from the same reporter for the same image
reportSchema.index({ image: 1, reporter: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });

export const Report = mongoose.model('Report', reportSchema);


