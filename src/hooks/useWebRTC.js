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
      return; 
    }

    console.log("Initializing PeerConnection...");
    try {
      peerConnection.current = new RTCPeerConnection(SERVERS);

      peerConnection.current.onicecandidate = async (event) => {
        if (event.candidate && consultationId) {
          try {
             await supabase.channel(`room-${consultationId}`).send({
                type: 'broadcast',
                event: 'ice-candidate',
                payload: { candidate: event.candidate, userId },
            });
          } catch (err) {
            console.error("Error sending ICE candidate:", err);
          }
        }
      };

      peerConnection.current.ontrack = (event) => {
        console.log("Remote track received:", event.streams);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setConnectionStatus('connected');
        }
      };

      peerConnection.current.onconnectionstatechange = () => {
        console.log("Connection state changed:", peerConnection.current?.connectionState);
        const state = peerConnection.current?.connectionState;
        if (state === 'connected') {
          setConnectionStatus('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          setConnectionStatus('disconnected');
        }
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      if (!peerConnection.current) {
        initializePeerConnection();
      } else {
        addTracksToPeerConnection(stream);
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setConnectionStatus('permission_denied');
      }
      toast({ title: "Error de cámara", description: "Verifica permisos de cámara/micrófono.", variant: "destructive" });
    }
  }, [initializePeerConnection]);

  // Handle Offer
  const createOffer = async () => {
    if (!peerConnection.current) return;
    try {
      console.log("Creating offer...");
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      await supabase.channel(`room-${consultationId}`).send({
        type: 'broadcast',
        event: 'offer',
        payload: { offer, userId },
      });
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  // Handle Answer
  const createAnswer = async (offer) => {
    if (!peerConnection.current) return;
    try {
      console.log("Creating answer...");
      if (peerConnection.current.signalingState !== "stable") {
          await Promise.all([
            peerConnection.current.setLocalDescription({type: "rollback"}),
            peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer))
          ]);
      } else {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      }

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      await supabase.channel(`room-${consultationId}`).send({
        type: 'broadcast',
        event: 'answer',
        payload: { answer, userId },
      });
      
      while(candidatesQueue.current.length > 0) {
          const candidate = candidatesQueue.current.shift();
          try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
              console.error("Error adding queued ICE candidate:", e);
          }
      }

    } catch (error) {
      console.error("Error creating answer:", error);
    }
  };

  // Main Effect: Connection & Signaling
  useEffect(() => {
    if (!consultationId || !userId) return;

    startLocalStream();

    const channel = supabase.channel(`room-${consultationId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload.userId !== userId) {
           console.log("Received offer from", payload.userId);
           if (!peerConnection.current) initializePeerConnection();
           createAnswer(payload.offer);
        }
      })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        if (payload.userId !== userId && peerConnection.current) {
            console.log("Received answer from", payload.userId);
            try {
                if (peerConnection.current.signalingState !== "stable") {
                     peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
                }
            } catch (e) {
                console.warn("Error setting remote description (answer):", e);
            }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        if (payload.userId !== userId) {
           if (peerConnection.current && peerConnection.current.remoteDescription) {
               try {
                   peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
               } catch (e) {
                   console.error("Error adding ICE candidate:", e);
               }
           } else {
               candidatesQueue.current.push(payload.candidate);
           }
        }
      })
      .on('broadcast', { event: 'ready' }, ({ payload }) => {
         if (payload.userId !== userId) {
             console.log(`Peer ${payload.userId} is ready. Initiating negotiation.`);
             // Both sides can be ready, but let's make Doctor initiate if possible, 
             // or whoever is 'isDoctor' flag based (though sometimes simpler is better)
             // To be safe: if we are already stable, we can offer.
             setTimeout(() => {
                 if (peerConnection.current?.signalingState === 'stable') {
                     createOffer();
                 }
             }, 1000);
         }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log("Subscribed to signaling channel");
          // Announce readiness immediately upon joining
          await channel.send({ type: 'broadcast', event: 'ready', payload: { userId } });
          
          // Periodically announce readiness in case the other peer joined earlier
          const readyInterval = setInterval(async () => {
              if (peerConnection.current?.connectionState !== 'connected') {
                  await channel.send({ type: 'broadcast', event: 'ready', payload: { userId } });
              } else {
                  clearInterval(readyInterval);
              }
          }, 3000);
        }
      });

    // REAL-TIME DATABASE LISTENER FOR CONSULTATION STATUS
    // This ensures we catch updates even if WebRTC fails
    const statusChannel = supabase.channel(`consultation-${consultationId}-status-sync`)
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'consultations', filter: `id=eq.${consultationId}` },
            (payload) => {
                if (payload.new.status === 'completed') {
                    setConnectionStatus('ended');
                    if (localStreamRef.current) {
                        localStreamRef.current.getTracks().forEach(track => track.stop());
                    }
                }
            }
        )
        .subscribe();

    return () => {
      console.log("Cleaning up WebRTC...");
      supabase.removeChannel(statusChannel);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      setLocalStream(null);
      setRemoteStream(null);
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