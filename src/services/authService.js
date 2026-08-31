const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { generateToken } = require('../config/jwt');

class AuthService {
  async register(email, password, firstName, lastName) {
    try {
      // Check if user exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (existing.rows.length > 0) {
        throw new Error('Email already registered');
      }
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, first_name, last_name, role`,
        [email, passwordHash, firstName, lastName]
      );
      
      const user = result.rows[0];
      const token = generateToken(user.id, user.email, user.role);
      
      return { user, token };
    } catch (error) {
      throw error;
    }
  }
  
  async login(email, password) {
    try {
      // Get user
      const result = await pool.query(
        'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Invalid email or password');
      }
      
      const user = result.rows[0];
      
      // Check password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!validPassword) {
        throw new Error('Invalid email or password');
      }
      
      const token = generateToken(user.id, user.email, user.role);
      
      // Remove password hash from response
      delete user.password_hash;
      
      return { user, token };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService();