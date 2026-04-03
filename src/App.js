import React, { useState, useEffect } from 'react';
import JoinScreen from './components/JoinScreen';
import Studio from './components/Studio';
import './App.css';

function App() {
  const [session, setSession] = useState(null);

  // Check URL for room param (guest joining via link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      // Pre-fill room name from URL
      setSession(prev => prev ? prev : { prefilledRoom: roomParam });
    }
  }, []);

  const handleJoin = (sessionData) => {
    setSession(sessionData);
  };

  const handleLeave = () => {
    setSession(null);
    window.history.pushState({}, '', '/');
  };

  if (session && session.roomUrl) {
    return <Studio session={session} onLeave={handleLeave} />;
  }

  return <JoinScreen onJoin={handleJoin} prefilledRoom={session?.prefilledRoom} />;
}

export default App;
