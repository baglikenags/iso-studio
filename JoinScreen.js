import React, { useState } from 'react';
import './JoinScreen.css';

const DAILY_API_KEY = process.env.REACT_APP_DAILY_API_KEY;

export default function JoinScreen({ onJoin, prefilledRoom }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('guest');
  const [roomName, setRoomName] = useState(prefilledRoom || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName || undefined,
        properties: {
          max_participants: 10,
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
          // Highest quality audio settings
          enable_noise_cancellation_ui: true,
        },
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  };

  const getRoom = async (name) => {
    const response = await fetch(`https://api.daily.co/v1/rooms/${name}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    const data = await response.json();
    if (data.error) throw new Error('Room not found. Check the room name.');
    return data;
  };

  const handleJoin = async () => {
    if (!name.trim()) return setError('Enter your name');
    setLoading(true);
    setError('');

    try {
      let room;
      if (role === 'producer') {
        room = await createRoom();
        // Update URL so guests can join via link
        const guestLink = `${window.location.origin}?room=${room.name}`;
        window.history.pushState({}, '', `?room=${room.name}`);
        onJoin({
          roomUrl: room.url,
          roomName: room.name,
          guestLink,
          name,
          role,
        });
      } else {
        if (!roomName.trim()) return setError('Enter the room name to join');
        room = await getRoom(roomName.trim());
        onJoin({
          roomUrl: room.url,
          roomName: room.name,
          name,
          role,
        });
      }
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-screen">
      <div className="join-bg">
        <div className="join-grid" />
        <div className="join-glow" />
      </div>

      <div className="join-content">
        <div className="join-logo">
          <span className="logo-iso">ISO</span>
          <span className="logo-studio">STUDIO</span>
        </div>
        <p className="join-tagline">High quality remote recording</p>

        <div className="join-card">
          {/* Role selector */}
          <div className="role-tabs">
            <button
              className={`role-tab ${role === 'producer' ? 'active' : ''}`}
              onClick={() => setRole('producer')}
            >
              <span className="role-icon">🎙</span>
              Producer
            </button>
            <button
              className={`role-tab ${role === 'guest' ? 'active' : ''}`}
              onClick={() => setRole('guest')}
            >
              <span className="role-icon">🎧</span>
              Guest
            </button>
          </div>

          <div className="role-desc">
            {role === 'producer'
              ? 'Create a new room. Share the link with your guests.'
              : 'Join an existing room with the room name from your host.'}
          </div>

          {/* Name input */}
          <div className="input-group">
            <label>Your name</label>
            <input
              type="text"
              placeholder="e.g. Logan"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={30}
            />
          </div>

          {/* Room name - guest only */}
          {role === 'guest' && (
            <div className="input-group">
              <label>Room name</label>
              <input
                type="text"
                placeholder="Enter room name from host"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>
          )}

          {error && <div className="join-error">{error}</div>}

          <button className="join-btn" onClick={handleJoin} disabled={loading}>
            {loading ? (
              <span className="loading-dots">
                <span /><span /><span />
              </span>
            ) : (
              role === 'producer' ? 'Create Room' : 'Join Room'
            )}
          </button>
        </div>

        <p className="join-footer">No account needed for guests</p>
      </div>
    </div>
  );
}
