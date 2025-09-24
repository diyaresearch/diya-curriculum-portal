/**
 * Database Service - Environment-aware abstraction layer
 * Switches between real Firebase and mock Firebase based on environment
 */

const { handleFirebaseError } = require('../middleware/errorHandler');

/**
 * Database Service Class
 * Provides a unified interface for database operations
 */
class DatabaseService {
  constructor() {
    this.admin = null;
    this.db = null;
    this.isInitialized = false;
    this.isMocked = false;
  }

  /**
   * Initialize the database service based on environment
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    const env = process.env.NODE_ENV || 'development';
    const enableMockMode = process.env.ENABLE_MOCK_FIREBASE === 'true' ||
                          env === 'test' ||
                          !this.hasValidFirebaseConfig();

    if (enableMockMode) {
      console.log('🔧 Initializing Firebase in MOCK mode');
      await this.initializeMockFirebase();
    } else {
      console.log('🔥 Initializing Firebase in REAL mode');
      await this.initializeRealFirebase();
    }

    this.isInitialized = true;
  }

  /**
   * Check if valid Firebase configuration exists
   */
  hasValidFirebaseConfig() {
    try {
      const fs = require('fs');
      const path = require('path');
      const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

      return fs.existsSync(serviceAccountPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize real Firebase Admin SDK
   */
  async initializeRealFirebase() {
    try {
      const admin = require('firebase-admin');

      // Check if already initialized
      if (admin.apps.length > 0) {
        this.admin = admin;
        this.db = admin.firestore();
        this.isMocked = false;
        return;
      }

      // Initialize with service account
      const serviceAccount = require('../serviceAccountKey.json');

      this.admin = admin;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
      });

      this.db = admin.firestore();
      this.isMocked = false;

      console.log('✅ Real Firebase initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize real Firebase:', error.message);
      console.log('🔄 Falling back to mock Firebase...');
      await this.initializeMockFirebase();
    }
  }

  /**
   * Initialize mock Firebase for development/testing
   */
  async initializeMockFirebase() {
    const { createMockFirebaseAdmin } = require('../utils/firebaseMock');

    this.admin = createMockFirebaseAdmin();
    this.db = this.admin.firestore();
    this.isMocked = true;

    console.log('✅ Mock Firebase initialized successfully');
  }

  /**
   * Get Firestore database instance
   */
  getDb() {
    if (!this.isInitialized) {
      throw new Error('DatabaseService not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get Firebase Admin instance
   */
  getAdmin() {
    if (!this.isInitialized) {
      throw new Error('DatabaseService not initialized. Call initialize() first.');
    }

    // For mock mode, return mock admin with proper FieldValue
    if (this.isMocked) {
      return {
        ...this.admin,
        firestore: {
          FieldValue: {
            serverTimestamp: () => new Date(),
            delete: () => null,
            increment: (n) => n,
            arrayUnion: (...elements) => elements,
            arrayRemove: (...elements) => elements
          }
        }
      };
    }

    return this.admin;
  }

  /**
   * Check if running in mock mode
   */
  isMockMode() {
    return this.isMocked;
  }

  /**
   * Safe database operation wrapper
   * Wraps database operations with proper error handling
   */
  async safeOperation(operation, operationName = 'Database operation') {
    try {
      return await operation();
    } catch (error) {
      const standardError = handleFirebaseError(error, operationName);
      throw standardError;
    }
  }

  /**
   * Get user document with fallback collections
   * Implements the hierarchical lookup pattern: teachers -> students -> users
   */
  async getUserDocument(userId, tableUsers) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.safeOperation(async () => {
      const db = this.getDb();

      // Check teachers collection first
      let userRef = db.collection("teachers").doc(userId);
      let userSnap = await userRef.get();

      if (userSnap.exists) {
        return { ref: userRef, snap: userSnap, collection: 'teachers' };
      }

      // Check students collection
      userRef = db.collection("students").doc(userId);
      userSnap = await userRef.get();

      if (userSnap.exists) {
        return { ref: userRef, snap: userSnap, collection: 'students' };
      }

      // Check unified users collection
      userRef = db.collection(tableUsers).doc(userId);
      userSnap = await userRef.get();

      return { ref: userRef, snap: userSnap, collection: 'users' };

    }, 'Getting user document');
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(tableUsers, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      page = 1,
      limit = 20,
      role = null,
      orderBy = 'createdAt',
      orderDirection = 'desc'
    } = options;

    return await this.safeOperation(async () => {
      const db = this.getDb();
      const offset = (page - 1) * limit;

      // Get total count
      let countQuery = db.collection(tableUsers);
      if (role) {
        countQuery = countQuery.where('role', '==', role);
      }

      const totalSnapshot = await countQuery.count().get();
      const totalUsers = totalSnapshot.data().count;

      // Get paginated users
      let query = db.collection(tableUsers)
        .orderBy(orderBy, orderDirection)
        .offset(offset)
        .limit(limit);

      if (role) {
        query = query.where('role', '==', role);
      }

      const usersSnapshot = await query.get();

      return {
        users: usersSnapshot.docs,
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        hasNextPage: page < Math.ceil(totalUsers / limit),
        hasPreviousPage: page > 1
      };

    }, 'Getting all users');
  }

  /**
   * Create or update user document
   */
  async setUserDocument(userId, tableUsers, userData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.safeOperation(async () => {
      const db = this.getDb();
      const admin = this.getAdmin();

      const userRef = db.collection(tableUsers).doc(userId);

      const dataWithTimestamp = {
        ...userData,
        createdAt: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
        updatedAt: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date()
      };

      await userRef.set(dataWithTimestamp);
      return userRef;

    }, 'Setting user document');
  }

  /**
   * Update user document
   */
  async updateUserDocument(userId, tableUsers, updateData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.safeOperation(async () => {
      const db = this.getDb();
      const admin = this.getAdmin();

      const userRef = db.collection(tableUsers).doc(userId);

      const dataWithTimestamp = {
        ...updateData,
        updatedAt: admin.firestore?.FieldValue?.serverTimestamp?.() || new Date()
      };

      await userRef.update(dataWithTimestamp);
      return userRef;

    }, 'Updating user document');
  }

  /**
   * Get environment info
   */
  getInfo() {
    return {
      initialized: this.isInitialized,
      mockMode: this.isMocked,
      environment: process.env.NODE_ENV || 'development',
      hasValidConfig: this.hasValidFirebaseConfig()
    };
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = {
  databaseService,
  DatabaseService
};