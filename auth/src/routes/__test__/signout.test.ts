import request from 'supertest';
import { app } from '../../app';

describe('Signout', () => {
  it('clears the cookie after signing out', async () => {
    await request(app)
      .post('/api/users/signup')
      .send({
        email: 'test@test.com',
        password: 'password'
      })
      .expect(201);

    const response = await request(app)
      .post('/api/users/signout')
      .send({})
      .expect(200);

    const setCookie = response.get('Set-Cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie?.[0]).toEqual(
      'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly'
    );
  });
  
  it('returns 200 when signing out without being signed in', async () => {
    await request(app)
      .post('/api/users/signout')
      .send({})
      .expect(200);
  });
});
