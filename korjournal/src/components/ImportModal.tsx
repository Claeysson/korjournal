'use client';

import { useState, useEffect } from 'react';
import { Modal, Form } from 'react-bootstrap';

interface ImportModalProps {
  show: boolean;
  onHide: () => void;
  onImportComplete: () => void;
}

export default function ImportModal({ show, onHide, onImportComplete }: ImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mapOkategoriseratToPrivat, setMapOkategoriseratToPrivat] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'danger' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  // Load the setting when modal opens
  useEffect(() => {
    if (show) {
      loadSetting();
    }
  }, [show]);

  const loadSetting = async () => {
    try {
      const response = await fetch('/api/settings?key=mapOkategoriseratToPrivat');
      const data = await response.json();
      setMapOkategoriseratToPrivat(data.value === 'true');
    } catch (error) {
      console.error('Error loading setting:', error);
    }
  };

  const saveSetting = async (value: boolean) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'mapOkategoriseratToPrivat',
          value: value.toString()
        }),
      });
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadStatus({ type: null, message: '' });
    } else {
      setSelectedFile(null);
      setUploadStatus({ 
        type: 'danger', 
        message: 'Vänligen välj en giltig CSV-fil.' 
      });
    }
  };

  const handleToggleChange = async (checked: boolean) => {
    setMapOkategoriseratToPrivat(checked);
    await saveSetting(checked);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setUploadStatus({ 
        type: 'danger', 
        message: 'Vänligen välj en CSV-fil först.' 
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: 'info', message: 'Importerar data...' });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus({ 
          type: 'success', 
          message: result.message 
        });
        setSelectedFile(null);
        onImportComplete();
        
        // Reset form
        const fileInput = document.getElementById('csvFileModal') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Close modal after successful import
        setTimeout(() => {
          onHide();
        }, 2000);
      } else {
        setUploadStatus({ 
          type: 'danger', 
          message: result.error || 'Import misslyckades' 
        });
      }
    } catch {
      setUploadStatus({ 
        type: 'danger', 
        message: 'Ett fel uppstod vid import av filen.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setUploadStatus({ type: null, message: '' });
      const fileInput = document.getElementById('csvFileModal') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered className="modal-apple">
      <Modal.Header closeButton={!isUploading}>
        <Modal.Title>Importera CSV-fil</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-medium">Välj CSV-fil</label>
            <input
              id="csvFileModal"
              type="file"
              className="form-control form-control-apple"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="form-text text-muted mt-2">
              Stöder CSV-filer med semikolon (;) som separator. Dubbletter hoppas över automatiskt.
            </div>
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="mapOkategoriseratToPrivat"
                checked={mapOkategoriseratToPrivat}
                onChange={(e) => handleToggleChange(e.target.checked)}
                disabled={isUploading}
              />
              <label className="form-check-label fw-medium" htmlFor="mapOkategoriseratToPrivat">
                Ändra automatiskt &quot;Okategoriserat&quot; till &quot;Privat&quot;
              </label>
            </div>
            <div className="form-text text-muted">
              När aktiverad kommer alla resor märkta som &quot;Okategoriserat&quot; att ändras till &quot;Privat&quot; vid import.
            </div>
          </div>

          {uploadStatus.type && (
            <div className={`alert-apple alert-${uploadStatus.type} mb-3`}>
              {uploadStatus.message}
            </div>
          )}

          {isUploading && (
            <div className="progress-apple mb-3">
              <div className="progress-bar" style={{width: '100%'}}></div>
            </div>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <button 
          className="btn btn-apple-secondary me-2"
          onClick={handleClose}
          disabled={isUploading}
        >
          Avbryt
        </button>
        <button 
          className="btn btn-apple-primary"
          onClick={handleSubmit}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? 'Importerar...' : 'Importera CSV'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}