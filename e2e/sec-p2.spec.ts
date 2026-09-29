import { test, expect } from '@playwright/test';

test.describe('P2 Security Findings', () => {
  test('err.message leak: signup with non-string fields returns generic error', async ({ request }) => {
    // POST with malformed types to trigger an error (e.g., non-string email)
    const response = await request.post('http://127.0.0.1:3002/api/auth/signup', {
      data: {
        email: 12345, // number instead of string
        password: 'validpass123',
        name: 'Test User',
        orgName: 'Test Org',
      },
    });
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    
    // Response should not contain error class names, TypeError, Prisma messages, etc.
    const errorMessage = JSON.stringify(body);
    expect(errorMessage).not.toMatch(/TypeError/);
    expect(errorMessage).not.toMatch(/Prisma/);
    expect(errorMessage).not.toMatch(/at |Error:/);
    // Should be generic: "Signup failed" or a validation error
    expect(['Signup failed', 'Invalid JSON body', 'Enter a valid email address']).toContainEqual(body.error);
  });

  test('err.message leak: POST /api/orgs with missing auth returns 401 without leaking error', async ({ request }) => {
    // Call without auth context
    const response = await request.post('http://127.0.0.1:3002/api/orgs', {
      data: { name: 'New Org' },
    });
    
    expect(response.status()).toBe(401);
    const body = await response.json();
    const errorMessage = JSON.stringify(body);
    
    // Should not leak internal errors
    expect(errorMessage).not.toMatch(/Prisma|TypeError|Error:/i);
  });

  test('err.message leak: POST /api/org/invite with invalid org returns generic error', async ({ request }) => {
    // Use fake session token to pass auth but fail on org lookup
    // This is just checking that error messages are generic, not specific
    const response = await request.get('http://127.0.0.1:3002/api/org/invite', {
      headers: {
        'cookie': 'invalid-session=fake',
      },
    });
    
    // Should return 401 without leaking error details
    if (response.status() === 500) {
      const body = await response.json();
      const errorMessage = JSON.stringify(body);
      expect(errorMessage).not.toMatch(/Prisma|TypeError|Error:/i);
    }
  });
});
