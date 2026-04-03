import React, { useEffect, useRef, useState } from 'react';
import './Studio.css';

export default function Studio({ session, onLeave }) {
  const iframeRef = useRef(null);
  const callRef = useRef(null);
  const [guestLinkCopied, setGuestLinkCopied] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const DailyIframe = window.DailyIframe;
    if (!DailyIframe || !iframeRef.current) return;

    const call = DailyIframe.wrap(iframeRef.current, {
      showLeaveButton: false,
      showFullscreenButton: true,
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: 'none',
        background: '#000',
      },
    });

    callRef.current = call;

    call
      .on('joined-meeting', () => setJoined(true))
      .on('left-meeting', () => onLeave());

    call.join({
      url: session.roomUrl,
      userName: session.name,
      showLeaveButton: false,
    });

    return () => {
      call.destroy();
    };
  }, [session.roomUrl, session.name, onLeave]);

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
    }
    onLeave();
  };

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
        </div>
        <div className="header-actions">
          {session.role === 'producer' && session.guestLink && (
            <button className="invite-btn" onClick={copyGuestLink}>
              {guestLinkCopied ? '✓ Copied!' : '🔗 Invite Guests'}
            </button>
          )}
          <button className="ctrl-btn ctrl-leave" onClick={handleLeave} style={{padding: '6px 14px', fontSize: '13px'}}>
            📴 Leave
          </button>
        </div>
      </div>

      <div className="iframe-wrap">
        <iframe
          ref={iframeRef}
          title="ISO Studio"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>

      {session.role === 'producer' && session.guestLink && (
        <div className="guest-link-bar">
          <span className="guest-link-label">Guest link:</span>
          <span className="guest-link-url">{session.guestLink}</span>
          <button className="copy-link-btn" onClick={copyGuestLink}>
            {guestLinkCopied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
