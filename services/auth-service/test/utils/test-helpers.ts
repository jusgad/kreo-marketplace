import * as bcrypt from 'bcrypt';

/**
 * Test helper utilities
 */

export class TestHelpers {
  /**
   * Hash a password for testing (using lower salt rounds for speed)
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 4); // Lower salt rounds for faster tests
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Wait for async operations
   */
  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up test data
   */
  static cleanupTestData() {
    jest.clearAllMocks();
  }

  /**
   * Extract cookie value from Set-Cookie header
   */
  static extractCookieValue(setCookieHeader: string[], cookieName: string): string | null {
    const cookie = setCookieHeader.find((c) => c.startsWith(`${cookieName}=`));
    if (!cookie) return null;

    const match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
    return match ? match[1] : null;
  }

  /**
   * Create a mock Express request
   */
  static createMockRequest(overrides: any = {}) {
    return {
      user: null,
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      cookies: {},
      headers: {},
      body: {},
      query: {},
      params: {},
      ...overrides,
    };
  }

  /**
   * Create a mock Express response
   */
  static createMockResponse() {
    const res: any = {
      statusCode: 200,
      headers: {},
      cookies: {},
    };

    res.status = jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    });

    res.json = jest.fn((data: any) => {
      res.body = data;
      return res;
    });

    res.send = jest.fn((data: any) => {
      res.body = data;
      return res;
    });

    res.cookie = jest.fn((name: string, value: string, options: any) => {
      res.cookies[name] = { value, options };
      return res;
    });

    res.clearCookie = jest.fn((name: string) => {
      delete res.cookies[name];
      return res;
    });

    res.setHeader = jest.fn((name: string, value: string) => {
      res.headers[name] = value;
      return res;
    });

    return res;
  }
}
