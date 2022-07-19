const request = require('supertest');
const app = require('../app');
const seed = require('../../scripts/seedDb');
const { Job, Profile } = require('../model');

describe('API Test', () => {
  beforeEach(async () => {
    await seed();
  });

  describe('/contracts', () => {
    describe('GET /contraacts/:id', () => {
      it('should require profile_id header to be set', async () => {
        const res = await request(app).get('/contracts/1');
        expect(res.statusCode).toEqual(401);
        expect(res.body).toEqual({});
      });

      it('should get contract by id', async () => {
        const res = await request(app).get('/contracts/2').set('profile_id', 1);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual(
          expect.objectContaining({
            ClientId: 1,
            ContractorId: 6,
            id: 2,
            status: 'in_progress',
            terms: 'bla bla bla',
          })
        );
      });

      it('should return 404 for contract belongs to someone else', async () => {
        const res = await request(app).get('/contracts/3').set('profile_id', 1);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toEqual({});
      });
    });

    describe('GET /contracts', () => {
      it('should require profile_id header to be set', async () => {
        const res = await request(app).get('/contracts');
        expect(res.statusCode).toEqual(401);
        expect(res.body).toEqual({});
      });

      it('should get profile active contracts', async () => {
        const res = await request(app).get('/contracts').set('profile_id', 1);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual([
          expect.objectContaining({
            ClientId: 1,
            ContractorId: 6,
            id: 2,
            status: 'in_progress',
            terms: 'bla bla bla',
          }),
        ]);
      });
    });
  });

  describe('/jobs', () => {
    describe('GET /jobs/unpaid', () => {
      it('should require profile_id header to be set', async () => {
        const res = await request(app).get('/jobs/unpaid');
        expect(res.statusCode).toEqual(401);
        expect(res.body).toEqual({});
      });

      it('should get all unpaid jobs for a user', async () => {
        const res = await request(app).get('/jobs/unpaid').set('profile_id', 1);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual([
          expect.objectContaining({
            ContractId: 2,
            id: 2,
            paid: null,
            paymentDate: null,
          }),
        ]);
      });
    });

    describe('POST /jobs/:jobId/pay', () => {
      it('should require profile_id header to be set', async () => {
        const res = await request(app).post('/jobs/1/pay');
        expect(res.statusCode).toEqual(401);
        expect(res.body).toEqual({});
      });

      it('should pay for the job when profile has enough balance', async () => {
        const res = await request(app).post('/jobs/1/pay').set('profile_id', 1);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ message: 'Payment successful' });

        const job = await Job.findByPk(1);
        expect(job.paid).toBe(true);

        const contractor = await Profile.findByPk(5);
        expect(contractor.balance).toEqual(264);
        const client = await Profile.findByPk(1);
        expect(client.balance).toEqual(950);
      });

      it('should not pay when profile does not have enough balance', async () => {
        const res = await request(app).post('/jobs/5/pay').set('profile_id', 4);
        expect(res.statusCode).toEqual(406);
        expect(res.body).toEqual({
          message: 'Client balance is insufficient to pay this job',
        });

        const job = await Job.findByPk(5);
        expect(job.paid).toBeNull();
      });
    });
  });

  describe('/balances', () => {
    describe('POST /balances/deposit/:userId', () => {
      it('should require profile_id header to be set', async () => {
        const res = await request(app).post('/balances/deposit/1');
        expect(res.statusCode).toEqual(401);
        expect(res.body).toEqual({});
      });

      it('should transfer funds to other user', async () => {
        const res = await request(app)
          .post('/balances/deposit/2')
          .send({ amount: 100 })
          .set('profile_id', 1);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ message: 'Deposit successful' });

        const from = await Profile.findByPk(1);
        expect(from.balance).toEqual(1050);
        const to = await Profile.findByPk(2);
        expect(to.balance).toEqual(331.11);
      });

      it('should not transfer funds since amount more than 25% total of jobs to pay.', async () => {
        const res = await request(app)
          .post('/balances/deposit/2')
          .send({ amount: 1000 })
          .set('profile_id', 1);
        expect(res.statusCode).toEqual(406);
        expect(res.body).toEqual({
          message: "You can't deposit more than 25% your total of jobs to pay.",
        });

        const from = await Profile.findByPk(1);
        expect(from.balance).toEqual(1150);
        const to = await Profile.findByPk(2);
        expect(to.balance).toEqual(231.11);
      });
    });
  });

  describe('/admin', () => {
    const adminToken = 'super_secret';

    describe('GET /admin/best-profession', () => {
      it('should require admin_token header to be set', async () => {
        const res = await request(app).get('/admin/best-profession');
        expect(res.statusCode).toEqual(401);
        expect(res.body).toEqual({});
      });

      it('should require both dates to be set', async () => {
        const res = await request(app)
          .get('/admin/best-profession?start=2020-08-10&')
          .set('admin_token', adminToken);
        expect(res.statusCode).toEqual(406);
        expect(res.body).toEqual({
          message: 'Provide start & end date in query',
        });
      });

      it('should require valid date to be set', async () => {
        const res = await request(app)
          .get('/admin/best-profession?start=2020-08-10&end=20124-04-241')
          .set('admin_token', adminToken);
        expect(res.statusCode).toEqual(406);
        expect(res.body).toEqual({
          message: 'Provide valid start & end date (YYYY-MM-DD) in query',
        });
      });

      it('should return the profession that earned the most money', async () => {
        const res = await request(app)
          .get('/admin/best-profession?start=2020-08-10&end=2020-08-12')
          .set('admin_token', adminToken);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ profession: 'Musician' });
      });
    });
  });
});
