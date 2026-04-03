import React, { useState, useEffect } from 'react';
import JoinScreen from './components/JoinScreen';
import Studio from './components/Studio';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [prefilledRoom, setPrefilledRoom] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    // Only prefill if it looks like a real room name (not 'new' or empty)
    if (roomParam && roomParam !== 'new' && roomParam.length > 2) {
      setPrefilledRoom(roomParam);
    }
  }, []);

  const handleJoin = (sessionData) => {
    setSession(sessionData);
  };

  const handleLeave = () => {
    setSession(null);
    setPrefilledRoom('');
    window.history.pushState({}, '', '/');
  };

  if (session && session.roomUrl) {
    return <Studio session={session} onLeave={handleLeave} />;
  }

  return <JoinScreen onJoin={handleJoin} prefilledRoom={prefilledRoom} />;
}

export default App;
