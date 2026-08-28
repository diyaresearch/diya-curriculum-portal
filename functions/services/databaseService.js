/**
 * Database Service - Environment-aware abstraction layer
 * Switches between real Firebase and mock Firebase based on environment
 */

const { handleFirebaseError } = require('../middleware/errorHandler');
const {
  PROJECT_ID,
  STORAGE_BUCKET,
  resolveCredential,
  hasCredentialSource,
} = require('../config/credentials');

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
    this.credentialSource = null;
  }

  /**
   * Initialize the database service based on environment
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    const env = process.env.NODE_ENV || 'development';
    const mockRequested = process.env.ENABLE_MOCK_FIREBASE === 'true' || env === 'test';
    const enableMockMode = mockRequested || !this.hasValidFirebaseConfig();

    // Outside development, missing credentials are an outage, not a cue to
    // start serving mock data (issue #418).
    if (enableMockMode && !mockRequested && env !== 'development') {
      const { resolveCredential: probe } = require('../config/credentials');
      probe(); // throws with the remediation steps
    }

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
   * Check if a Firebase Admin credential source is configured.
   *
   * This used to test only for serviceAccountKey.json, which never exists in
   * a deployed Cloud Function - so the payments API silently ran on mock
   * Firebase instead of the runtime service account (issue #418).
   */
  hasValidFirebaseConfig() {
    return hasCredentialSource();
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

      const resolved = resolveCredential();

      this.admin = admin;
      admin.initializeApp({
        credential: resolved.credential,
        projectId: PROJECT_ID,
        storageBucket: STORAGE_BUCKET
      });

      this.db = admin.firestore();
      this.isMocked = false;
      this.credentialSource = resolved.source;

      console.log(`✅ Real Firebase initialized with ${resolved.detail}`);
    } catch (error) {
      console.error('❌ Failed to initialize real Firebase:', error.message);

      // Mock data must never stand in for Firestore outside development.
      // Silently serving fabricated records is worse than being down.
      if ((process.env.NODE_ENV || 'development') !== 'development') {
        throw error;
      }

      console.log('🔄 Falling back to mock Firebase (development only)...');
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