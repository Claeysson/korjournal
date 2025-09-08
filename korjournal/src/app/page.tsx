'use client';

import { useState } from 'react';
import { Container } from 'react-bootstrap';
import NavBar from '@/components/NavBar';
import TripList from '@/components/TripList';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImportComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <NavBar onImportComplete={handleImportComplete} />
      
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h2 mb-0 fw-semibold">Resor</h1>
        </div>
        
        <TripList refresh={refreshTrigger} />
      </Container>
    </>
  );
}