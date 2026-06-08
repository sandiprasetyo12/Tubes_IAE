const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 8080;

app.use(express.json());

// URL masing-masing service (menggunakan nama container Docker)
const SERVICES = {
    servicePackage: 'http://service-package:3001',
    transaction:    'http://transaction-service:3002',
    customer:       'http://customer-service:3003',
    report:         'http://report-service:8000'
};

// =====================
// Endpoint Informasi Gateway
// =====================
app.get('/', (req, res) => {
    res.json({
        service: 'api-gateway',
        status: 'running',
        routes: {
            '/health-all'              : 'Cek status semua service',
            '/services'                : 'GET semua paket laundry',
            '/services/:id'            : 'GET paket laundry by ID',
            '/transactions'            : 'GET semua transaksi',
            '/transactions (POST)'     : 'Buat transaksi baru',
            '/customers'               : 'GET semua customer',
            '/reports'                 : 'GET laporan keuangan'
        }
    });
});

// =====================
// Cek health semua service sekaligus
// =====================
app.get('/health-all', async (req, res) => {
    const results = await Promise.allSettled([
        axios.get(`${SERVICES.servicePackage}/health`),
        axios.get(`${SERVICES.transaction}/health`),
        axios.get(`${SERVICES.customer}/health`),
        axios.get(`${SERVICES.report}/health`)
    ]);

    res.json({
        gateway: 'running',
        services: {
            'service-package'    : results[0].status === 'fulfilled' ? 'UP' : 'DOWN',
            'transaction-service': results[1].status === 'fulfilled' ? 'UP' : 'DOWN',
            'customer-service'   : results[2].status === 'fulfilled' ? 'UP' : 'DOWN',
            'report-service'     : results[3].status === 'fulfilled' ? 'UP' : 'DOWN'
        }
    });
});

// =====================
// Proxy ke Service Package
// =====================
app.get('/services', async (req, res) => {
    const response = await axios.get(`${SERVICES.servicePackage}/services`);
    res.json(response.data);
});

app.get('/services/:id', async (req, res) => {
    const response = await axios.get(`${SERVICES.servicePackage}/services/${req.params.id}`);
    res.json(response.data);
});

app.post('/services', async (req, res) => {
    const response = await axios.post(`${SERVICES.servicePackage}/services`, req.body);
    res.status(201).json(response.data);
});


//hapus data paket laundry berdasarkan id
app.delete('/services/:id', async (req, res) => {
    const response = await axios.delete(`${SERVICES.servicePackage}/services/${req.params.id}`);
    res.json(response.data);
});

// =====================
// Proxy ke Transaction Service
// =====================
app.get('/transactions', async (req, res) => {
    const response = await axios.get(`${SERVICES.transaction}/transactions`);
    res.json(response.data);
});

app.post('/transactions', async (req, res) => {
    const response = await axios.post(`${SERVICES.transaction}/transactions`, req.body);
    res.status(201).json(response.data);
});

// =====================
// Proxy ke Customer Service
// =====================
app.get('/customers', async (req, res) => {
    const response = await axios.get(`${SERVICES.customer}/customers`);
    res.json(response.data);
});

app.post('/customers', async (req, res) => {
    const response = await axios.post(`${SERVICES.customer}/customers`, req.body);
    res.status(201).json(response.data);
});

// =====================
// Proxy ke Report Service
// =====================
app.get('/reports', async (req, res) => {
    const response = await axios.get(`${SERVICES.report}/reports`);
    res.json(response.data);
});

app.listen(PORT, () => {
    console.log(`API Gateway berjalan di port ${PORT}`);
});
