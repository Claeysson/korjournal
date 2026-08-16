'use client';

import { useState, useEffect } from 'react';
import { Modal, Form } from 'react-bootstrap';
import { Trip } from '@/lib/database';

interface EditTripModalProps {
  show: boolean;
  onHide: () => void;
  trip: Trip | null;
  onSave: (updatedTrip: Trip) => void;
}

export default function EditTripModal({ show, onHide, trip, onSave }: EditTripModalProps) {
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [startPosition, setStartPosition] = useState('');
  const [endDestination, setEndDestination] = useState('');
  const [duration, setDuration] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'danger' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    if (trip) {
      setCategory(trip.category);
      setNotes(trip.notes || '');
      setStartPosition(trip.startPosition || '');
      setEndDestination(trip.endDestination || '');
      setDuration(trip.duration || '');
      setSaveStatus({ type: null, message: '' });
    }
  }, [trip]);

  const handleSave = async () => {
    if (!trip) return;

    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });

    try {
      const updatedTrip = {
        ...trip,
        category,
        notes,
        startPosition,
        endDestination,
        duration
      };

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          notes,
          startPosition,
          endDestination,
          duration
        }),
      });

      if (response.ok) {
        setSaveStatus({ 
          type: 'success', 
          message: 'Resan har uppdaterats' 
        });
        onSave(updatedTrip);
        setTimeout(() => {
          onHide();
        }, 1500);
      } else {
        setSaveStatus({ 
          type: 'danger', 
          message: 'Kunde inte spara ändringar' 
        });
      }
    } catch {
      setSaveStatus({ 
        type: 'danger', 
        message: 'Ett fel uppstod vid sparande' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onHide();
    }
  };

  if (!trip) return null;

  return (
    <Modal show={show} onHide={handleClose} centered className="modal-apple">
      <Modal.Header closeButton={!isSaving}>
        <Modal.Title>Redigera resa</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Read-only information section */}
        <div className="mb-4">
          <h6 className="fw-medium mb-2" style={{ color: 'var(--apple-gray-6)' }}>Reseinformation</h6>
          <div className="small text-muted mb-2">
            <div className="row">
              <div className="col-6">
                <strong>Datum:</strong> {new Date(trip.startDate).toLocaleDateString('sv-SE')}<br />
                <strong>Avstånd:</strong> {trip.distance.toFixed(1)} km
              </div>
              <div className="col-6">
                <strong>Mätare start:</strong> {trip.odometerStart} km<br />
                <strong>Mätare slut:</strong> {trip.odometerEnd} km
              </div>
            </div>
          </div>
        </div>

        <Form>
          {/* Editable location fields */}
          <div className="mb-3">
            <label className="form-label fw-medium">Startposition</label>
            <Form.Control
              type="text"
              value={startPosition}
              onChange={(e) => setStartPosition(e.target.value)}
              className="form-control-apple"
              placeholder="Ange startposition..."
              disabled={isSaving}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">Slutdestination</label>
            <Form.Control
              type="text"
              value={endDestination}
              onChange={(e) => setEndDestination(e.target.value)}
              className="form-control-apple"
              placeholder="Ange slutdestination..."
              disabled={isSaving}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">Varaktighet</label>
            <Form.Control
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="form-control-apple"
              placeholder="t.ex. 1h 30m"
              disabled={isSaving}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">Kategori</label>
            <Form.Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-control-apple"
              disabled={isSaving}
            >
              <option value="Privat">Privat</option>
              <option value="Arbete">Arbete</option>
              <option value="Okategoriserat">Okategoriserat</option>
            </Form.Select>
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">Anteckningar</label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-control-apple"
              placeholder="Lägg till anteckningar..."
              disabled={isSaving}
            />
          </div>

          {saveStatus.type && (
            <div className={`alert-apple alert-${saveStatus.type} mb-3`}>
              {saveStatus.message}
            </div>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <button 
          className="btn btn-apple-secondary me-2"
          onClick={handleClose}
          disabled={isSaving}
        >
          Avbryt
        </button>
        <button 
          className="btn btn-apple-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Sparar...' : 'Spara'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}