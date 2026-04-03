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
  const [error, setError] = useState('');
  const [screenShareId, setScreenShareId] = useState(null);

  const updateParticipants = useCallback((call) => {
    const parts = call.participants();
    setParticipants({ ...parts });
  }, []);

  useEffect(() => {
    let call;

    const init = async () => {
      call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: true,
      });

      callRef.current = call;

      call
        .on('joined-meeting', () => {
          setJoined(true);
          updateParticipants(call);
        })
        .on('participant-joined', () => updateParticipants(call))
        .on('participant-updated', () => updateParticipants(call))
        .on('participant-left', (e) => {
          setScreenShareId(prev => prev === e?.participant?.session_id ? null : prev);
          updateParticipants(call);
        })
        .on('track-started', (e) => {
          if (e?.track?.kind === 'video' && e?.participant?.screen) {
            setScreenShareId(e.participant.session_id);
          }
          updateParticipants(call);
        })
        .on('track-stopped', (e) => {
          if (e?.track?.kind === 'video' && e?.participant?.screen) {
            setScreenShareId(null);
          }
          updateParticipants(call);
        })
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
          console.warn('Camera error:', e);
        })
        .on('error', (e) => {
          console.error('Daily error:', e);
          if (e?.errorMsg?.includes('not allowed') || e?.errorMsg?.includes('Permission')) {
            setError('Camera/mic access denied. Please allow permissions and refresh.');
          }
        });

      try {
        await call.join({
          url: session.roomUrl,
          userName: session.name,
          startVideoOff: false,
          startAudioOff: false,
        });
      } catch (e) {
        console.error('Join failed:', e);
        setError('Failed to join room. Please refresh and try again.');
      }
    };

    init();

    return () => {
      if (call) call.destroy();
    };
  }, [session.roomUrl, session.name, updateParticipants]);

  // Attach tracks to video/audio elements
  useEffect(() => {
    if (!joined) return;
    Object.entries(participants).forEach(([id, p]) => {
      // Main video
      const videoEl = document.getElementById('video-' + id);
      if (videoEl) {
        const track = p.videoTrack;
        if (track) {
          try {
            if (!videoEl.srcObject || videoEl.srcObject.getVideoTracks()[0] !== track) {
              videoEl.srcObject = new MediaStream([track]);
              videoEl.play().catch(() => {});
            }
          } catch (e) {}
        }
      }
      // Screen share video
      const screenEl = document.getElementById('screen-' + id);
      if (screenEl && p.screenVideoTrack) {
        try {
          if (!screenEl.srcObject || screenEl.srcObject.getVideoTracks()[0] !== p.screenVideoTrack) {
            screenEl.srcObject = new MediaStream([p.screenVideoTrack]);
            screenEl.play().catch(() => {});
          }
        } catch (e) {}
      }
      // Audio
      if (id !== 'local') {
        const audioEl = document.getElementById('audio-' + id);
        if (audioEl && p.audioTrack) {
          try {
            if (!audioEl.srcObject || audioEl.srcObject.getAudioTracks()[0] !== p.audioTrack) {
              audioEl.srcObject = new MediaStream([p.audioTrack]);
              audioEl.play().catch(() => {});
            }
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

  // Spotlight logic: screen share takes priority, then selected, then first remote, then local
  const screenShareParticipant = screenShareId ? participants[screenShareId] : null;
  const effectiveSpotlightKey = screenShareId || spotlightId || (remoteParticipants.length > 0 ? remoteParticipants[0][0] : 'local');
  const spotlightParticipant = participants[effectiveSpotlightKey];

  if (error) {
    return (
      <div className="studio">
        <div className="permission-error">
          <div className="perm-icon">🎥</div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="join-btn-perm" onClick={() => window.location.reload()}>Try Again</button>
          <button className="leave-link" onClick={onLeave}>Go Back</button>
        </div>
      </div>
    );
  }

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

      {/* Body */}
      <div className="studio-body">
        {/* Spotlight */}
        <div className="spotlight-area">
          {spotlightParticipant ? (
            <div className="spotlight-video-wrap">
              {/* Show screen share in spotlight if active */}
              {screenShareParticipant && screenShareId === effectiveSpotlightKey ? (
                <video
                  id={'screen-' + effectiveSpotlightKey}
                  autoPlay playsInline muted
                  className="spotlight-video"
                />
              ) : (
                <video
                  id={'video-' + effectiveSpotlightKey}
                  autoPlay playsInline
                  muted={effectiveSpotlightKey === 'local'}
                  className="spotlight-video"
                />
              )}
              <div className="spotlight-name">
                {spotlightParticipant.user_name || 'Guest'}
                {effectiveSpotlightKey === 'local' && ' (You)'}
                {screenShareId === effectiveSpotlightKey && ' · Screen'}
              </div>
              {/* If screen sharing, show small face cam overlay */}
              {screenShareId && screenShareId === effectiveSpotlightKey && (
                <div className="face-overlay">
                  <video
                    id={'video-' + effectiveSpotlightKey + '-overlay'}
                    autoPlay playsInline muted
                    className="face-overlay-video"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="waiting-state">
              <div className="waiting-icon">🎙</div>
              <p>{joined ? 'Waiting for guests...' : 'Connecting...'}</p>
              {session.role === 'producer' && session.guestLink && joined && (
                <button className="invite-btn-large" onClick={copyGuestLink}>
                  {guestLinkCopied ? '✓ Copied!' : 'Copy Invite Link'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="side-panel">
          <div className="panel-label">PARTICIPANTS</div>
          <div className="tiles-grid">
            {participantList.map(([id, p]) => (
              <div
                key={id}
                className={'tile' + (effectiveSpotlightKey === id ? ' tile-spotlit' : '')}
                onClick={() => setSpotlightId(id === spotlightId ? null : id)}
              >
                <video id={'video-' + id} autoPlay playsInline muted={id === 'local'} className="tile-video" />
                {id !== 'local' && <audio id={'audio-' + id} autoPlay playsInline />}
                <div className="tile-name">
                  {p.user_name || 'Guest'}{id === 'local' && ' (You)'}
                </div>
                {effectiveSpotlightKey === id && <div className="tile-spotlight-badge">●</div>}
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

      {/* Controls */}
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
