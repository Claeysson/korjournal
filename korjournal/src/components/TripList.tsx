'use client';

import { useState, useEffect } from 'react';
import { Table, Pagination, Card, Badge, Spinner, Collapse, Form, Row, Col, Button, Container, Alert } from 'react-bootstrap';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip } from '@/lib/database';
import EditTripModal from './EditTripModal';

interface TripListProps {
  refresh: number;
}

export default function TripList({ refresh }: TripListProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [corruptionError, setCorruptionError] = useState<string | null>(null);
  const itemsPerPage = 20;

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-01-01`;
  });
  const [dateToFilter, setDateToFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [sortOrder, setSortOrder] = useState('desc');

  // Export states
  const [exportDriver, setExportDriver] = useState('');
  const [exportRegNumber, setExportRegNumber] = useState('');
  const [exportPersonNumber, setExportPersonNumber] = useState('');
  const [exportCarModel, setExportCarModel] = useState('');

  useEffect(() => {
    fetchTrips();
    loadExportSettings();
    fetchSummaryStats();
  }, [currentPage, refresh, categoryFilter, dateFromFilter, dateToFilter, sortOrder]);

  const loadExportSettings = async () => {
    try {
      const response = await fetch('/api/settings/multiple?keys=exportDriver,exportRegNumber,exportPersonNumber,exportCarModel');
      const data = await response.json();
      
      if (data.settings.exportDriver) setExportDriver(data.settings.exportDriver);
      if (data.settings.exportRegNumber) setExportRegNumber(data.settings.exportRegNumber);
      if (data.settings.exportPersonNumber) setExportPersonNumber(data.settings.exportPersonNumber);
      if (data.settings.exportCarModel) setExportCarModel(data.settings.exportCarModel);
    } catch (error) {
      console.error('Error loading export settings:', error);
    }
  };

  const saveExportSettings = async () => {
    try {
      await fetch('/api/settings/multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            exportDriver,
            exportRegNumber,
            exportPersonNumber,
            exportCarModel
          }
        }),
      });
    } catch (error) {
      console.error('Error saving export settings:', error);
    }
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(categoryFilter && { category: categoryFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter }),
        ...(sortOrder && { sort: sortOrder })
      });
      
      const response = await fetch(`/api/trips?${params}`);
      const data = await response.json();
      
      if (data.isCorruption) {
        setCorruptionError(data.error);
        setTrips([]);
        setTotal(0);
      } else {
        setTrips(data.trips || []);
        setTotal(data.total || 0);
        setCorruptionError(null);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowEditModal(true);
  };

  const handleTripSave = (updatedTrip: Trip) => {
    // Update the trip in the local state
    setTrips(trips.map(trip => 
      trip.id === updatedTrip.id ? updatedTrip : trip
    ));
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  // Calculate summary statistics for filtered trips (fetch all filtered trips for accurate totals)
  const [summaryStats, setSummaryStats] = useState({ totalTrips: 0, totalDistance: 0, totalTime: '0h 0m' });

  const fetchSummaryStats = async () => {
    try {
      const params = new URLSearchParams({
        ...(categoryFilter && { category: categoryFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter })
      });
      
      const response = await fetch(`/api/trips/summary?${params}`);
      const data = await response.json();
      
      if (data.isCorruption) {
        setCorruptionError(data.error);
        setSummaryStats({ totalTrips: 0, totalDistance: 0, totalTime: '0h 0m' });
      } else {
        setSummaryStats({
          totalTrips: data.totalTrips || 0,
          totalDistance: data.totalDistance || 0,
          totalTime: data.totalTime || '0h 0m'
        });
      }
    } catch (error) {
      console.error('Error fetching summary stats:', error);
      setSummaryStats({ totalTrips: 0, totalDistance: 0, totalTime: '0h 0m' });
    }
  };


  const getCategoryBadge = (category: string) => {
    const variants: { [key: string]: string } = {
      'Privat': 'badge-apple badge-apple-blue',
      'Arbete': 'badge-apple badge-apple-green',
      'Okategoriserat': 'badge-apple badge-apple-gray'
    };
    return variants[category] || 'badge-apple badge-apple-gray';
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('sv-SE');
    } catch {
      return dateStr;
    }
  };

  const generatePDF = async () => {
    if (!exportDriver || !exportRegNumber || !exportPersonNumber || !exportCarModel) {
      alert('Vänligen fyll i alla exportfält');
      return;
    }

    // Fetch all trips within current filter (not just current page)
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Get all trips
        ...(categoryFilter && { category: categoryFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter }),
        ...(sortOrder && { sort: sortOrder })
      });
      
      const response = await fetch(`/api/trips?${params}`);
      const data = await response.json();
      const allTrips = data.trips;

      const doc = new jsPDF('landscape'); // Landscape orientation like the example
      
      // Title - centered
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text('KÖRJOURNAL', pageWidth / 2, 25, { align: 'center' });
      
      // Period - centered
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const periodText = `Period: ${formatDate(dateFromFilter)} - ${formatDate(dateToFilter)}`;
      doc.text(periodText, pageWidth / 2, 35, { align: 'center' });

      // Calculate odometer values
      let startOdometer = '';
      let endOdometer = '';
      if (allTrips.length > 0) {
        // Sort trips by date to get first and last
        const sortedTrips = [...allTrips].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        startOdometer = `${sortedTrips[0].odometerStart} km`;
        endOdometer = `${sortedTrips[sortedTrips.length - 1].odometerEnd} km`;
      }

      // Info table - separate columns for keys and values without vertical lines
      const infoTableData = [
        ['Förare:', exportDriver, 'Personnummer:', exportPersonNumber],
        ['Bilens reg.nr:', exportRegNumber, 'Bilmärke/modell:', exportCarModel],
        ['Mätarställning vid periodens början:', startOdometer, 'Mätarställning vid periodens slut:', endOdometer]
      ];

      autoTable(doc, {
        startY: 45,
        body: infoTableData,
        styles: {
          fontSize: 10,
          cellPadding: 3,
          fillColor: [255, 255, 255], // White background
          lineColor: [0, 0, 0],
          lineWidth: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }, // Only horizontal lines
          textColor: [0, 0, 0],
        },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }, // Key columns with white background
          1: { fillColor: [255, 255, 255], textColor: [0, 0, 0], halign: 'right' }, // Value columns with white background, right-aligned
          2: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] }, // Key columns with white background  
          3: { fillColor: [255, 255, 255], textColor: [0, 0, 0], halign: 'right' }, // Value columns with white background, right-aligned
        },
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.5,
        margin: { left: 10, right: 10 },
        willDrawCell: (data) => {
          // Remove vertical lines between key-value pairs
          if ((data.column.index === 0 && data.column.index + 1 === 1) || 
              (data.column.index === 2 && data.column.index + 1 === 3)) {
            data.cell.styles.lineWidth = { top: 0.5, bottom: 0.5, left: 0.5, right: 0 };
          }
          if (data.column.index === 1 || data.column.index === 3) {
            data.cell.styles.lineWidth = { top: 0.5, bottom: 0.5, left: 0, right: 0.5 };
          }
        }
      });

      // Calculate summary by category
      const categoryMap = new Map<string, { trips: number; distance: number }>();
      allTrips.forEach((trip: Trip) => {
        const category = trip.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { trips: 0, distance: 0 });
        }
        const stats = categoryMap.get(category)!;
        stats.trips += 1;
        stats.distance += trip.distance;
      });

      // Create summary table data with descriptions
      const getCategoryDescription = (category: string) => {
        switch (category) {
          case 'Privat': return 'Privata resor';
          case 'Arbete': return 'Tjänsteresor';
          case 'Okategoriserat': return 'Övriga resor';
          default: return category;
        }
      };

      const summaryTableData = [];
      let totalTripsCount = 0;
      let totalDistanceSum = 0;

      categoryMap.forEach((stats, category) => {
        summaryTableData.push([
          category,
          stats.trips.toString(),
          `${stats.distance.toFixed(1)} km`,
          getCategoryDescription(category)
        ]);
        totalTripsCount += stats.trips;
        totalDistanceSum += stats.distance;
      });

      // Add total row
      summaryTableData.push([
        'Totalt',
        totalTripsCount.toString(),
        `${totalDistanceSum.toFixed(1)} km`,
        ''
      ]);

      // Summary table
      const tableWidth = pageWidth - 20; // Full width minus margins
      const colWidth = tableWidth / 4; // Equal width for 4 columns
      
      autoTable(doc, {
        startY: 85,
        head: [['Kategori', 'Antal resor', 'Sträcka', 'Beskrivning']],
        body: summaryTableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          halign: 'left',
        },
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: colWidth },
          1: { cellWidth: colWidth },
          2: { cellWidth: colWidth },
          3: { cellWidth: colWidth }
        },
        margin: { left: 10, right: 10 },
        tableWidth: tableWidth
      });

      // Main trips table
      const mainTableStartY = (doc as any).lastAutoTable.finalY + 10;
      const tableData = allTrips.map((trip: Trip) => [
        formatDate(trip.startDate),
        trip.startPosition,
        trip.endDestination,
        trip.category,
        `${trip.odometerStart.toString()} km`,
        `${trip.odometerEnd.toString()} km`,
        `${trip.distance.toFixed(1)} km`,
        trip.notes || '' // Use notes if available, otherwise blank
      ]);

      autoTable(doc, {
        startY: mainTableStartY,
        head: [['Datum', 'Startadress', 'Slutadress', 'Kategori', 'Mätarställning start', 'Mätarställning slut', 'Sträcka', 'Ändamål']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontSize: 8,
          fontStyle: 'bold',
        },
        margin: { left: 10, right: 10, bottom: 25 },
        tableWidth: 'auto'
      });

      // Add page numbers to all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Sida ${i} av ${pageCount}`, 
          pageWidth / 2, 
          doc.internal.pageSize.getHeight() - 15, 
          { align: 'center' }
        );
      }

      // Open PDF as blob instead of downloading
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Fel vid generering av PDF');
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status" style={{color: 'var(--apple-blue)'}}>
          <span className="visually-hidden">Laddar...</span>
        </Spinner>
        <div className="mt-3 text-muted">Laddar resor...</div>
      </div>
    );
  }

  return (
    <>
      {/* Corruption Error Alert */}
      {corruptionError && (
        <Alert variant="warning" className="alert-apple mb-4">
          <div className="d-flex align-items-center">
            <div className="me-3" style={{ fontSize: '1.5rem' }}>⚠️</div>
            <div>
              <strong>Databasfel upptäckt</strong>
              <p className="mb-2">{corruptionError}</p>
              <div className="small text-muted">
                💡 <strong>Återställningshjälp:</strong> Gå till importfunktionen och ladda upp dina sparade CSV-filer igen. 
                Alla CSV-filer sparas automatiskt i uploads-mappen för säkerhetskopiering.
              </div>
            </div>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="ms-auto"
              onClick={() => setCorruptionError(null)}
            >
              ✕
            </Button>
          </div>
        </Alert>
      )}

      {/* Filter Card */}
      <Card 
        className="mb-3 mb-sm-4"
        style={{
          border: '1px solid var(--apple-gray-2)',
          borderRadius: '12px',
          boxShadow: 'var(--apple-shadow)',
          overflow: 'hidden'
        }}
      >
        <Card.Header 
          onClick={() => setShowFilters(!showFilters)}
          style={{ 
            cursor: 'pointer',
            backgroundColor: 'white',
            borderBottom: showFilters ? '1px solid var(--apple-gray-2)' : 'none',
            borderRadius: showFilters ? '12px 12px 0 0' : '12px',
            padding: '16px 20px'
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-semibold" style={{ color: 'var(--apple-gray-6)' }}>Filter</h6>
            <span style={{ color: 'var(--apple-blue)', fontSize: '14px' }}>
              {showFilters ? '↑' : '↓'}
            </span>
          </div>
        </Card.Header>
        <Collapse in={showFilters}>
          <div>
            <Card.Body style={{ padding: '20px' }}>
              <Row>
                <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Kategori
                    </Form.Label>
                    <Form.Select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      style={{
                        border: '1px solid var(--apple-gray-3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="">Alla kategorier</option>
                      <option value="Privat">Privat</option>
                      <option value="Arbete">Arbete</option>
                      <option value="Okategoriserat">Okategoriserat</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Från datum
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                      style={{
                        border: '1px solid var(--apple-gray-3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Till datum
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                      style={{
                        border: '1px solid var(--apple-gray-3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Sortering
                    </Form.Label>
                    <Form.Select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      style={{
                        border: '1px solid var(--apple-gray-3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="desc">Nyast först</option>
                      <option value="asc">Äldst först</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </div>
        </Collapse>
      </Card>

      {/* Export Card */}
      <Card 
        className="mb-3 mb-sm-4"
        style={{
          border: '1px solid var(--apple-gray-2)',
          borderRadius: '12px',
          boxShadow: 'var(--apple-shadow)',
          overflow: 'hidden'
        }}
      >
        <Card.Header 
          onClick={() => setShowExport(!showExport)}
          style={{ 
            cursor: 'pointer',
            backgroundColor: 'white',
            borderBottom: showExport ? '1px solid var(--apple-gray-2)' : 'none',
            borderRadius: showExport ? '12px 12px 0 0' : '12px',
            padding: '16px 20px'
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-semibold" style={{ color: 'var(--apple-gray-6)' }}>Export till PDF</h6>
            <span style={{ color: 'var(--apple-blue)', fontSize: '14px' }}>
              {showExport ? '↑' : '↓'}
            </span>
          </div>
        </Card.Header>
        <Collapse in={showExport}>
          <div>
            <Card.Body style={{ padding: '20px' }}>
              <Row>
                <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Förare
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={exportDriver}
                      onChange={(e) => setExportDriver(e.target.value)}
                      onBlur={saveExportSettings}
                      placeholder="Förnamn Efternamn"
                      style={{
                        border: '1px solid var(--apple-gray-3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Regnummer
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={exportRegNumber}
                      onChange={(e) => setExportRegNumber(e.target.value)}
                      onBlur={saveExportSettings}
                      placeholder="ABC123"
                      style={{
                        border: '1px solid var(--apple-gray-3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Personnummer
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={exportPersonNumber}
                      onChange={(e) => setExportPersonNumber(e.target.value)}
                      onBlur={saveExportSettings}
                      placeholder="YYYYMMDD-XXXX"
                      style={{
                        border: '1px solid var(--apple-gray-3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Bilmodell
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={exportCarModel}
                      onChange={(e) => setExportCarModel(e.target.value)}
                      onBlur={saveExportSettings}
                      placeholder="Volvo XC90"
                      style={{
                        border: '1px solid var(--apple-gray-3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col md={12}>
                  <Button
                    onClick={generatePDF}
                    className="btn-apple-primary"
                    disabled={!exportDriver || !exportRegNumber || !exportPersonNumber || !exportCarModel}
                  >
                    Exportera PDF
                  </Button>
                  <div className="small text-muted mt-2">
                    Exporterar alla resor som matchar aktuella filter. Filen sparas som travel-report-[datum].pdf<br/>
                    Uppgifterna sparas automatiskt när du lämnar fälten.
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </div>
        </Collapse>
      </Card>

      {/* Summary Cards */}
      <Row className="mb-3 mb-sm-4 g-3 g-sm-4">
        <Col xs={12} sm={4} md={4}>
          <Card className="apple-card h-100">
            <Card.Body className="text-center">
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
              <h3 className="text-primary mb-1">{summaryStats.totalTrips}</h3>
              <p className="text-muted mb-0">Antal resor</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={4} md={4}>
          <Card className="apple-card h-100">
            <Card.Body className="text-center">
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📏</div>
              <h3 className="text-success mb-1">{summaryStats.totalDistance.toFixed(1)} km</h3>
              <p className="text-muted mb-0">Total sträcka</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={4} md={4}>
          <Card className="apple-card h-100">
            <Card.Body className="text-center">
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏱️</div>
              <h3 className="text-info mb-1">{summaryStats.totalTime}</h3>
              <p className="text-muted mb-0">Total tid</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Trip Table */}
      <div className="apple-card">
        <div className="apple-card-header">
          <h5 className="mb-0 fw-semibold">Resor <span className="text-muted">({total} totalt)</span></h5>
        </div>
        <div className="p-0">
          {trips.length === 0 ? (
            <div className="text-center p-5">
              <div className="mb-3" style={{fontSize: '3rem', opacity: 0.3}}>📂</div>
              <div className="text-muted">Inga resor att visa</div>
              <div className="text-muted small">Importera en CSV-fil för att komma igång</div>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 apple-table">
                <thead>
                  <tr>
                    <th>Kategori</th>
                    <th>Startdatum</th>
                    <th className="d-none d-md-table-cell">Från</th>
                    <th className="d-none d-md-table-cell">Till</th>
                    <th>Avstånd</th>
                    <th className="d-none d-sm-table-cell">Bränsle</th>
                    <th className="d-none d-sm-table-cell">El</th>
                    <th className="d-none d-lg-table-cell">Tid</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr 
                      key={trip.id}
                      onClick={() => handleTripClick(trip)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span className={getCategoryBadge(trip.category)}>
                          {trip.category}
                        </span>
                      </td>
                      <td>
                        <div>{formatDate(trip.startDate)}</div>
                        <div className="d-md-none small text-muted">
                          {trip.startPosition} → {trip.endDestination}
                        </div>
                      </td>
                      <td className="text-truncate d-none d-md-table-cell" style={{ maxWidth: '150px' }}>
                        {trip.startPosition}
                      </td>
                      <td className="text-truncate d-none d-md-table-cell" style={{ maxWidth: '150px' }}>
                        {trip.endDestination}
                      </td>
                      <td className="fw-medium">{trip.distance.toFixed(1)} km</td>
                      <td className="text-muted small d-none d-sm-table-cell">{trip.fuelConsumption}</td>
                      <td className="text-muted small d-none d-sm-table-cell">{trip.batteryConsumption} kWh</td>
                      <td className="text-muted small d-none d-lg-table-cell">{trip.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <div className="pagination-apple d-flex">
            <div className="page-item">
              <button 
                className="page-link" 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
              >
                ‹‹
              </button>
            </div>
            <div className="page-item">
              <button 
                className="page-link" 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                disabled={currentPage === 1}
              >
                ‹
              </button>
            </div>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <div key={pageNum} className={`page-item ${pageNum === currentPage ? 'active' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                </div>
              );
            })}
            
            <div className="page-item">
              <button 
                className="page-link" 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                disabled={currentPage === totalPages}
              >
                ›
              </button>
            </div>
            <div className="page-item">
              <button 
                className="page-link" 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
              >
                ››
              </button>
            </div>
          </div>
        </div>
      )}

      <EditTripModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        trip={selectedTrip}
        onSave={handleTripSave}
      />
    </>
  );
}