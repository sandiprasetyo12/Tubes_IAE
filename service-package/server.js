const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const port = 3001;

//supaya express bisa membaca json
app.use(express.json());

// koneksi ke database
const dbConfig = {
    host: process.env.DB_HOST || "service-db",
    user: process.env.DB_USER || "service_package_user",
    password: process.env.DB_PASSWORD || "service_package_password",
    database: process.env.DB_NAME || "service_package_db", port: 3306
};

let db;

//koneksi ke database saat server mulai
async function  conneectWithRetry(retries = 20, delay = 3000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            db = await mysql.createConnection(dbConfig);
            console.log("Service Package berhasil terhubung ke MySQL");
            return;
        } catch (error) {
            console.error('Gagal terhubung ke MySQL,percobaan ke ${attempt}');
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Tidak dapat terhubung ke MySQL');
}

//Membuat tabel service jika belum ada
async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS service (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      harga_per_kg INT NOT NULL,
      waktu_pengerjaan INT NOT NULL
    )
  `);

//Masukan data seeder
const [rows] = await db.execute('SELECT COUNT(*) AS count FROM service');
if (rows[0].count === 0) {
    await db.execute(`
      INSERT INTO service (name, harga_per_kg, waktu_pengerjaan) VALUES
      ('Regular', 5000, 48),
      ('Express', 10000, 24),
      ('Kilat', 20000, 12)
    `);
    console.log('Data awal paket laundry berhasil ditambahkan');
  }
}

//Endpoint untuk cek apakah service berjalan
app.get('/health', (req, res) => {
    res.json({
        service: 'service-package',
        database: "mysql",
        status: 'running'
    });
});

//Endpoint untuk mendapatkan semua paket laundry
app.get('/services', async (req, res) => {
    try {
        const [services] = await db.execute('SELECT * FROM service');
        res.json({
            service: "service-package",
            data: services
        });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data paket", error: error.message });
    }
});

//Endpoint untuk mendapatkan detail paket laundry berdasarkan id
app.get('/services/:id', async (req, res) => {
    try {
        const [services] = await db.execute('SELECT * FROM service WHERE id = ?', [req.params.id]);
        if (services.length === 0) {
            return res.status(404).json({ message: "Paket laundry tidak ditemukan" });
        }
        res.json({
            service: "service-package",
            data: services[0]
        });
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data paket", error: error.message });
    }
});

//Endpoint untuk menambahkan paket laundry baru
app.post('/services', async (req, res) => {
    try {
        const { name, harga_per_kg, waktu_pengerjaan } = req.body;
        const [result] = await db.execute('INSERT INTO service (name, harga_per_kg, waktu_pengerjaan) VALUES (?, ?, ?)', [name, harga_per_kg, waktu_pengerjaan]);
        res.status(201).json({
            message: "Paket laundry berhasil ditambahkan", id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: "Gagal menambahkan paket laundry", error: error.message });
    }
});

//Endpoint untuk menghapus paket laundry
app.delete('/services/:id', async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM service WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Paket laundry tidak ditemukan" });
        }
        res.json({ message: "Paket laundry berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ message: "Gagal menghapus paket laundry", error: error.message });
    }
});


//Mulai server setelah berhasil koneksi ke database
async function startServer(){
    await conneectWithRetry();
    await initDatabase();
    app.listen(port, () => {
        console.log(`Service Package berjalan di port ${port}`);
    });
}
startServer();