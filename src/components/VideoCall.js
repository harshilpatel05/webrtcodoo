// src/components/VideoCall.js
import React, { useState, useEffect, useRef } from 'react';
import { firestore } from '../firebase';

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
  const pc = useRef(new RTCPeerConnection(servers));

  const webcamVideo = useRef(null);
  const remoteVideo = useRef(null);

  useEffect(() => {
    if (localStream) {
      webcamVideo.current.srcObject = localStream;
    }
    if (remoteStream) {
      remoteVideo.current.srcObject = remoteStream;
    }
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

  const createRoom = async () => {
    const callDoc = firestore.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    setCallId(callDoc.id);

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        offerCandidates.add(event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };
    await callDoc.set({ offer });

    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!pc.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.current.setRemoteDescription(answerDescription);
      }
    });

    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const answerCall = async () => {
    const callDoc = firestore.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        answerCandidates.add(event.candidate.toJSON());
      }
    };

    const callData = (await callDoc.get()).data();
    const offerDescription = callData.offer;
    await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };
    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
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
  };

  return (
    <div>
      <h2>I love Aum Tamboli</h2>
      <div className="videos">
        <span>
          <h2>Doctor</h2>
          <video ref={remoteVideo} autoPlay playsInline />
        </span>
        <span>
          <h2>Gareeb</h2>
          <video ref={webcamVideo} autoPlay muted />
        </span>
      </div>
      <div className="button-row">
        <button onClick={toggleWebcam}>Toggle webcam</button>
        <button onClick={createRoom} disabled={!localStream}>
          Create Room
        </button>
      </div>
      <div className="input-row">
        <input
          value={callId}
          onChange={(e) => setCallId(e.target.value)}
          placeholder="Enter Meeting ID"
        />
      </div>
      <div className="answer-hangup-row">
        <button onClick={answerCall} disabled={!localStream}>
          Answer
        </button>
        <button onClick={hangupCall} disabled={!localStream}>
          Hangup
        </button>
      </div>
    </div>
  );
};

export default VideoCall;