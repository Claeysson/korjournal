'use client';

import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'danger' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    if (trip) {
      setCategory(trip.category);
      setNotes(trip.notes || '');
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
        notes
      };

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          notes
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
    } catch (error) {
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
        <div className="mb-3">
          <div className="small text-muted mb-2">
            <strong>Från:</strong> {trip.startPosition}<br />
            <strong>Till:</strong> {trip.endDestination}<br />
            <strong>Datum:</strong> {new Date(trip.startDate).toLocaleDateString('sv-SE')}<br />
            <strong>Avstånd:</strong> {trip.distance.toFixed(1)} km
          </div>
        </div>

        <Form>
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