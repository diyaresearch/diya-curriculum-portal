/**
 * Firebase Mock Service for Development and Testing
 * Provides mock implementations of Firebase Admin SDK functionality
 */

/**
 * Mock user data for testing
 */
const mockUsers = {
  'test-user-123': {
    email: 'test@example.com',
    fullName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    institution: 'Test University',
    userType: 'educator',
    jobTitle: 'Teacher',
    subjects: ['Math', 'Science'],
    role: 'teacherDefault',
    subscriptionType: 'basic',
    subscriptionStatus: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  'admin-user-123': {
    email: 'admin@example.com',
    fullName: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    institution: 'DIYA Ed',
    userType: 'admin',
    jobTitle: 'Administrator',
    subjects: [],
    role: 'admin',
    subscriptionType: 'enterprise',
    subscriptionStatus: 'active',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  'premium-user-123': {
    email: 'premium@example.com',
    fullName: 'Premium User',
    firstName: 'Premium',
    lastName: 'User',
    institution: 'Premium School',
    userType: 'educator',
    jobTitle: 'Senior Teacher',
    subjects: ['Physics', 'Chemistry'],
    role: 'teacherPlus',
    subscriptionType: 'premium',
    subscriptionStatus: 'active',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  }
};

/**
 * Mock DocumentSnapshot class
 */
class MockDocumentSnapshot {
  constructor(id, data, exists = true) {
    this.id = id;
    this._data = data;
    this._exists = exists;
  }

  get exists() {
    return this._exists;
  }

  data() {
    return this._exists ? this._data : null;
  }

  toDate() {
    return this._data instanceof Date ? this._data : new Date();
  }
}

/**
 * Mock QuerySnapshot class
 */
class MockQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
  }

  get size() {
    return this.docs.length;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

/**
 * Mock DocumentReference class
 */
class MockDocumentReference {
  constructor(collectionName, docId) {
    this.collectionName = collectionName;
    this.docId = docId;
  }

  async get() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    const userData = mockUsers[this.docId];
    if (userData) {
      return new MockDocumentSnapshot(this.docId, userData, true);
    } else {
      return new MockDocumentSnapshot(this.docId, null, false);
    }
  }

  async set(data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Add timestamps
    const timestamp = new Date();
    const userData = {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    mockUsers[this.docId] = userData;
    return { writeTime: timestamp };
  }

  async update(data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    if (!mockUsers[this.docId]) {
      throw new Error('Document not found');
    }

    // Update existing user data
    mockUsers[this.docId] = {
      ...mockUsers[this.docId],
      ...data,
      updatedAt: new Date()
    };

    return { writeTime: new Date() };
  }

  async delete() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    delete mockUsers[this.docId];
    return { writeTime: new Date() };
  }
}

/**
 * Mock Query class
 */
class MockQuery {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this._limit = null;
    this._offset = 0;
    this._orderBy = null;
    this._where = [];
  }

  limit(count) {
    this._limit = count;
    return this;
  }

  offset(count) {
    this._offset = count;
    return this;
  }

  orderBy(field, direction = 'asc') {
    this._orderBy = { field, direction };
    return this;
  }

  where(field, operator, value) {
    this._where.push({ field, operator, value });
    return this;
  }

  async get() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 20));

    let users = Object.entries(mockUsers).map(([id, data]) =>
      new MockDocumentSnapshot(id, data, true)
    );

    // Apply where filters
    this._where.forEach(filter => {
      users = users.filter(doc => {
        const docData = doc.data();
        const fieldValue = docData[filter.field];

        switch (filter.operator) {
          case '==':
            return fieldValue === filter.value;
          case '!=':
            return fieldValue !== filter.value;
          case '>':
            return fieldValue > filter.value;
          case '>=':
            return fieldValue >= filter.value;
          case '<':
            return fieldValue < filter.value;
          case '<=':
            return fieldValue <= filter.value;
          default:
            return true;
        }
      });
    });

    // Apply ordering
    if (this._orderBy) {
      users.sort((a, b) => {
        const aValue = a.data()[this._orderBy.field];
        const bValue = b.data()[this._orderBy.field];

        if (this._orderBy.direction === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }

    // Apply pagination
    if (this._offset > 0) {
      users = users.slice(this._offset);
    }
    if (this._limit) {
      users = users.slice(0, this._limit);
    }

    return new MockQuerySnapshot(users);
  }

  async count() {
    const snapshot = await this.get();
    return {
      data() {
        return { count: snapshot.size };
      }
    };
  }
}

/**
 * Mock Collection Reference class
 */
class MockCollectionReference extends MockQuery {
  constructor(collectionName) {
    super(collectionName);
  }

  doc(docId) {
    return new MockDocumentReference(this.collectionName, docId);
  }
}

/**
 * Mock Firestore class
 */
class MockFirestore {
  collection(collectionName) {
    return new MockCollectionReference(collectionName);
  }

  // Mock FieldValue for server timestamps
  static get FieldValue() {
    return {
      serverTimestamp: () => new Date(),
      delete: () => null,
      increment: (n) => n,
      arrayUnion: (...elements) => elements,
      arrayRemove: (...elements) => elements
    };
  }
}

/**
 * Mock Firebase Auth class
 */
class MockAuth {
  async verifyIdToken(token) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Mock token verification
    if (token === 'valid-admin-token') {
      return {
        uid: 'admin-user-123',
        email: 'admin@example.com',
        email_verified: true
      };
    } else if (token === 'valid-user-token') {
      return {
        uid: 'test-user-123',
        email: 'test@example.com',
        email_verified: true
      };
    } else if (token === 'valid-premium-token') {
      return {
        uid: 'premium-user-123',
        email: 'premium@example.com',
        email_verified: true
      };
    } else {
      const error = new Error('Invalid token');
      error.code = 'auth/invalid-id-token';
      throw error;
    }
  }

  async getUser(uid) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    const userData = mockUsers[uid];
    if (userData) {
      return {
        uid,
        email: userData.email,
        displayName: userData.fullName,
        emailVerified: true
      };
    } else {
      const error = new Error('User not found');
      error.code = 'auth/user-not-found';
      throw error;
    }
  }
}

/**
 * Mock Firebase Admin SDK
 */
class MockFirebaseAdmin {
  constructor() {
    this._firestore = new MockFirestore();
    this._auth = new MockAuth();
  }

  firestore() {
    return this._firestore;
  }

  auth() {
    return this._auth;
  }

  static get firestore() {
    return {
      FieldValue: MockFirestore.FieldValue
    };
  }
}

/**
 * Create mock Firebase Admin instance
 */
function createMockFirebaseAdmin() {
  const mockAdmin = new MockFirebaseAdmin();

  // Add static firestore property that matches real Firebase Admin SDK
  mockAdmin.firestore.FieldValue = MockFirestore.FieldValue;

  return mockAdmin;
}

/**
 * Reset mock data (useful for testing)
 */
function resetMockData() {
  Object.keys(mockUsers).forEach(key => {
    if (!['test-user-123', 'admin-user-123', 'premium-user-123'].includes(key)) {
      delete mockUsers[key];
    }
  });
}

/**
 * Add mock user data (useful for testing)
 */
function addMockUser(userId, userData) {
  mockUsers[userId] = {
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

module.exports = {
  createMockFirebaseAdmin,
  resetMockData,
  addMockUser,
  MockFirestore,
  MockAuth,
  mockUsers
};