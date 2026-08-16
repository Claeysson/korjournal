'use client';

import { useState, useEffect } from 'react';
import { Modal, Form, Row, Col } from 'react-bootstrap';

interface AddTripModalProps {
  show: boolean;
  onHide: () => void;
  onSave: () => void;
  preset?: {
    odometerStart?: number;
    odometerEnd?: number;
  } | null;
}

export default function AddTripModal({ show, onHide, onSave, preset }: AddTripModalProps) {
  const [category, setCategory] = useState('Privat');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  });
  const [startPosition, setStartPosition] = useState('');
  const [odometerStart, setOdometerStart] = useState<number | ''>('');
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  });
  const [endDestination, setEndDestination] = useState('');
  const [odometerEnd, setOdometerEnd] = useState<number | ''>('');

  // Set preset values when modal opens
  useEffect(() => {
    if (show && preset) {
      if (preset.odometerStart !== undefined) {
        setOdometerStart(preset.odometerStart);
      }
      if (preset.odometerEnd !== undefined) {
        setOdometerEnd(preset.odometerEnd);
      }
    }
  }, [show, preset]);
  const [duration, setDuration] = useState('');
  const [fuelConsumption, setFuelConsumption] = useState('');
  const [batteryConsumption, setBatteryConsumption] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'danger' | null;
    message: string;
  }>({ type: null, message: '' });

  // Calculate distance from odometer readings
  const calculatedDistance = odometerStart !== '' && odometerEnd !== '' 
    ? Math.max(0, Number(odometerEnd) - Number(odometerStart))
    : 0;

  const handleSave = async () => {
    // Validate required fields
    if (!category || !startDate || !startTime || !startPosition || !endDate || !endTime || !endDestination || 
        odometerStart === '' || odometerEnd === '') {
      setSaveStatus({
        type: 'danger',
        message: 'Vänligen fyll i alla obligatoriska fält'
      });
      return;
    }

    if (Number(odometerEnd) < Number(odometerStart)) {
      setSaveStatus({
        type: 'danger',
        message: 'Slutmätarställning kan inte vara mindre än startmätarställning'
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });

    try {
      // Format dates to ISO format with time
      const startDateTime = `${startDate} ${startTime}`;
      const endDateTime = `${endDate} ${endTime}`;

      const tripData = {
        category,
        startDate: startDateTime,
        odometerStart: Number(odometerStart),
        startPosition,
        endDate: endDateTime,
        odometerEnd: Number(odometerEnd),
        endDestination,
        duration,
        distance: calculatedDistance,
        fuelConsumption,
        title: '',
        batteryConsumption,
        batteryRegeneration: '',
        notes
      };

      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tripData),
      });

      if (response.ok) {
        setSaveStatus({ 
          type: 'success', 
          message: 'Resa skapad framgångsrikt' 
        });
        
        // Reset form
        setStartPosition('');
        setEndDestination('');
        setOdometerStart('');
        setOdometerEnd('');
        setDuration('');
        setFuelConsumption('');
        setBatteryConsumption('');
        setNotes('');
        const now = new Date();
        setStartDate(now.toISOString().split('T')[0]);
        setStartTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
        setEndDate(now.toISOString().split('T')[0]);
        setEndTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
        
        onSave();
        
        setTimeout(() => {
          onHide();
          setSaveStatus({ type: null, message: '' });
        }, 1500);
      } else {
        const errorData = await response.json();
        setSaveStatus({ 
          type: 'danger', 
          message: errorData.error || 'Kunde inte skapa resa' 
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
      setSaveStatus({ type: null, message: '' });
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered className="modal-apple">
      <Modal.Header closeButton={!isSaving}>
        <Modal.Title>Lägg till ny resa</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row>
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Kategori *</label>
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
            </Col>
          </Row>

          <Row>
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Startdatum *</label>
              <Form.Control
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-control-apple"
                disabled={isSaving}
              />
            </Col>
            
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Starttid *</label>
              <Form.Control
                type="time"
                step="1"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-control-apple"
                disabled={isSaving}
              />
            </Col>
          </Row>

          <div className="mb-3">
            <label className="form-label fw-medium">Startposition *</label>
            <Form.Control
              type="text"
              value={startPosition}
              onChange={(e) => setStartPosition(e.target.value)}
              className="form-control-apple"
              placeholder="Ange startposition..."
              disabled={isSaving}
            />
          </div>

          <Row>
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Mätarställning start (km) *</label>
              <Form.Control
                type="number"
                value={odometerStart}
                onChange={(e) => setOdometerStart(e.target.value ? Number(e.target.value) : '')}
                className="form-control-apple"
                placeholder="0"
                disabled={isSaving}
              />
            </Col>
          </Row>

          <Row>
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Slutdatum *</label>
              <Form.Control
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-control-apple"
                disabled={isSaving}
              />
            </Col>
            
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Sluttid *</label>
              <Form.Control
                type="time"
                step="1"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="form-control-apple"
                disabled={isSaving}
              />
            </Col>
          </Row>

          <div className="mb-3">
            <label className="form-label fw-medium">Slutdestination *</label>
            <Form.Control
              type="text"
              value={endDestination}
              onChange={(e) => setEndDestination(e.target.value)}
              className="form-control-apple"
              placeholder="Ange slutdestination..."
              disabled={isSaving}
            />
          </div>

          <Row>
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Mätarställning slut (km) *</label>
              <Form.Control
                type="number"
                value={odometerEnd}
                onChange={(e) => setOdometerEnd(e.target.value ? Number(e.target.value) : '')}
                className="form-control-apple"
                placeholder="0"
                disabled={isSaving}
              />
            </Col>
            
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Avstånd (beräknas automatiskt)</label>
              <Form.Control
                type="text"
                value={`${calculatedDistance.toFixed(1)} km`}
                className="form-control-apple"
                disabled={true}
                style={{ backgroundColor: 'var(--apple-gray-1)', color: 'var(--apple-gray-5)' }}
              />
            </Col>
          </Row>

          <Row>
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Varaktighet</label>
              <Form.Control
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="form-control-apple"
                placeholder="t.ex. 1h 30m"
                disabled={isSaving}
              />
            </Col>
            
            <Col md={6} className="mb-3">
              <label className="form-label fw-medium">Bränsleförbrukning</label>
              <Form.Control
                type="text"
                value={fuelConsumption}
                onChange={(e) => setFuelConsumption(e.target.value)}
                className="form-control-apple"
                placeholder="t.ex. 8.5 l"
                disabled={isSaving}
              />
            </Col>
          </Row>

          <div className="mb-3">
            <label className="form-label fw-medium">Batterianvändning</label>
            <Form.Control
              type="text"
              value={batteryConsumption}
              onChange={(e) => setBatteryConsumption(e.target.value)}
              className="form-control-apple"
              placeholder="t.ex. 12.5 kWh"
              disabled={isSaving}
            />
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

          <div className="small text-muted">
            * = Obligatoriska fält
          </div>
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
          {isSaving ? 'Sparar...' : 'Skapa resa'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}