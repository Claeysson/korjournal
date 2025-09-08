'use client';

import { useState } from 'react';
import { Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';

interface ImportFormProps {
  onImportComplete: () => void;
}

export default function ImportForm({ onImportComplete }: ImportFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'danger' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

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
        const fileInput = document.getElementById('csvFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setUploadStatus({ 
          type: 'danger', 
          message: result.error || 'Import misslyckades' 
        });
      }
    } catch (error) {
      setUploadStatus({ 
        type: 'danger', 
        message: 'Ett fel uppstod vid import av filen.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Importera CSV-fil</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Välj CSV-fil</Form.Label>
            <Form.Control
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Form.Text className="text-muted">
              Stöder CSV-filer med semikolon (;) som separator. Dubbletter (samma startdatum, start- och slutmätarställning) hoppas över automatiskt.
            </Form.Text>
          </Form.Group>

          {uploadStatus.type && (
            <Alert variant={uploadStatus.type} className="mb-3">
              {uploadStatus.message}
            </Alert>
          )}

          {isUploading && (
            <ProgressBar animated now={100} className="mb-3" />
          )}

          <div className="d-grid">
            <Button 
              variant="primary" 
              type="submit" 
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Importerar...' : 'Importera CSV'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}