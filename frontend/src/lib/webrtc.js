// WebRTC Service for handling peer-to-peer audio/video calls

// STUN servers (free, always available)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Add TURN servers from env variables for NAT traversal across networks
// Sign up at https://www.metered.ca/stun-turn for free TURN credentials (500GB/month)
const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

if (turnUrl && turnUsername && turnCredential) {
  const urls = turnUrl.includes(',') ? turnUrl.split(',').map(u => u.trim()) : turnUrl;
  ICE_SERVERS.push({
    urls,
    username: turnUsername,
    credential: turnCredential,
  });
}

export class WebRTCService {
  constructor() {
    this.peerConnections = new Map(); // Map of userId -> RTCPeerConnection
    this.localStream = null;
    this.remoteStreams = new Map(); // Map of userId -> MediaStream
    this.pendingCandidates = new Map(); // Map of userId -> RTCIceCandidate[] (queued before remote desc)
    this.onRemoteStreamCallback = null;
    this.onRemoteStreamRemovedCallback = null;
    this.onIceCandidateCallback = null;
    this.onConnectionStateChangeCallback = null;
  }

  // Get user media (audio and/or video)
  async getLocalStream(constraints = { audio: true, video: true }) {
    try {
      // Stop any existing stream first
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }

  // Create peer connection for a specific user
  createPeerConnection(userId) {
    if (this.peerConnections.has(userId)) {
      return this.peerConnections.get(userId);
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(userId, event.candidate);
      }
    };

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
      console.log('Remote track received from:', userId);
      const [remoteStream] = event.streams;
      this.remoteStreams.set(userId, remoteStream);
      
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(userId, remoteStream);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
      
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(userId, peerConnection.connectionState);
      }

      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed' ||
          peerConnection.connectionState === 'closed') {
        this.remoteStreams.delete(userId);
        
        if (this.onRemoteStreamRemovedCallback) {
          this.onRemoteStreamRemovedCallback(userId);
        }
      }
    };

    // Handle ice connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${userId}:`, peerConnection.iceConnectionState);
    };

    this.peerConnections.set(userId, peerConnection);
    return peerConnection;
  }

  // Create offer for a call
  async createOffer(userId) {
    const peerConnection = this.createPeerConnection(userId);
    
    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  // Create answer for incoming call
  async createAnswer(userId, offer) {
    const peerConnection = this.createPeerConnection(userId);
    
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Drain any ICE candidates that arrived before remote description was set
      await this._drainPendingCandidates(userId, peerConnection);
      
      return answer;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  // Handle received answer
  async handleAnswer(userId, answer) {
    const peerConnection = this.peerConnections.get(userId);
    
    if (!peerConnection) {
      console.error('No peer connection found for:', userId);
      return;
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      
      // Drain any ICE candidates that arrived before remote description was set
      await this._drainPendingCandidates(userId, peerConnection);
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  // Handle received ICE candidate — queue if remote description not yet set
  async handleIceCandidate(userId, candidate) {
    const peerConnection = this.peerConnections.get(userId);
    
    if (!peerConnection || !peerConnection.remoteDescription) {
      // Queue for later — remote description hasn't been set yet
      if (!this.pendingCandidates.has(userId)) {
        this.pendingCandidates.set(userId, []);
      }
      this.pendingCandidates.get(userId).push(candidate);
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  // Drain queued ICE candidates after remote description is set
  async _drainPendingCandidates(userId, peerConnection) {
    const pending = this.pendingCandidates.get(userId) || [];
    this.pendingCandidates.delete(userId);
    for (const candidate of pending) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding queued ICE candidate:', e);
      }
    }
  }

  // Toggle audio mute
  toggleAudio(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  // Toggle video
  toggleVideo(off) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !off;
      });
    }
  }

  // Switch camera (for mobile devices)
  async switchCamera() {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const constraints = videoTrack.getConstraints();
    const currentFacingMode = constraints.facingMode || 'user';
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track in all peer connections
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      });

      // Replace local track
      videoTrack.stop();
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  }

  // Get remote stream for a user
  getRemoteStream(userId) {
    return this.remoteStreams.get(userId);
  }

  // Close connection for a specific user
  closePeerConnection(userId) {
    const peerConnection = this.peerConnections.get(userId);
    
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
    
    this.remoteStreams.delete(userId);
    this.pendingCandidates.delete(userId);
  }

  // Close all connections and cleanup
  cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();
  }

  // Set callbacks
  onRemoteStream(callback) {
    this.onRemoteStreamCallback = callback;
  }

  onRemoteStreamRemoved(callback) {
    this.onRemoteStreamRemovedCallback = callback;
  }

  onIceCandidate(callback) {
    this.onIceCandidateCallback = callback;
  }

  onConnectionStateChange(callback) {
    this.onConnectionStateChangeCallback = callback;
  }
}

// Singleton instance
let webRTCServiceInstance = null;

export const getWebRTCService = () => {
  if (!webRTCServiceInstance) {
    webRTCServiceInstance = new WebRTCService();
  }
  return webRTCServiceInstance;
};

export const resetWebRTCService = () => {
  if (webRTCServiceInstance) {
    webRTCServiceInstance.cleanup();
    webRTCServiceInstance = null;
  }
};

export default WebRTCService;
