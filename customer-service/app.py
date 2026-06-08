import os
import time
import psycopg2
from flask import Flask, request, jsonify

app = Flask(__name__)

# Konfigurasi database dari environment variable
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'customer-db'),
    'user': os.environ.get('DB_USER', 'customer_user'),
    'password': os.environ.get('DB_PASSWORD', 'customer_password'),
    'dbname': os.environ.get('DB_NAME', 'customer_db'),
    'port': 5432
}

db = None

# Koneksi ke PostgreSQL dengan Retry
def connect_with_retry(retries=20, delay=3):
    global db
    for attempt in range(1, retries + 1):
        try:
            db = psycopg2.connect(**DB_CONFIG)
            print("Customer Service berhasil terhubung ke PostgreSQL")
            return
        except Exception as e:
            print(f"Menunggu PostgreSQL siap... percobaan {attempt}")
            time.sleep(delay)
    raise Exception("Tidak dapat terhubung ke PostgreSQL")

# Membuat tabel dan seeding data awal
def init_database():
    cursor = db.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            nama VARCHAR(100) NOT NULL,
            nomor_hp VARCHAR(20) NOT NULL,
            alamat TEXT NOT NULL
        )
    """)
    cursor.execute("SELECT COUNT(*) FROM customers")
    count = cursor.fetchone()[0]
    if count == 0:
        cursor.execute("""
            INSERT INTO customers (nama, nomor_hp, alamat) VALUES
            ('Helmi Arif Zulfikar', '08123456789', 'Jl. Purwokerto Selatan.1, Purwokerto'),
            ('Nayaka Shafwan Bagas Adi Prasetyo', '08987654321', 'Jl. Sudirman No.5, Purwokerto'),
            ('Joanna Mareta', '08234567890', 'Jl. Gatot Subroto No.10, Purwokerto'),
            ('Mohammad Sandy Prasetyo', '08129876543', 'Jl. Jendral Soedirman No.15, Purwokerto')
        """)
    db.commit()
    cursor.close()
    print("Database customer siap")

# Endpoint cek status
@app.route('/health')
def health():
    return jsonify({'service': 'customer-service', 'database': 'postgresql', 'status': 'running'})

# Endpoint ambil semua customer
@app.route('/customers')
def get_customers():
    cursor = db.cursor()
    cursor.execute("SELECT * FROM customers")
    rows = cursor.fetchall()
    cursor.close()
    customers = [{'id': r[0], 'nama': r[1], 'nomor_hp': r[2], 'alamat': r[3]} for r in rows]
    return jsonify({'service': 'customer-service', 'data': customers})

# Endpoint ambil 1 customer by ID (Untuk dipanggil Transaction Service)
@app.route('/customers/<int:id>')
def get_customer_by_id(id):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM customers WHERE id = %s", (id,))
    row = cursor.fetchone()
    cursor.close()
    if row is None:
        return jsonify({'message': 'Customer tidak ditemukan'}), 404
    customer = {'id': row[0], 'nama': row[1], 'nomor_hp': row[2], 'alamat': row[3]}
    return jsonify({'service': 'customer-service', 'data': customer})

# Endpoint tambah customer baru
@app.route('/customers', methods=['POST'])
def add_customer():
    data = request.get_json()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO customers (nama, nomor_hp, alamat) VALUES (%s, %s, %s) RETURNING id",
        (data['nama'], data['nomor_hp'], data['alamat'])
    )
    new_id = cursor.fetchone()[0]
    db.commit()
    cursor.close()
    return jsonify({'message': 'Customer berhasil ditambahkan', 'id': new_id}), 201

# Endpoint update data customer
@app.route('/customers/<int:id>', methods=['PUT'])
def update_customer(id):
    data = request.get_json()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM customers WHERE id = %s", (id,))
    if cursor.fetchone() is None:
        cursor.close()
        return jsonify({'message': 'Customer tidak ditemukan'}), 404
    cursor.execute(
        "UPDATE customers SET nama = %s, nomor_hp = %s, alamat = %s WHERE id = %s",
        (data['nama'], data['nomor_hp'], data['alamat'], id)
    )
    db.commit()
    cursor.close()
    return jsonify({'message': 'Customer berhasil diupdate', 'id': id})

# Endpoint hapus customer
@app.route('/customers/<int:id>', methods=['DELETE'])
def delete_customer(id):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM customers WHERE id = %s", (id,))
    row = cursor.fetchone()
    if row is None:
        cursor.close()
        return jsonify({'message': 'Customer tidak ditemukan'}), 404
    cursor.execute("DELETE FROM customers WHERE id = %s", (id,))
    db.commit()
    cursor.close()
    return jsonify({'message': 'Customer berhasil dihapus', 'id': id})

# Jalankan server
if __name__ == '__main__':
    connect_with_retry()
    init_database()
    app.run(host='0.0.0.0', port=3003)
