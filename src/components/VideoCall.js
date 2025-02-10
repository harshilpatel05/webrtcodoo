import React, { useState, useEffect, useRef } from 'react';
import { db } from "../firebase";
import { collection, doc, getDoc, setDoc, addDoc, onSnapshot } from "firebase/firestore";
import "../styles/VideoCall.css";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const VideoCall = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callId, setCallId] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const pc = useRef(new RTCPeerConnection(servers));
  const webcamVideo = useRef(null);
  const remoteVideo = useRef(null);

  useEffect(() => {
    webcamVideo.current.srcObject = localStream;
    remoteVideo.current.srcObject = remoteStream;
  }, [localStream, remoteStream]);

  const toggleWebcam = async () => {
    if (!localStream) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      const remoteStream = new MediaStream();
      setRemoteStream(remoteStream);

      stream.getTracks().forEach((track) => {
        pc.current.addTrack(track, stream);
      });

      pc.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      };
    } else {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  };

  const toggleMic = () => {
    const newMuteState = !isMuted;
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newMuteState;
      });
    }
    setIsMuted(newMuteState);
  };

  const createRoom = async () => {
    const callDoc = doc(collection(db, "calls"));
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    setCallId(callDoc.id);

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };
    await setDoc(callDoc, { offer });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.current.setRemoteDescription(answerDescription);
      }
    });

    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const answerCall = async () => {
    if (!callId) {
      console.error("Call ID is missing!");
      return;
    }
  
    const callDoc = doc(db, "calls", callId);
    const answerCandidates = collection(callDoc, "answerCandidates");
    const offerCandidates = collection(callDoc, "offerCandidates");
  
    pc.current.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(answerCandidates, event.candidate.toJSON());
      }
    };
  
    const callData = (await getDoc(callDoc)).data();
    if (!callData?.offer) {
      console.error("No offer found in Firestore!");
      return;
    }
  
    const offerDescription = callData.offer;
  
    if (pc.current.signalingState !== "have-remote-offer") {
      await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));
    }
  
    if (pc.current.signalingState !== "have-remote-offer") {
      console.error("PeerConnection is not in 'have-remote-offer' state!");
      return;
    }
  
    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);
    await setDoc(callDoc, { answer: answerDescription }, { merge: true });
  
    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const hangupCall = () => {
    pc.current.close();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setCallId('');
    setIsMuted(true); // Reset mute state
    pc.current = new RTCPeerConnection(servers);
  };

  return (
    <div className="video-call-container">
      <div className="videos">
        <div className="video-wrapper">
          <video ref={remoteVideo} autoPlay playsInline className="video"/>
        </div>
        <div className="video-wrapper">
          <video ref={webcamVideo} autoPlay muted className="video"/>
        </div>
      </div>

      <div className="button-container">
        <button className="btn" onClick={toggleWebcam}>Toggle Webcam</button>
        <button className="btn" onClick={answerCall} disabled={!localStream}>Join Room</button>
      </div>

      <div className="input-section">
        <input
          className="input-box"
          value={callId}
          onChange={(e) => setCallId(e.target.value)}
          placeholder="Enter Meeting ID"
        />
      </div>

      <div className="button-container">
        <button className="btn hangup" onClick={hangupCall} disabled={!localStream}>Hangup</button>
        <button className="btn mute" onClick={toggleMic} disabled={!localStream}>
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;