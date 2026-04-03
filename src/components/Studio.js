import React, { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './Studio.css';

export default function Studio({ session, onLeave }) {
  const callRef = useRef(null);
  const [participants, setParticipants] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [spotlightId, setSpotlightId] = useState(null);
  const [guestLinkCopied, setGuestLinkCopied] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [joined, setJoined] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const videoRefs = useRef({});

  const updateParticipants = useCallback((call) => {
    const parts = call.participants();
    setParticipants({ ...parts });
  }, []);

  useEffect(() => {
    let call;

    const init = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (e) {
        setPermissionError('Camera/mic access was denied. Please allow access in your browser and refresh.');
        return;
      }

      call = DailyIframe.createCallObject({
        dailyConfig: {
          userMediaAudioConstraints: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2,
          },
          userMediaVideoConstraints: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 60, min: 30 },
          },
        },
      });

      callRef.current = call;

      call
        .on('joined-meeting', () => {
          setJoined(true);
          updateParticipants(call);
        })
        .on('participant-joined', () => updateParticipants(call))
        .on('participant-updated', () => updateParticipants(call))
        .on('participant-left', () => updateParticipants(call))
        .on('track-started', () => updateParticipants(call))
        .on('track-stopped', () => updateParticipants(call))
        .on('recording-started', () => {
          setIsRecording(true);
          setRecordingStatus('Recording...');
        })
        .on('recording-stopped', () => {
          setIsRecording(false);
          setRecordingStatus('Recording saved');
          setTimeout(() => setRecordingStatus(''), 3000);
        })
        .on('camera-error', (e) => {
          setPermissionError('Camera error: ' + (e?.errorMsg || 'unknown'));
        });

      try {
        await call.join({
          url: session.roomUrl,
          userName: session.name,
        });
      } catch (e) {
        const errMsg = e?.message || e?.errorMsg || JSON.stringify(e) || 'unknown'; setPermissionError('Failed to join: ' + errMsg);
      }
    };

    init();

    return () => {
      if (call) call.destroy();
    };
  }, [session.roomUrl, session.name, updateParticipants]);

  useEffect(() => {
    if (!joined) return;
    Object.entries(participants).forEach(([id, participant]) => {
      const videoEl = document.getElementById('video-' + id);
      if (videoEl) {
        const track = participant.screenVideoTrack || participant.videoTrack;
        if (track) {
          try {
            const stream = new MediaStream([track]);
            videoEl.srcObject = stream;
            videoEl.play().catch(() => {});
          } catch (e) {}
        }
      }
      if (id !== 'local') {
        const audioEl = document.getElementById('audio-' + id);
        if (audioEl && participant.audioTrack) {
          try {
            const stream = new MediaStream([participant.audioTrack]);
            audioEl.srcObject = stream;
            audioEl.play().catch(() => {});
          } catch (e) {}
        }
      }
    });
  }, [participants, joined]);

  const toggleMic = () => {
    const call = callRef.current;
    if (!call) return;
    call.setLocalAudio(isMuted);
    setIsMuted(!isMuted);
  };

  const toggleCam = () => {
    const call = callRef.current;
    if (!call) return;
    call.setLocalVideo(isCamOff);
    setIsCamOff(!isCamOff);
  };

  const toggleScreenShare = async () => {
    const call = callRef.current;
    if (!call) return;
    try {
      if (isScreenSharing) {
        await call.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await call.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (e) {}
  };

  const toggleRecording = async () => {
    const call = callRef.current;
    if (!call) return;
    try {
      if (isRecording) {
        await call.stopRecording();
      } else {
        await call.startRecording();
      }
    } catch (e) {
      setRecordingStatus('Recording requires Daily paid plan');
      setTimeout(() => setRecordingStatus(''), 4000);
    }
  };

  const copyGuestLink = () => {
    if (session.guestLink) {
      navigator.clipboard.writeText(session.guestLink);
      setGuestLinkCopied(true);
      setTimeout(() => setGuestLinkCopied(false), 2000);
    }
  };

  const handleLeave = () => {
    if (callRef.current) {
      callRef.current.leave();
      callRef.current.destroy();
    }
    onLeave();
  };

  const participantList = Object.entries(participants);
  const remoteParticipants = participantList.filter(([id]) => id !== 'local');
  const spotlightKey = spotlightId || (remoteParticipants.length > 0 ? remoteParticipants[0][0] : 'local');
  const spotlightParticipant = participants[spotlightKey];

  if (permissionError) {
    return (
      <div className="studio">
        <div className="permission-error">
          <div className="perm-icon">🎥</div>
          <h2>Camera & Mic Access Needed</h2>
          <p>{permissionError}</p>
          <button className="join-btn-perm" onClick={() => { setPermissionError(''); window.location.reload(); }}>
            Try Again
          </button>
          <button className="leave-link" onClick={onLeave}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="studio">
      <div className="studio-header">
        <div className="studio-logo">
          <span className="logo-iso">ISO</span>
          <span className="logo-studio-sm">STUDIO</span>
        </div>
        <div className="studio-room-info">
          <div className="room-badge">
            <span className="room-dot" />
            LIVE · {session.roomName}
          </div>
          {recordingStatus && (
            <div className={'rec-status' + (isRecording ? ' recording' : '')}>
              {isRecording && <span className="rec-dot" />}
              {recordingStatus}
            </div>
          )}
        </div>
        <div className="header-actions">
          {session.role === 'producer' && session.guestLink && (
            <button className="invite-btn" onClick={copyGuestLink}>
              {guestLinkCopied ? '✓ Copied!' : '🔗 Invite Guests'}
            </button>
          )}
          <div className="participant-count">👥 {participantList.length}</div>
        </div>
      </div>

      <div className="studio-body">
        <div className="spotlight-area">
          {spotlightParticipant ? (
            <div className="spotlight-video-wrap">
              <video
                id={'video-' + spotlightKey}
                autoPlay
                playsInline
                muted={spotlightKey === 'local'}
                className="spotlight-video"
                ref={el => { if (el) videoRefs.current[spotlightKey] = el; }}
              />
              <div className="spotlight-name">
                {spotlightParticipant.user_name || 'Guest'}
                {spotlightKey === 'local' && ' (You)'}
              </div>
            </div>
          ) : (
            <div className="waiting-state">
              <div className="waiting-icon">🎙</div>
              <p>{joined ? 'Waiting for guests to join...' : 'Connecting...'}</p>
              {session.role === 'producer' && session.guestLink && joined && (
                <button className="invite-btn-large" onClick={copyGuestLink}>
                  {guestLinkCopied ? '✓ Link Copied!' : 'Copy Invite Link'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="side-panel">
          <div className="panel-label">PARTICIPANTS</div>
          <div className="tiles-grid">
            {participantList.map(([id, participant]) => (
              <div
                key={id}
                className={'tile' + (spotlightKey === id ? ' tile-spotlit' : '')}
                onClick={() => setSpotlightId(id === spotlightKey ? null : id)}
              >
                <video id={'video-' + id} autoPlay playsInline muted={id === 'local'} className="tile-video" />
                {id !== 'local' && <audio id={'audio-' + id} autoPlay playsInline />}
                <div className="tile-name">
                  {participant.user_name || 'Guest'}{id === 'local' && ' (You)'}
                </div>
                {spotlightKey === id && <div className="tile-spotlight-badge">●</div>}
              </div>
            ))}
          </div>

          {session.role === 'producer' && session.guestLink && (
            <div className="guest-link-panel">
              <div className="panel-label">GUEST LINK</div>
              <div className="link-box">
                <span className="link-text">{session.guestLink}</span>
              </div>
              <button className="copy-link-btn" onClick={copyGuestLink}>
                {guestLinkCopied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="controls-bar">
        <div className="controls-left">
          <span className="controls-role">{session.role === 'producer' ? '🎙 Producer' : '🎧 Guest'}</span>
          <span className="controls-name">{session.name}</span>
        </div>
        <div className="controls-center">
          <button className={'ctrl-btn' + (isMuted ? ' ctrl-off' : '')} onClick={toggleMic}>
            {isMuted ? '🔇' : '🎤'}<span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button className={'ctrl-btn' + (isCamOff ? ' ctrl-off' : '')} onClick={toggleCam}>
            {isCamOff ? '📵' : '📹'}<span>{isCamOff ? 'Start Cam' : 'Stop Cam'}</span>
          </button>
          <button className={'ctrl-btn' + (isScreenSharing ? ' ctrl-active' : '')} onClick={toggleScreenShare}>
            🖥<span>{isScreenSharing ? 'Stop Share' : 'Share'}</span>
          </button>
          {session.role === 'producer' && (
            <button className={'ctrl-btn' + (isRecording ? ' ctrl-recording' : '')} onClick={toggleRecording}>
              {isRecording ? '⏹' : '⏺'}<span>{isRecording ? 'Stop Rec' : 'Record'}</span>
            </button>
          )}
          <button className="ctrl-btn ctrl-leave" onClick={handleLeave}>
            📴<span>Leave</span>
          </button>
        </div>
        <div className="controls-right">
          <div className="quality-indicator"><span className="quality-dot" />HD</div>
        </div>
      </div>
    </div>
  );
}
