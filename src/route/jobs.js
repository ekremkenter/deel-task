const { Op } = require('sequelize');
const { Router } = require('express');
const { getProfile } = require('../middleware/getProfile');
const { sequelize } = require('../model');

const router = Router();

router.use(getProfile);

/**
 * @returns all unpaid jobs for a user (either a client or contractor), for active contracts only.
 */
router.get('/unpaid', async (req, res) => {
  const { Job, Contract } = req.app.get('models');
  const { id: profileId } = req.profile;

  const jobs = await Job.findAll({
    include: [
      {
        model: Contract,
        where: {
          status: { [Op.eq]: 'in_progress' },
          [Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }],
        },
        attributes: [],
      },
    ],
  });

  res.json(jobs);
});

/**
 * Pay for a job, a client can only pay if his balance >= the amount to pay.
 * The amount should be moved from the client's balance to the contractor balance.
 * @returns payment status message
 */
router.post('/:job_id/pay', async (req, res) => {
  const { Job } = req.app.get('models');

  const { job_id } = req.params;

  const job = await Job.findOne({
    where: { id: job_id },
    include: { all: true, nested: true },
  });
  if (!job) return res.status(404).end();

  const { price: jobPrice, Contract } = job;
  const contractor = Contract.Contractor;
  const client = Contract.Client;

  if (client.balance < jobPrice) {
    return res
      .status(406)
      .json({ message: 'Client balance is insufficient to pay this job' })
      .end();
  }

  const transaction = await sequelize.transaction();

  try {
    await contractor.increment({ balance: jobPrice });
    await client.decrement({ balance: jobPrice });
    await transaction.commit();
    return res.json({ message: 'Payment successful' }).end();
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Failed to transfer funds' }).end();
  }
});

module.exports = router;
