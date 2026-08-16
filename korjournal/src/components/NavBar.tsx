'use client';

import { useState } from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { useRouter, usePathname } from 'next/navigation';
import ImportModal from '@/components/ImportModal';
import AddTripModal from '@/components/AddTripModal';

interface NavBarProps {
  onImportComplete?: () => void;
  onTripAdded?: () => void;
}

export default function NavBar({ onImportComplete, onTripAdded }: NavBarProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleImportComplete = () => {
    if (onImportComplete) {
      onImportComplete();
    }
  };

  const handleTripAdded = () => {
    if (onTripAdded) {
      onTripAdded();
    }
  };

  return (
    <>
      <Navbar expand="lg" className="apple-navbar mb-4" sticky="top">
        <Container>
          <Navbar.Brand className="fw-semibold">
            🚗 Körjournal
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link 
                href="/" 
                className={pathname === '/' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); router.push('/'); }}
              >
                Resor
              </Nav.Link>
              <Nav.Link 
                href="/statistics" 
                className={pathname === '/statistics' ? 'active' : ''}
                onClick={(e) => { e.preventDefault(); router.push('/statistics'); }}
              >
                Statistik
              </Nav.Link>
            </Nav>
            <Nav className="ms-auto">
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-apple-secondary"
                  onClick={() => setShowAddTripModal(true)}
                >
                  Lägg till resa
                </button>
                <button 
                  className="btn btn-apple-primary"
                  onClick={() => setShowImportModal(true)}
                >
                  Importera CSV
                </button>
              </div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />

      <AddTripModal
        show={showAddTripModal}
        onHide={() => setShowAddTripModal(false)}
        onSave={handleTripAdded}
      />
    </>
  );
}