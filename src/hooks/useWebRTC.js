import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const SERVERS = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
};

export const useWebRTC = (consultationId, userId, isDoctor) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('waiting'); // waiting, connected, disconnected
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peerConnection = useRef(null);
  const localStreamRef = useRef(null);
  const channelRef = useRef(null);
  const candidatesQueue = useRef([]);

  // Helper to safely add tracks
  const addTracksToPeerConnection = (stream) => {
    if (peerConnection.current && stream) {
      // Clear existing senders to prevent duplication
      const senders = peerConnection.current.getSenders();
      senders.forEach(sender => {
        try {
          peerConnection.current.removeTrack(sender);
        } catch (e) {
          console.warn("Error removing track:", e);
        }
      });

      // Add new tracks
      stream.getTracks().forEach((track) => {
        try {
          peerConnection.current.addTrack(track, stream);
        } catch (e) {
          console.error("Error adding track:", e);
        }
      });
    }
  };

  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
      console.log("[WebRTC] PeerConnection already exists, skipping initialization");
      return;
    }

    console.log("[WebRTC] ========== Initializing PeerConnection ==========");
    console.log("[WebRTC] User ID:", userId);
    console.log("[WebRTC] Consultation ID:", consultationId);
    try {
      peerConnection.current = new RTCPeerConnection(SERVERS);
      console.log("[WebRTC] PeerConnection created successfully");

      peerConnection.current.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("[WebRTC] ICE Candidate generated:", event.candidate.candidate);
          if (consultationId) {
            try {
               await supabase.channel(`room-${consultationId}`).send({
                  type: 'broadcast',
                  event: 'ice-candidate',
                  payload: { candidate: event.candidate, userId },
              });
              console.log("[WebRTC] ICE candidate sent successfully");
            } catch (err) {
              console.error("[WebRTC] Error sending ICE candidate:", err);
            }
          }
        } else {
          console.log("[WebRTC] ICE gathering complete (null candidate)");
        }
      };

      peerConnection.current.ontrack = (event) => {
        console.log("[WebRTC] ✅ Remote track received!");
        console.log("[WebRTC] Track kind:", event.track.kind);
        console.log("[WebRTC] Streams:", event.streams);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setConnectionStatus('connected');
          console.log("[WebRTC] Remote stream set, connection status: connected");
        }
      };

      peerConnection.current.onconnectionstatechange = () => {
        const state = peerConnection.current?.connectionState;
        console.log("[WebRTC] Connection state changed:", state);
        if (state === 'connected') {
          setConnectionStatus('connected');
          console.log("[WebRTC] ✅ Peer connection established!");
        } else if (state === 'disconnected' || state === 'failed') {
          setConnectionStatus('disconnected');
          console.log("[WebRTC] ❌ Connection failed or disconnected");
        }
      };

      peerConnection.current.onicegatheringstatechange = () => {
        console.log("[WebRTC] ICE gathering state:", peerConnection.current?.iceGatheringState);
      };

      peerConnection.current.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state:", peerConnection.current?.iceConnectionState);
      };

      peerConnection.current.onsignalingstatechange = () => {
        console.log("[WebRTC] Signaling state:", peerConnection.current?.signalingState);
      };
      
      if (localStreamRef.current) {
        addTracksToPeerConnection(localStreamRef.current);
      }

    } catch (error) {
      console.error("Failed to create PeerConnection:", error);
      toast({ title: "Error de conexión", description: "No se pudo iniciar el servicio de video.", variant: "destructive" });
    }
  }, [consultationId, userId]);

  const startLocalStream = useCallback(async () => {
    console.log("[WebRTC] ========== Starting Local Stream ==========");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("[WebRTC] ✅ Local media stream acquired");
      console.log("[WebRTC] Video tracks:", stream.getVideoTracks().length);
      console.log("[WebRTC] Audio tracks:", stream.getAudioTracks().length);

      localStreamRef.current = stream;
      setLocalStream(stream);

      if (!peerConnection.current) {
        console.log("[WebRTC] No peer connection exists, initializing...");
        initializePeerConnection();
      } else {
        console.log("[WebRTC] Peer connection exists, adding tracks...");
        addTracksToPeerConnection(stream);
      }
    } catch (error) {
      console.error("[WebRTC] ❌ Error accessing media devices:", error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setConnectionStatus('permission_denied');
      }
      toast({ title: "Error de cámara", description: "Verifica permisos de cámara/micrófono.", variant: "destructive" });
    }
  }, [initializePeerConnection]);

  // Handle Offer
  const createOffer = async () => {
    if (!peerConnection.current) {
      console.log("[WebRTC] Cannot create offer - no peer connection");
      return;
    }
    try {
      console.log("[WebRTC] ========== Creating Offer ==========");
      console.log("[WebRTC] Current signaling state:", peerConnection.current.signalingState);
      const offer = await peerConnection.current.createOffer();
      console.log("[WebRTC] Offer created:", offer.type);
      await peerConnection.current.setLocalDescription(offer);
      console.log("[WebRTC] Local description set");

      await supabase.channel(`room-${consultationId}`).send({
        type: 'broadcast',
        event: 'offer',
        payload: { offer, userId },
      });
      console.log("[WebRTC] ✅ Offer sent to peer via Supabase");
    } catch (error) {
      console.error("[WebRTC] ❌ Error creating offer:", error);
    }
  };

  // Handle Answer
  const createAnswer = async (offer) => {
    if (!peerConnection.current) {
      console.log("[WebRTC] Cannot create answer - no peer connection");
      return;
    }
    try {
      console.log("[WebRTC] ========== Creating Answer ==========");
      console.log("[WebRTC] Current signaling state:", peerConnection.current.signalingState);
      console.log("[WebRTC] Received offer type:", offer.type);

      if (peerConnection.current.signalingState !== "stable") {
          console.log("[WebRTC] Not in stable state, performing rollback");
          await Promise.all([
            peerConnection.current.setLocalDescription({type: "rollback"}),
            peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer))
          ]);
      } else {
          console.log("[WebRTC] Setting remote description (offer)");
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      }

      const answer = await peerConnection.current.createAnswer();
      console.log("[WebRTC] Answer created:", answer.type);
      await peerConnection.current.setLocalDescription(answer);
      console.log("[WebRTC] Local description set (answer)");

      await supabase.channel(`room-${consultationId}`).send({
        type: 'broadcast',
        event: 'answer',
        payload: { answer, userId },
      });
      console.log("[WebRTC] ✅ Answer sent to peer via Supabase");

      // Process queued ICE candidates
      if (candidatesQueue.current.length > 0) {
        console.log("[WebRTC] Processing", candidatesQueue.current.length, "queued ICE candidates");
      }
      while(candidatesQueue.current.length > 0) {
          const candidate = candidatesQueue.current.shift();
          try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("[WebRTC] Queued ICE candidate added");
          } catch (e) {
              console.error("[WebRTC] Error adding queued ICE candidate:", e);
          }
      }

    } catch (error) {
      console.error("[WebRTC] ❌ Error creating answer:", error);
    }
  };

  // Main Effect: Connection & Signaling
  useEffect(() => {
    if (!consultationId || !userId) {
      console.log("[WebRTC] Missing consultationId or userId, skipping initialization");
      return;
    }

    console.log("[WebRTC] ========== Main Effect: Starting WebRTC Setup ==========");
    console.log("[WebRTC] Consultation ID:", consultationId);
    console.log("[WebRTC] User ID:", userId);

    startLocalStream();

    const channel = supabase.channel(`room-${consultationId}`);
    channelRef.current = channel;
    console.log("[WebRTC] Supabase channel created:", `room-${consultationId}`);

    channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        console.log("[WebRTC] ========== Received Broadcast: OFFER ==========");
        console.log("[WebRTC] From user:", payload.userId);
        if (payload.userId !== userId) {
           console.log("[WebRTC] Offer is from peer, processing...");
           if (!peerConnection.current) {
             console.log("[WebRTC] No peer connection exists, initializing...");
             initializePeerConnection();
           }
           createAnswer(payload.offer);
        } else {
           console.log("[WebRTC] Offer is from self, ignoring");
        }
      })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        console.log("[WebRTC] ========== Received Broadcast: ANSWER ==========");
        console.log("[WebRTC] From user:", payload.userId);
        if (payload.userId !== userId && peerConnection.current) {
            console.log("[WebRTC] Answer is from peer, processing...");
            console.log("[WebRTC] Current signaling state:", peerConnection.current.signalingState);
            try {
                if (peerConnection.current.signalingState !== "stable") {
                     peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
                     console.log("[WebRTC] ✅ Remote description set (answer)");
                } else {
                     console.log("[WebRTC] Already in stable state, skipping answer");
                }
            } catch (e) {
                console.error("[WebRTC] ❌ Error setting remote description (answer):", e);
            }
        } else if (payload.userId === userId) {
            console.log("[WebRTC] Answer is from self, ignoring");
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        if (payload.userId !== userId) {
           console.log("[WebRTC] ========== Received Broadcast: ICE-CANDIDATE ==========");
           console.log("[WebRTC] From user:", payload.userId);
           console.log("[WebRTC] Candidate:", payload.candidate.candidate);
           if (peerConnection.current && peerConnection.current.remoteDescription) {
               console.log("[WebRTC] Remote description exists, adding candidate directly");
               try {
                   peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                   console.log("[WebRTC] ✅ ICE candidate added");
               } catch (e) {
                   console.error("[WebRTC] ❌ Error adding ICE candidate:", e);
               }
           } else {
               console.log("[WebRTC] No remote description yet, queuing candidate");
               candidatesQueue.current.push(payload.candidate);
               console.log("[WebRTC] Queue size:", candidatesQueue.current.length);
           }
        }
      })
      .on('broadcast', { event: 'ready' }, ({ payload }) => {
         if (payload.userId !== userId) {
             console.log("[WebRTC] ========== Received Broadcast: READY ==========");
             console.log("[WebRTC] Peer", payload.userId, "is ready");
             console.log("[WebRTC] Current signaling state:", peerConnection.current?.signalingState);
             // Both sides can be ready, but let's make Doctor initiate if possible
             setTimeout(() => {
                 if (peerConnection.current?.signalingState === 'stable') {
                     console.log("[WebRTC] We are in stable state, creating offer...");
                     createOffer();
                 } else {
                     console.log("[WebRTC] Not in stable state, waiting for peer to send offer");
                 }
             }, 1000);
         }
      })
      .subscribe(async (status) => {
        console.log("[WebRTC] Channel subscription status:", status);
        if (status === 'SUBSCRIBED') {
          console.log("[WebRTC] ✅ Subscribed to signaling channel");
          // Announce readiness immediately upon joining
          await channel.send({ type: 'broadcast', event: 'ready', payload: { userId } });
          console.log("[WebRTC] Sent initial 'ready' broadcast");

          // Periodically announce readiness in case the other peer joined earlier
          const readyInterval = setInterval(async () => {
              if (peerConnection.current?.connectionState !== 'connected') {
                  await channel.send({ type: 'broadcast', event: 'ready', payload: { userId } });
                  console.log("[WebRTC] Sent periodic 'ready' broadcast");
              } else {
                  console.log("[WebRTC] Connected! Stopping 'ready' broadcasts");
                  clearInterval(readyInterval);
              }
          }, 3000);
        }
      });

    return () => {
      console.log("[WebRTC] ========== Cleaning up WebRTC ==========");

      if (localStreamRef.current) {
        console.log("[WebRTC] Stopping local stream tracks");
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      if (peerConnection.current) {
        console.log("[WebRTC] Closing peer connection");
        peerConnection.current.close();
        peerConnection.current = null;
      }

      if (channelRef.current) {
        console.log("[WebRTC] Removing signaling channel");
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setLocalStream(null);
      setRemoteStream(null);
      console.log("[WebRTC] ✅ Cleanup complete");
    };
  }, [consultationId, userId, isDoctor, startLocalStream, initializePeerConnection]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return {
    localStream,
    remoteStream,
    connectionStatus,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
  };
};