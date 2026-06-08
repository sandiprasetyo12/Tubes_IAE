const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');

// Definisi URL Service (Docker container names)
const SERVICES = {
    servicePackage: 'http://service-package:3001',
    transaction:    'http://transaction-service:3002',
    customer:       'http://customer-service:3003',
    report:         'http://report-service:8000'
};

// Type Definitions (Schema)
const typeDefs = `#graphql
  type Package {
    id: Int!
    name: String!
    harga_per_kg: Int!
    waktu_pengerjaan: Int
  }

  type Customer {
    id: Int!
    nama: String!
    nomor_hp: String!
    alamat: String!
  }

  type Transaction {
    id: String!
    customer_id: Int
    customer: Customer
    service_id: Int
    package: Package
    service_name: String
    berat_kg: Float!
    total_harga: Int!
    status: String!
  }

  type ReportData {
    total_transaksi: Int!
    total_pendapatan: Int!
    keterangan: String
  }

  type Report {
    service: String!
    data: ReportData!
  }

  type DeleteResult {
    message: String!
  }

  type Query {
    # Service Package
    packages: [Package]
    package(id: Int!): Package

    # Customer
    customers: [Customer]
    customer(id: Int!): Customer

    # Transaction
    transactions: [Transaction]
    transaction(id: String!): Transaction

    # Report
    report: Report
  }

  type Mutation {
    # === Service Package ===
    addPackage(name: String!, harga_per_kg: Int!, waktu_pengerjaan: Int!): Package
    updatePackage(id: Int!, name: String!, harga_per_kg: Int!, waktu_pengerjaan: Int!): DeleteResult
    deletePackage(id: Int!): DeleteResult

    # === Customer ===
    addCustomer(nama: String!, nomor_hp: String!, alamat: String!): Customer
    updateCustomer(id: Int!, nama: String!, nomor_hp: String!, alamat: String!): DeleteResult
    deleteCustomer(id: Int!): DeleteResult

    # === Transaction ===
    addTransaction(customer_id: Int!, service_id: Int!, berat_kg: Float!): Transaction
    updateTransaction(id: String!, status: String!): DeleteResult
    deleteTransaction(id: String!): DeleteResult
  }
`;

// Resolvers
const resolvers = {
    Query: {
        // Package
        packages: async () => {
            const res = await axios.get(`${SERVICES.servicePackage}/services`);
            return res.data.data;
        },
        package: async (_, { id }) => {
            const res = await axios.get(`${SERVICES.servicePackage}/services/${id}`);
            return res.data.data;
        },

        // Customer
        customers: async () => {
            const res = await axios.get(`${SERVICES.customer}/customers`);
            return res.data.data;
        },
        customer: async (_, { id }) => {
            const res = await axios.get(`${SERVICES.customer}/customers/${id}`);
            return res.data.data;
        },

        // Transaction
        transactions: async () => {
            const res = await axios.get(`${SERVICES.transaction}/transactions`);
            return res.data.data;
        },
        transaction: async (_, { id }) => {
            const res = await axios.get(`${SERVICES.transaction}/transactions/${id}`);
            return res.data.data;
        },

        // Report
        report: async () => {
            const res = await axios.get(`${SERVICES.report}/reports`);
            return res.data;
        }
    },

    Transaction: {
        id: (parent) => parent._id || parent.id,
        customer: async (parent) => {
            try {
                const res = await axios.get(`${SERVICES.customer}/customers/${parent.customer_id}`);
                return res.data.data;
            } catch (e) { return null; }
        },
        package: async (parent) => {
            try {
                const res = await axios.get(`${SERVICES.servicePackage}/services/${parent.service_id}`);
                return res.data.data;
            } catch (e) { return null; }
        }
    },

    Mutation: {
        // === Service Package ===
        addPackage: async (_, { name, harga_per_kg, waktu_pengerjaan }) => {
            const res = await axios.post(`${SERVICES.servicePackage}/services`, { name, harga_per_kg, waktu_pengerjaan });
            return { id: res.data.id, name, harga_per_kg, waktu_pengerjaan };
        },
        updatePackage: async (_, { id, name, harga_per_kg, waktu_pengerjaan }) => {
            const res = await axios.put(`${SERVICES.servicePackage}/services/${id}`, { name, harga_per_kg, waktu_pengerjaan });
            return { message: res.data.message };
        },
        deletePackage: async (_, { id }) => {
            const res = await axios.delete(`${SERVICES.servicePackage}/services/${id}`);
            return { message: res.data.message };
        },

        // === Customer ===
        addCustomer: async (_, { nama, nomor_hp, alamat }) => {
            const res = await axios.post(`${SERVICES.customer}/customers`, { nama, nomor_hp, alamat });
            return { id: res.data.id, nama, nomor_hp, alamat };
        },
        updateCustomer: async (_, { id, nama, nomor_hp, alamat }) => {
            const res = await axios.put(`${SERVICES.customer}/customers/${id}`, { nama, nomor_hp, alamat });
            return { message: res.data.message };
        },
        deleteCustomer: async (_, { id }) => {
            const res = await axios.delete(`${SERVICES.customer}/customers/${id}`);
            return { message: res.data.message };
        },

        // === Transaction ===
        addTransaction: async (_, { customer_id, service_id, berat_kg }) => {
            const res = await axios.post(`${SERVICES.transaction}/transactions`, { customer_id, service_id, berat_kg });
            return res.data.data;
        },
        updateTransaction: async (_, { id, status }) => {
            const res = await axios.put(`${SERVICES.transaction}/transactions/${id}`, { status });
            return { message: res.data.message };
        },
        deleteTransaction: async (_, { id }) => {
            const res = await axios.delete(`${SERVICES.transaction}/transactions/${id}`);
            return { message: res.data.message };
        }
    }
};

const server = new ApolloServer({ typeDefs, resolvers });

startStandaloneServer(server, {
    listen: { port: 4000 },
}).then(({ url }) => {
    console.log(`GraphQL Gateway siap di: ${url}`);
});
