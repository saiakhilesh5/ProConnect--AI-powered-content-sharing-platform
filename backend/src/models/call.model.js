import mongoose from 'mongoose';
const { Schema } = mongoose;

// Call participant sub-schema
const callParticipantSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
    },
    leftAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['ringing', 'connected', 'declined', 'missed', 'left'],
      default: 'ringing',
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    isVideoOff: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Call schema for audio/video calls
const callSchema = new Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    callType: {
      type: String,
      enum: ['audio', 'video'],
      required: true,
    },
    participants: [callParticipantSchema],
    status: {
      type: String,
      enum: ['initiating', 'ringing', 'ongoing', 'ended', 'missed', 'declined', 'failed'],
      default: 'initiating',
    },
    // Call timing
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    // For group calls
    isGroupCall: {
      type: Boolean,
      default: false,
    },
    maxParticipants: {
      type: Number,
      default: 2,
    },
    // Call quality metrics (optional)
    quality: {
      averageLatency: Number,
      packetLoss: Number,
      resolution: String,
    },
    // WebRTC signaling data (for pending calls)
    signalingData: {
      offer: Schema.Types.Mixed,
      answer: Schema.Types.Mixed,
      iceCandidates: [Schema.Types.Mixed],
    },
    // End reason
    endReason: {
      type: String,
      enum: ['completed', 'declined', 'missed', 'failed', 'busy', 'cancelled'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
callSchema.index({ conversation: 1, createdAt: -1 });
callSchema.index({ caller: 1 });
callSchema.index({ status: 1 });
callSchema.index({ 'participants.user': 1 });

// Method to start call
callSchema.methods.startCall = async function() {
  this.status = 'ongoing';
  this.startedAt = new Date();
  await this.save();
  return this;
};

// Method to end call
callSchema.methods.endCall = async function(reason = 'completed') {
  this.status = 'ended';
  this.endedAt = new Date();
  this.endReason = reason;
  
  if (this.startedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  
  // Update all connected participants to 'left'
  for (const participant of this.participants) {
    if (participant.status === 'connected') {
      participant.status = 'left';
      participant.leftAt = new Date();
    }
  }
  
  await this.save();
  return this;
};

// Method to add participant
callSchema.methods.addParticipant = async function(userId) {
  const existing = this.participants.find(p => p.user.toString() === userId.toString());
  if (existing) {
    existing.status = 'connected';
    existing.joinedAt = new Date();
  } else {
    this.participants.push({
      user: userId,
      status: 'connected',
      joinedAt: new Date(),
    });
  }
  await this.save();
  return this;
};

// Method to remove participant
callSchema.methods.removeParticipant = async function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.status = 'left';
    participant.leftAt = new Date();
    await this.save();
  }
  return this;
};

// Method to decline call
callSchema.methods.declineCall = async function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.status = 'declined';
  }
  
  // If all participants declined, mark call as declined
  const allDeclined = this.participants.every(p => p.status === 'declined');
  if (allDeclined) {
    this.status = 'declined';
    this.endReason = 'declined';
  }
  
  await this.save();
  return this;
};

// Virtual for formatted duration
callSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '0:00';
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Ensure virtuals are included in JSON
callSchema.set('toJSON', { virtuals: true });
callSchema.set('toObject', { virtuals: true });

export const Call = mongoose.model('Call', callSchema);
