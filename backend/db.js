const sql = require('mssql');

const config = {
  server: "localhost", // or check your actual server name
  database: "DB_Project", // Correct database name
  user: "DBProject", // Make sure SQL Authentication is enabled
  password: "Zamam12345", // Your password
  port: 1433, // Default SQL Server port
  options: {
    encrypt: false, // Disable encryption if using a local server
    trustServerCertificate: true,
  }
};

const connectToDB = async () => {
  try {
    return await sql.connect(config);
  } catch (err) {
    console.error('❌ SQL CONNECTION ERROR:', err);
    throw err;
  }
};

module.exports = { connectToDB, sql };
