const { Op } = require('sequelize');
const { Router } = require('express');
const { getProfile } = require('../middleware/getProfile');

const router = Router();

router.use(getProfile);

/**
 * @returns contract by id
 */
router.get('/:id', async (req, res) => {
  const { Contract } = req.app.get('models');
  const { id } = req.params;
  const { id: profileId } = req.profile;
  const contract = await Contract.findOne({
    where: { id, ContractorId: profileId },
  });
  if (!contract) return res.status(404).end();
  res.json(contract);
});

/**
 * @returns list of contracts belonging to a user (client or contractor),
 * the list should only contain non terminated contracts.
 */
router.get('/', async (req, res) => {
  const { Contract } = req.app.get('models');
  const { id: profileId } = req.profile;

  const contracts = await Contract.findAll({
    where: {
      status: { [Op.ne]: 'terminated' },
      [Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }],
    },
  });
  res.json(contracts);
});

module.exports = router;
