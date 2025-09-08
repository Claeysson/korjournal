'use client';

import { useState } from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { useRouter, usePathname } from 'next/navigation';
import ImportModal from '@/components/ImportModal';

interface NavBarProps {
  onImportComplete?: () => void;
}

export default function NavBar({ onImportComplete }: NavBarProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleImportComplete = () => {
    if (onImportComplete) {
      onImportComplete();
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
              <button 
                className="btn btn-apple-primary"
                onClick={() => setShowImportModal(true)}
              >
                Importera CSV
              </button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}