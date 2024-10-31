import request from 'supertest'
import { app } from '../../app'
import mongoose from 'mongoose'
import { natsClient } from '../../nats-client'

it('returns 404 if the provided id does not exist', async () => {
  
  const id = new mongoose.Types.ObjectId().toHexString()

  const title = 'asdf asdf'
  const price = 10

  await request(app)
    .put(`/api/tickets/${id}`)
    .set('Cookie', global.signin())
    .send({ title, price })
    .expect(404)
  
})

it('returns 401 if the user is not authenticated', async () => {
  
  const id = new mongoose.Types.ObjectId().toHexString()

  const title = 'asdf asdf'
  const price = 10

  await request(app)
    .put(`/api/tickets/${id}`)
    .send({ title, price })
    .expect(401)
})

it('returns 401 if the user does not own the ticket', async () => {
  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', global.signin())
    .send({title: 'asdf', price: 10})

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signin())
    .send({ title: 'asdf asdf', price: 20 })
    .expect(401)
})

it('returns 400 if the user provides an invalid price or title', async () => {

  const cookie = global.signin()

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({ title: 'asdf', price: 10 })
  
  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: '', price: 10 })
    .expect(400)
  
  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: 'asdf', price: -10 })
    .expect(400)
})

it('updates the ticket provided valid inputs', async () => {
  const cookie = global.signin()

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({ title: 'asdf', price: 10 })
    .expect(201)
  
  const title = 'asdf', price = 110

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title, price })
    .expect(200)

  const ticketResponse = await request(app)
    .get(`/api/tickets/${response.body.id}`)
    .send()
  
  expect(ticketResponse.body.title).toEqual(title)
  expect(ticketResponse.body.price).toEqual(price)
})

it('publishes an event', async () => {
  const cookie = global.signin()

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({ title: 'asdf', price: 10 })
    .expect(201)
  
  const title = 'asdf', price = 110

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title, price })
    .expect(200)
  
  expect(natsClient.client.publish).toHaveBeenCalled()
})