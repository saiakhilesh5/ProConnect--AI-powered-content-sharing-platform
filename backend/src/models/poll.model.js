import mongoose from 'mongoose';
const { Schema } = mongoose;

// Poll option sub-schema
const pollOptionSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      maxlength: 100,
    },
    votes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  { _id: true }
);

// Poll schema for group conversations
const pollSchema = new Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    question: {
      type: String,
      required: true,
      maxlength: 300,
    },
    options: {
      type: [pollOptionSchema],
      validate: [
        {
          validator: function(v) {
            return v.length >= 2 && v.length <= 10;
          },
          message: 'Poll must have between 2 and 10 options',
        },
      ],
    },
    // Poll settings
    allowMultipleVotes: {
      type: Boolean,
      default: false,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    showResultsBeforeVoting: {
      type: Boolean,
      default: false,
    },
    // Expiration
    expiresAt: {
      type: Date,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    closedAt: {
      type: Date,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Total votes count for quick access
    totalVotes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
pollSchema.index({ conversation: 1, createdAt: -1 });
pollSchema.index({ creator: 1 });
pollSchema.index({ expiresAt: 1 });

// Method to cast a vote
pollSchema.methods.castVote = async function(userId, optionIds) {
  const userIdStr = userId.toString();
  
  // Remove previous votes if not allowing multiple
  if (!this.allowMultipleVotes) {
    for (const option of this.options) {
      option.votes = option.votes.filter(v => v.toString() !== userIdStr);
    }
  }
  
  // Add new votes
  for (const optionId of optionIds) {
    const option = this.options.id(optionId);
    if (option && !option.votes.some(v => v.toString() === userIdStr)) {
      option.votes.push(userId);
    }
  }
  
  // Update total votes
  this.totalVotes = this.options.reduce((sum, opt) => sum + opt.votes.length, 0);
  
  await this.save();
  return this;
};

// Method to remove a vote
pollSchema.methods.removeVote = async function(userId, optionId) {
  const option = this.options.id(optionId);
  if (option) {
    option.votes = option.votes.filter(v => v.toString() !== userId.toString());
    this.totalVotes = this.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    await this.save();
  }
  return this;
};

// Method to close the poll
pollSchema.methods.closePoll = async function(userId) {
  this.isActive = false;
  this.closedAt = new Date();
  this.closedBy = userId;
  await this.save();
  return this;
};

// Virtual to get results
pollSchema.virtual('results').get(function() {
  return this.options.map(option => ({
    optionId: option._id,
    text: option.text,
    votesCount: option.votes.length,
    percentage: this.totalVotes > 0 
      ? Math.round((option.votes.length / this.totalVotes) * 100) 
      : 0,
    voters: this.isAnonymous ? [] : option.votes,
  }));
});

// Ensure virtuals are included in JSON
pollSchema.set('toJSON', { virtuals: true });
pollSchema.set('toObject', { virtuals: true });

export const Poll = mongoose.model('Poll', pollSchema);
