import React, { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './Studio.css';

export default function Studio({ session, onLeave }) {
  const callRef = useRef(null);
  const containerRef = useRef(null);
  const [participants, setParticipants] = useState({});

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [spotlightId, setSpotlightId] = useState(null);
  const [guestLinkCopied, setGuestLinkCopied] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [joined, setJoined] = useState(false);

  const updateParticipants = useCallback((call) => {
    const parts = call.participants();
    setParticipants({ ...parts });
  }, []);

  useEffect(() => {
    const call = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: true,
      // Highest quality settings
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
      .on('error', (e) => console.error('Daily error:', e));

    call.join({
      url: session.roomUrl,
      userName: session.name,
    });

    return () => {
      call.destroy();
    };
  }, [session.roomUrl, session.name, updateParticipants]);

  // Attach video tracks to DOM elements
  useEffect(() => {
    if (!joined) return;
    const call = callRef.current;
    if (!call) return;

    Object.entries(participants).forEach(([id, participant]) => {
      attachTrack(id, participant, 'video');
      attachTrack(id, participant, 'audio');
    });
  }, [participants, joined]);

  const attachTrack = (participantId, participant, kind) => {
    const el = document.getElementById(`${kind}-${participantId}`);
    if (!el) return;

    const trackState = kind === 'video'
      ? (participant.screenVideoTrack ? participant.screenVideoTrack : participant.videoTrack)
      : participant.audioTrack;

    if (trackState && el.srcObject !== trackState) {
      try {
        const stream = new MediaStream([trackState]);
        el.srcObject = stream;
        el.play().catch(() => {});
      } catch (e) {}
    }
  };

  const toggleMic = () => {
    const call = callRef.current;
    if (!call) return;
    if (isMuted) {
      call.setLocalAudio(true);
    } else {
      call.setLocalAudio(false);
    }
    setIsMuted(!isMuted);
  };

  const toggleCam = () => {
    const call = callRef.current;
    if (!call) return;
    if (isCamOff) {
      call.setLocalVideo(true);
    } else {
      call.setLocalVideo(false);
    }
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
    } catch (e) {
      console.error('Screen share error:', e);
    }
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
      console.error('Recording error:', e);
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
  const allParticipants = participantList;

  const spotlightParticipant = spotlightId
    ? participants[spotlightId]
    : remoteParticipants.length > 0
    ? remoteParticipants[0][1]
    : null;
  const spotlightKey = spotlightId || (remoteParticipants.length > 0 ? remoteParticipants[0][0] : null);

  return (
    <div className="studio">
      {/* Header */}
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
            <div className={`rec-status ${isRecording ? 'recording' : ''}`}>
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
          <div className="participant-count">
            👥 {allParticipants.length}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="studio-body" ref={containerRef}>
        {/* Main spotlight area */}
        <div className="spotlight-area">
          {spotlightParticipant && spotlightKey ? (
            <div className="spotlight-video-wrap">
              <video
                id={`video-${spotlightKey}`}
                autoPlay
                playsInline
                muted={spotlightKey === 'local'}
                className="spotlight-video"
              />
              <div className="spotlight-name">
                {spotlightParticipant.user_name || 'Guest'}
                {spotlightKey === 'local' && ' (You)'}
              </div>
            </div>
          ) : (
            <div className="waiting-state">
              <div className="waiting-icon">🎙</div>
              <p>Waiting for guests to join...</p>
              {session.role === 'producer' && session.guestLink && (
                <button className="invite-btn-large" onClick={copyGuestLink}>
                  {guestLinkCopied ? '✓ Link Copied!' : 'Copy Invite Link'}
                </button>
              )}
              {session.role === 'guest' && (
                <p className="waiting-sub">You're in the room. Host will be here soon.</p>
              )}
            </div>
          )}
        </div>

        {/* Side panel - all participant tiles */}
        <div className="side-panel">
          <div className="panel-label">PARTICIPANTS</div>
          <div className="tiles-grid">
            {allParticipants.map(([id, participant]) => (
              <div
                key={id}
                className={`tile ${spotlightKey === id ? 'tile-spotlit' : ''}`}
                onClick={() => setSpotlightId(id === spotlightKey ? null : id)}
              >
                <video
                  id={`video-${id}`}
                  autoPlay
                  playsInline
                  muted={id === 'local'}
                  className="tile-video"
                />
                {/* Hidden audio for remote participants */}
                {id !== 'local' && (
                  <audio id={`audio-${id}`} autoPlay playsInline />
                )}
                <div className="tile-name">
                  {participant.user_name || 'Guest'}
                  {id === 'local' && ' (You)'}
                </div>
                {spotlightKey === id && (
                  <div className="tile-spotlight-badge">●</div>
                )}
              </div>
            ))}
          </div>

          {/* Guest link section for producer */}
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

      {/* Controls bar */}
      <div className="controls-bar">
        <div className="controls-left">
          <span className="controls-role">
            {session.role === 'producer' ? '🎙 Producer' : '🎧 Guest'}
          </span>
          <span className="controls-name">{session.name}</span>
        </div>

        <div className="controls-center">
          <button
            className={`ctrl-btn ${isMuted ? 'ctrl-off' : ''}`}
            onClick={toggleMic}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🎤'}
            <span>{isMuted ? 'Unmuted' : 'Mute'}</span>
          </button>

          <button
            className={`ctrl-btn ${isCamOff ? 'ctrl-off' : ''}`}
            onClick={toggleCam}
            title={isCamOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isCamOff ? '📵' : '📹'}
            <span>{isCamOff ? 'Start Cam' : 'Stop Cam'}</span>
          </button>

          <button
            className={`ctrl-btn ${isScreenSharing ? 'ctrl-active' : ''}`}
            onClick={toggleScreenShare}
            title="Share screen"
          >
            🖥
            <span>{isScreenSharing ? 'Stop Share' : 'Share'}</span>
          </button>

          {session.role === 'producer' && (
            <button
              className={`ctrl-btn ${isRecording ? 'ctrl-recording' : ''}`}
              onClick={toggleRecording}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? '⏹' : '⏺'}
              <span>{isRecording ? 'Stop Rec' : 'Record'}</span>
            </button>
          )}

          <button className="ctrl-btn ctrl-leave" onClick={handleLeave}>
            📴
            <span>Leave</span>
          </button>
        </div>

        <div className="controls-right">
          <div className="quality-indicator">
            <span className="quality-dot" />
            HD
          </div>
        </div>
      </div>
    </div>
  );
}
