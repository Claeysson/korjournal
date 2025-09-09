'use client';

import { useEffect, useState, useCallback } from 'react';
import { Container, Card, Row, Col, Spinner, Alert, Table, Collapse, Form } from 'react-bootstrap';

interface FuelStatistics {
  totalTrips: number;
  totalDistance: number;
  totalFuelConsumption: number;
  totalElectricConsumption: number;
  averageFuelPer100km: number;
  averageElectricPer100km: number;
  categoryStats: Array<{
    category: string;
    trips: number;
    distance: number;
    fuelConsumption: number;
    electricConsumption: number;
  }>;
  monthlyStats: Array<{
    month: string;
    trips: number;
    distance: number;
    fuelConsumption: number;
    electricConsumption: number;
  }>;
}

interface FuelStatisticsProps {
  className?: string;
}

export default function FuelStatistics({ className }: FuelStatisticsProps) {
  const [statistics, setStatistics] = useState<FuelStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPriceConfig, setShowPriceConfig] = useState(false);

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

  // Price configuration states
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('16.50');
  const [electricityPricePerKwh, setElectricityPricePerKwh] = useState('2.50');

  const loadPriceSettings = async () => {
    try {
      const response = await fetch('/api/settings/multiple?keys=fuelPricePerLiter,electricityPricePerKwh');
      const data = await response.json();
      
      if (data.settings.fuelPricePerLiter) {
        setFuelPricePerLiter(data.settings.fuelPricePerLiter);
      }
      if (data.settings.electricityPricePerKwh) {
        setElectricityPricePerKwh(data.settings.electricityPricePerKwh);
      }
    } catch (error) {
      console.error('Error loading price settings:', error);
    }
  };

  const savePriceSettings = async () => {
    try {
      await fetch('/api/settings/multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            fuelPricePerLiter,
            electricityPricePerKwh
          }
        }),
      });
    } catch (error) {
      console.error('Error saving price settings:', error);
    }
  };

  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(categoryFilter && { category: categoryFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter })
      });
      
      const response = await fetch(`/api/statistics/fuel?${params}`);
      if (!response.ok) throw new Error('Failed to fetch statistics');
      
      const data = await response.json();
      setStatistics(data.statistics);
    } catch (err) {
      setError('Kunde inte hämta bränslestatistik');
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    loadPriceSettings();
    fetchStatistics();
  }, [categoryFilter, dateFromFilter, dateToFilter, fetchStatistics]);

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toLocaleString('sv-SE', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const formatMonth = (monthString: string) => {
    const date = new Date(monthString + '-01');
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' });
  };

  const getCategoryBadge = (category: string) => {
    const variants: { [key: string]: string } = {
      'Privat': 'badge-apple badge-apple-blue',
      'Arbete': 'badge-apple badge-apple-green',
      'Okategoriserat': 'badge-apple badge-apple-gray'
    };
    return variants[category] || 'badge-apple badge-apple-gray';
  };

  const calculateCosts = () => {
    if (!statistics) return { fuelCost: 0, electricityCost: 0, totalCost: 0, fuelCostPer100km: 0, electricityCostPer100km: 0, totalCostPer100km: 0 };
    
    const fuelPrice = parseFloat(fuelPricePerLiter.replace(',', '.'));
    const electricityPrice = parseFloat(electricityPricePerKwh.replace(',', '.'));
    
    const fuelCost = statistics.totalFuelConsumption * fuelPrice;
    const electricityCost = statistics.totalElectricConsumption * electricityPrice;
    const totalCost = fuelCost + electricityCost;
    
    const fuelCostPer100km = statistics.totalDistance > 0 ? (fuelCost / statistics.totalDistance) * 100 : 0;
    const electricityCostPer100km = statistics.totalDistance > 0 ? (electricityCost / statistics.totalDistance) * 100 : 0;
    const totalCostPer100km = statistics.totalDistance > 0 ? (totalCost / statistics.totalDistance) * 100 : 0;
    
    return { fuelCost, electricityCost, totalCost, fuelCostPer100km, electricityCostPer100km, totalCostPer100km };
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('sv-SE', { 
      style: 'currency', 
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  if (loading) {
    return (
      <Container className={`py-4 ${className || ''}`}>
        <Card className="card-apple shadow-sm">
          <Card.Body className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 mb-0 text-muted">Laddar statistik...</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className={`py-4 ${className || ''}`}>
        <Alert variant="danger" className="alert-apple">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!statistics) {
    return (
      <Container className={`py-4 ${className || ''}`}>
        <Alert variant="info" className="alert-apple">
          Ingen statistik tillgänglig
        </Alert>
      </Container>
    );
  }

  return (
    <Container className={`py-4 ${className || ''}`}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h2 mb-0 fw-semibold">Bränslestatistik</h1>
      </div>

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
                <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
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
                <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
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
                <Col xs={12} sm={6} md={4}>
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
              </Row>
            </Card.Body>
          </div>
        </Collapse>
      </Card>

      {/* Price Configuration Card */}
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
          onClick={() => setShowPriceConfig(!showPriceConfig)}
          style={{ 
            cursor: 'pointer',
            backgroundColor: 'white',
            borderBottom: showPriceConfig ? '1px solid var(--apple-gray-2)' : 'none',
            borderRadius: showPriceConfig ? '12px 12px 0 0' : '12px',
            padding: '16px 20px'
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-semibold" style={{ color: 'var(--apple-gray-6)' }}>Priskonfiguration</h6>
            <span style={{ color: 'var(--apple-blue)', fontSize: '14px' }}>
              {showPriceConfig ? '↑' : '↓'}
            </span>
          </div>
        </Card.Header>
        <Collapse in={showPriceConfig}>
          <div>
            <Card.Body style={{ padding: '20px' }}>
              <Row>
                <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Pris per liter bränsle (kr)
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={fuelPricePerLiter}
                      onChange={(e) => setFuelPricePerLiter(e.target.value)}
                      onBlur={savePriceSettings}
                      placeholder="16,50"
                      style={{
                        border: '1px solid var(--apple-gray-3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={4}>
                  <Form.Group>
                    <Form.Label className="fw-medium small" style={{ color: 'var(--apple-gray-5)' }}>
                      Pris per kWh el (kr)
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={electricityPricePerKwh}
                      onChange={(e) => setElectricityPricePerKwh(e.target.value)}
                      onBlur={savePriceSettings}
                      placeholder="2,50"
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
            </Card.Body>
          </div>
        </Collapse>
      </Card>

      {/* Average Consumption Cards */}
      <Row className="mb-3 mb-sm-4 g-3 g-sm-4">
        <Col xs={12} sm={6} md={6}>
          <Card className="apple-card h-100">
            <Card.Body className="text-center">
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
              <h3 className="text-success mb-1">{formatNumber(statistics.averageFuelPer100km)} l/100km</h3>
              <p className="text-muted mb-0">Genomsnittlig bränsleförbrukning</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card className="apple-card h-100">
            <Card.Body className="text-center">
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚡</div>
              <h3 className="text-info mb-1">{formatNumber(statistics.averageElectricPer100km)} kWh/100km</h3>
              <p className="text-muted mb-0">Genomsnittlig elförbrukning</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Detailed Cost Breakdown */}
      <Row className="mb-3 mb-sm-4 g-3 g-sm-4">
        <Col xs={12} sm={6} md={6}>
          <Card className="apple-card h-100">
            <Card.Body className="text-center">
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⛽</div>
              <h3 className="text-primary mb-1">{formatCurrency(calculateCosts().fuelCostPer100km)}/100km</h3>
              <p className="text-muted mb-0">Bränslekostnad per 100km</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card className="apple-card h-100">
            <Card.Body className="text-center">
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔋</div>
              <h3 className="text-info mb-1">{formatCurrency(calculateCosts().electricityCostPer100km)}/100km</h3>
              <p className="text-muted mb-0">Elkostnad per 100km</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Cost Overview Cards */}
      {(() => {
        const costs = calculateCosts();
        return (
          <Row className="mb-3 mb-sm-4 g-3 g-sm-4">
            <Col xs={12} sm={6} md={3}>
              <Card className="apple-card text-center h-100">
                <Card.Body>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⛽</div>
                  <h3 className="text-primary mb-1">{formatCurrency(costs.fuelCost)}</h3>
                  <p className="text-muted mb-0 small">Total bränslekostnad</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Card className="apple-card text-center h-100">
                <Card.Body>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔋</div>
                  <h3 className="text-primary mb-1">{formatCurrency(costs.electricityCost)}</h3>
                  <p className="text-muted mb-0 small">Total elkostnad</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Card className="apple-card text-center h-100">
                <Card.Body>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
                  <h3 className="text-success mb-1">{formatCurrency(costs.totalCost)}</h3>
                  <p className="text-muted mb-0 small">Total kostnad</p>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Card className="apple-card text-center h-100">
                <Card.Body>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
                  <h3 className="text-info mb-1">{formatCurrency(costs.totalCostPer100km)}</h3>
                  <p className="text-muted mb-0 small">Kostnad per 100km</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        );
      })()}

      {/* Overview Cards */}
      <Row className="mb-3 mb-sm-4 g-3 g-sm-4">
        <Col xs={12} sm={6} md={3}>
          <Card className="apple-card text-center h-100">
            <Card.Body>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚗</div>
              <h3 className="text-primary mb-1">{formatNumber(statistics.totalTrips, 0)}</h3>
              <p className="text-muted mb-0 small">Totalt antal resor</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="apple-card text-center h-100">
            <Card.Body>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📏</div>
              <h3 className="text-primary mb-1">{formatNumber(statistics.totalDistance)} km</h3>
              <p className="text-muted mb-0 small">Total körsträcka</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="apple-card text-center h-100">
            <Card.Body>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⛽</div>
              <h3 className="text-primary mb-1">{formatNumber(statistics.totalFuelConsumption)} l</h3>
              <p className="text-muted mb-0 small">Total bränsleförbrukning</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="apple-card text-center h-100">
            <Card.Body>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔋</div>
              <h3 className="text-primary mb-1">{formatNumber(statistics.totalElectricConsumption)} kWh</h3>
              <p className="text-muted mb-0 small">Total elförbrukning</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Category Statistics */}
      <Card className="apple-card mb-4">
        <div className="apple-card-header">
          <h5 className="mb-0 fw-semibold">Statistik per kategori</h5>
        </div>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table className="mb-0 apple-table">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th className="d-none d-sm-table-cell">Resor</th>
                  <th>Avstånd</th>
                  <th className="d-none d-md-table-cell">Bränsle</th>
                  <th className="d-none d-md-table-cell">El</th>
                  <th>l/100km</th>
                  <th className="d-none d-lg-table-cell">kWh/100km</th>
                </tr>
              </thead>
              <tbody>
                {statistics.categoryStats.map((stat, index) => (
                  <tr key={index}>
                    <td>
                      <span className={getCategoryBadge(stat.category)}>
                        {stat.category}
                      </span>
                      <div className="d-sm-none small text-muted mt-1">
                        {formatNumber(stat.trips, 0)} resor
                      </div>
                    </td>
                    <td className="d-none d-sm-table-cell">{formatNumber(stat.trips, 0)}</td>
                    <td>{formatNumber(stat.distance)} km</td>
                    <td className="d-none d-md-table-cell">{formatNumber(stat.fuelConsumption)} l</td>
                    <td className="d-none d-md-table-cell">{formatNumber(stat.electricConsumption)} kWh</td>
                    <td className="fw-medium">
                      {stat.distance > 0 ? formatNumber((stat.fuelConsumption / stat.distance) * 100) : '0,0'}
                    </td>
                    <td className="fw-medium d-none d-lg-table-cell">
                      {stat.distance > 0 ? formatNumber((stat.electricConsumption / stat.distance) * 100) : '0,0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Monthly Statistics */}
      <Card className="apple-card">
        <div className="apple-card-header">
          <h5 className="mb-0 fw-semibold">Månadsstatistik</h5>
        </div>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table className="mb-0 apple-table">
              <thead>
                <tr>
                  <th>Månad</th>
                  <th className="d-none d-sm-table-cell">Resor</th>
                  <th>Avstånd</th>
                  <th className="d-none d-md-table-cell">Bränsle</th>
                  <th className="d-none d-md-table-cell">El</th>
                  <th>l/100km</th>
                  <th className="d-none d-lg-table-cell">kWh/100km</th>
                </tr>
              </thead>
              <tbody>
                {statistics.monthlyStats.map((stat, index) => (
                  <tr key={index}>
                    <td className="fw-medium">
                      {formatMonth(stat.month)}
                      <div className="d-sm-none small text-muted mt-1">
                        {formatNumber(stat.trips, 0)} resor
                      </div>
                    </td>
                    <td className="d-none d-sm-table-cell">{formatNumber(stat.trips, 0)}</td>
                    <td>{formatNumber(stat.distance)} km</td>
                    <td className="d-none d-md-table-cell">{formatNumber(stat.fuelConsumption)} l</td>
                    <td className="d-none d-md-table-cell">{formatNumber(stat.electricConsumption)} kWh</td>
                    <td className="text-success fw-medium">
                      {stat.distance > 0 ? formatNumber((stat.fuelConsumption / stat.distance) * 100) : '0,0'}
                    </td>
                    <td className="text-info fw-medium d-none d-lg-table-cell">
                      {stat.distance > 0 ? formatNumber((stat.electricConsumption / stat.distance) * 100) : '0,0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}