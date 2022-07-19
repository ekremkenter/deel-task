const { Router } = require('express');
const { getProfile } = require('../middleware/getProfile');
const { sequelize } = require('../model');

const router = Router();

router.use(getProfile);

/**
 * Deposits money into the the the balance of a client,
 * a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
 * @returns deposit status message
 */
router.post('/deposit/:userId', async (req, res) => {
  const { Profile, Job, Contract } = req.app.get('models');

  const { id: profileId, balance } = req.profile;
  const { userId } = req.params;
  const { amount } = req.body;

  if (!amount) {
    return res.status(406).json({ message: 'Provide amount to be deposited' });
  }

  if (amount > balance) {
    return res.status(406).json({ message: 'You have insufficient balance' });
  }

  const client = await Profile.findOne({
    where: { id: userId, type: 'client' },
  });
  if (!client) return res.status(404).end();

  const sumOfWaitingJobPrices = await Job.sum('price', {
    where: {
      paid: null,
    },
    include: [
      {
        model: Contract,
        attributes: [],
        where: {
          ClientId: profileId,
        },
      },
    ],
  });

  if (amount >= sumOfWaitingJobPrices / 4) {
    return res
      .status(406)
      .json({
        message: "You can't deposit more than 25% your total of jobs to pay.",
      })
      .end();
  }

  const transaction = await sequelize.transaction();

  try {
    await req.profile.decrement({ balance: amount });
    await client.increment({ balance: amount });
    await transaction.commit();
    return res.json({ message: 'Deposit successful' }).end();
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ message: 'Failed to add balance' }).end();
  }
});

module.exports = router;
