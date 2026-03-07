import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { Call } from '../models/call.model.js';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';

// Store connected users: { odId: { socketId, online } }
const connectedUsers = new Map();

// Store active calls: { callId: { participants: Set<userId>, room: callId } }
const activeCalls = new Map();

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id || decoded.userId).select('_id username fullName profilePicture');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${socket.user.username} (${userId})`);

    // Store user connection
    connectedUsers.set(userId, {
      socketId: socket.id,
      online: true,
      lastActive: new Date(),
    });

    // Update user online status in database
    User.findByIdAndUpdate(userId, { 
      isOnline: true, 
      lastActive: new Date() 
    }).catch(console.error);

    // Broadcast online status to all relevant users
    socket.broadcast.emit('user:online', { userId });

    // Join user's personal room for private events
    socket.join(`user:${userId}`);

    // ==================== PRESENCE EVENTS ====================

    socket.on('user:typing', async ({ conversationId, isTyping }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        // Emit to other participants
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== userId) {
            io.to(`user:${participantId}`).emit('user:typing', {
              conversationId,
              userId,
              user: socket.user,
              isTyping,
            });
          }
        });
      } catch (error) {
        console.error('Typing event error:', error);
      }
    });

    // ==================== MESSAGE EVENTS ====================

    socket.on('message:send', async ({ conversationId, message }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        // Emit to all participants
        conversation.participants.forEach(participantId => {
          io.to(`user:${participantId}`).emit('message:new', {
            conversationId,
            message,
          });
        });
      } catch (error) {
        console.error('Message send error:', error);
      }
    });

    socket.on('message:read', ({ conversationId, messageIds }) => {
      // Broadcast read status to conversation participants
      socket.to(`conversation:${conversationId}`).emit('message:read', {
        userId,
        conversationId,
        messageIds,
      });
    });

    // ==================== CALL EVENTS ====================

    // Initiate a call
    socket.on('call:initiate', async ({ conversationId, callType }) => {
      try {
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', '_id fullName username profilePicture');

        if (!conversation) {
          socket.emit('call:error', { message: 'Conversation not found' });
          return;
        }

        // Check if user is participant
        if (!conversation.participants.some(p => p._id.toString() === userId)) {
          socket.emit('call:error', { message: 'Not a participant' });
          return;
        }

        // Check for existing active call
        const existingCall = await Call.findOne({
          conversation: conversationId,
          status: { $in: ['initiating', 'ringing', 'ongoing'] },
        });

        if (existingCall) {
          socket.emit('call:error', { message: 'Active call already exists' });
          return;
        }

        // Create call record
        const participants = conversation.participants.map(p => ({
          user: p._id,
          status: p._id.toString() === userId ? 'connected' : 'ringing',
          joinedAt: p._id.toString() === userId ? new Date() : null,
        }));

        const call = await Call.create({
          conversation: conversationId,
          caller: userId,
          callType,
          participants,
          status: 'ringing',
          isGroupCall: conversation.isGroup,
          maxParticipants: conversation.isGroup ? 8 : 2,
        });

        await call.populate('caller', 'fullName username profilePicture');
        await call.populate('participants.user', 'fullName username profilePicture');

        // Create call message
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          messageType: 'call',
          call: call._id,
          content: `${callType === 'video' ? 'Video' : 'Voice'} call`,
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Store active call
        activeCalls.set(call._id.toString(), {
          participants: new Set([userId]),
          room: `call:${call._id}`,
          callType,
        });

        // Join call room
        socket.join(`call:${call._id}`);

        // Emit to caller
        socket.emit('call:initiated', { call, message });

        // Emit incoming call to other participants
        conversation.participants.forEach(p => {
          if (p._id.toString() !== userId) {
            const userConnection = connectedUsers.get(p._id.toString());
            if (userConnection) {
              io.to(`user:${p._id}`).emit('call:incoming', {
                call,
                caller: socket.user,
                conversationId,
                callType,
              });
            }
          }
        });

        // Set timeout for unanswered call (30 seconds)
        setTimeout(async () => {
          const updatedCall = await Call.findById(call._id);
          if (updatedCall && updatedCall.status === 'ringing') {
            updatedCall.status = 'missed';
            updatedCall.endedAt = new Date();
            updatedCall.endReason = 'missed';
            await updatedCall.save();

            io.to(`call:${call._id}`).emit('call:missed', { callId: call._id });
            activeCalls.delete(call._id.toString());
          }
        }, 30000);

      } catch (error) {
        console.error('Call initiate error:', error);
        socket.emit('call:error', { message: 'Failed to initiate call' });
      }
    });

    // Answer a call
    socket.on('call:answer', async ({ callId, offer }) => {
      try {
        const call = await Call.findById(callId)
          .populate('caller', 'fullName username profilePicture')
          .populate('participants.user', 'fullName username profilePicture');

        if (!call) {
          socket.emit('call:error', { message: 'Call not found' });
          return;
        }

        const participant = call.participants.find(p => p.user._id.toString() === userId);
        if (!participant) {
          socket.emit('call:error', { message: 'Not a participant' });
          return;
        }

        if (!['ringing', 'ongoing'].includes(call.status)) {
          socket.emit('call:error', { message: 'Call cannot be answered' });
          return;
        }

        // Update participant status
        participant.status = 'connected';
        participant.joinedAt = new Date();

        if (call.status === 'ringing') {
          call.status = 'ongoing';
          call.startedAt = new Date();
        }

        if (offer) {
          call.signalingData.offer = offer;
        }

        await call.save();

        // Join call room
        socket.join(`call:${call._id}`);

        // Add to active call participants
        const activeCall = activeCalls.get(call._id.toString());
        if (activeCall) {
          activeCall.participants.add(userId);
        }

        // Notify caller and other participants
        socket.to(`call:${call._id}`).emit('call:answered', {
          callId: call._id,
          userId,
          user: socket.user,
        });

        socket.emit('call:connected', { call });

      } catch (error) {
        console.error('Call answer error:', error);
        socket.emit('call:error', { message: 'Failed to answer call' });
      }
    });

    // Decline a call
    socket.on('call:decline', async ({ callId }) => {
      try {
        const call = await Call.findById(callId);
        if (!call) return;

        const participant = call.participants.find(p => p.user.toString() === userId);
        if (participant) {
          participant.status = 'declined';
        }

        // Check if all non-caller participants declined
        const allDeclined = call.participants.every(
          p => p.user.toString() === call.caller.toString() || p.status === 'declined'
        );

        if (allDeclined) {
          call.status = 'declined';
          call.endedAt = new Date();
          call.endReason = 'declined';
        }

        await call.save();

        // Notify all participants
        io.to(`call:${call._id}`).emit('call:declined', {
          callId: call._id,
          userId,
          allDeclined,
        });

        if (allDeclined) {
          activeCalls.delete(call._id.toString());
        }

      } catch (error) {
        console.error('Call decline error:', error);
      }
    });

    // End a call
    socket.on('call:end', async ({ callId }) => {
      try {
        const call = await Call.findById(callId);
        if (!call) return;

        call.status = 'ended';
        call.endedAt = new Date();
        call.endReason = 'completed';

        if (call.startedAt) {
          call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
        }

        // Mark all participants as left
        call.participants.forEach(p => {
          if (p.status === 'connected') {
            p.status = 'left';
            p.leftAt = new Date();
          }
        });

        await call.save();

        // Update call message
        const callMessage = await Message.findOne({ call: callId });
        if (callMessage) {
          const duration = call.duration 
            ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` 
            : '0:00';
          callMessage.content = `${call.callType === 'video' ? 'Video' : 'Voice'} call • ${duration}`;
          await callMessage.save();
        }

        // Notify all participants
        io.to(`call:${call._id}`).emit('call:ended', {
          callId: call._id,
          duration: call.duration,
          endedBy: userId,
        });

        activeCalls.delete(call._id.toString());

      } catch (error) {
        console.error('Call end error:', error);
      }
    });

    // Leave a call (for group calls)
    socket.on('call:leave', async ({ callId }) => {
      try {
        const call = await Call.findById(callId);
        if (!call) return;

        const participant = call.participants.find(p => p.user.toString() === userId);
        if (participant) {
          participant.status = 'left';
          participant.leftAt = new Date();
        }

        socket.leave(`call:${call._id}`);

        const activeCall = activeCalls.get(call._id.toString());
        if (activeCall) {
          activeCall.participants.delete(userId);

          // Check if all participants have left
          if (activeCall.participants.size === 0) {
            call.status = 'ended';
            call.endedAt = new Date();
            call.endReason = 'completed';
            if (call.startedAt) {
              call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
            }
            activeCalls.delete(call._id.toString());
          }
        }

        await call.save();

        io.to(`call:${call._id}`).emit('call:participant-left', {
          callId: call._id,
          userId,
        });

      } catch (error) {
        console.error('Call leave error:', error);
      }
    });

    // WebRTC signaling: Send offer
    socket.on('webrtc:offer', ({ callId, targetUserId, offer }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:offer', {
        callId,
        fromUserId: userId,
        offer,
      });
    });

    // WebRTC signaling: Send answer
    socket.on('webrtc:answer', ({ callId, targetUserId, answer }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:answer', {
        callId,
        fromUserId: userId,
        answer,
      });
    });

    // WebRTC signaling: ICE candidate
    socket.on('webrtc:ice-candidate', ({ callId, targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('webrtc:ice-candidate', {
        callId,
        fromUserId: userId,
        candidate,
      });
    });

    // Toggle mute
    socket.on('call:toggle-mute', ({ callId, isMuted }) => {
      socket.to(`call:${callId}`).emit('call:participant-muted', {
        userId,
        isMuted,
      });
    });

    // Toggle video
    socket.on('call:toggle-video', ({ callId, isVideoOff }) => {
      socket.to(`call:${callId}`).emit('call:participant-video', {
        userId,
        isVideoOff,
      });
    });

    // ==================== DISCONNECT ====================

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user?.username || userId}`);

      connectedUsers.delete(userId);

      // Update user offline status
      User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastActive: new Date(),
      }).catch(console.error);

      // Broadcast offline status
      socket.broadcast.emit('user:offline', { 
        userId,
        lastActive: new Date(),
      });

      // Handle active calls - user left without proper end
      for (const [callId, callData] of activeCalls) {
        if (callData.participants.has(userId)) {
          callData.participants.delete(userId);

          // Notify other participants
          io.to(callData.room).emit('call:participant-disconnected', {
            callId,
            userId,
          });

          // If no participants left, end the call
          if (callData.participants.size === 0) {
            try {
              const call = await Call.findById(callId);
              if (call && ['ringing', 'ongoing'].includes(call.status)) {
                call.status = 'ended';
                call.endedAt = new Date();
                call.endReason = 'failed';
                if (call.startedAt) {
                  call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
                }
                await call.save();
              }
            } catch (error) {
              console.error('Error ending call on disconnect:', error);
            }
            activeCalls.delete(callId);
          }
        }
      }
    });
  });

  return io;
};

// Helper function to get connected user
export const getConnectedUser = (userId) => {
  return connectedUsers.get(userId);
};

// Helper function to check if user is online
export const isUserOnline = (userId) => {
  const user = connectedUsers.get(userId);
  return user?.online || false;
};
