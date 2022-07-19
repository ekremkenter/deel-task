const { Router } = require('express');
const { fn, col, literal, Op } = require('sequelize');
const { adminFilter } = require('../middleware/adminFilter');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const router = Router();
router.use(adminFilter);

const DATE_FORMAT = 'YYYY-MM-DD';

const dateFilter = async (req, res, next) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res
      .status(406)
      .json({ message: 'Provide start & end date in query' });
  }

  const startDate = dayjs(start, DATE_FORMAT, true);
  const endDate = dayjs(end, DATE_FORMAT, true);

  if (!startDate.isValid() || !endDate.isValid()) {
    return res.status(406).json({
      message: `Provide valid start & end date (${DATE_FORMAT}) in query`,
    });
  }
  next();
};

/**
 * @returns Returns the profession that earned the most money (sum of jobs paid)
 * for any contactor that worked in the query time range.
 */
router.get('/best-profession', dateFilter, async (req, res) => {
  const { Profile, Job, Contract } = req.app.get('models');

  const { start, end } = req.query;

  const profiles = await Profile.findAll({
    attributes: [
      'profession',
      [fn('sum', col('Contractor.Jobs.price')), 'total'],
    ],
    group: ['profession'],
    order: literal('total DESC'),
    include: [
      {
        model: Contract,
        attributes: [],
        as: 'Contractor',
        include: [
          {
            model: Job,
            attributes: [],
            where: {
              paid: true,
              paymentDate: { [Op.between]: [start, end] },
            },
          },
        ],
      },
    ],
  });
  if (profiles.length === 0) {
    return res.status(406).json({ message: 'Not enough data' }).end();
  }

  res.json({ profession: profiles[0].profession });
});

/**
 * @returns returns the clients the paid the most for jobs in the query time period.
 * limit query parameter should be applied, default limit is 2.
 */
router.get('/best-clients', dateFilter, async (req, res) => {
  const { Profile, Job, Contract } = req.app.get('models');

  const { start, end, limit = 2 } = req.query;

  const profiles = await Profile.findAll({
    attributes: [
      'id',
      [literal("firstName || ' ' || lastName"), 'fullName'],
      [fn('sum', col('price')), 'paid'],
    ],
    group: [col('Profile.id')],
    order: literal('paid DESC'),
    limit,
    include: [
      {
        duplicating: false,
        model: Contract,
        attributes: [],
        as: 'Client',
        required: true,
        include: [
          {
            model: Job,
            duplicating: false,

            attributes: [],
            required: true,
            where: {
              paid: true,
              paymentDate: { [Op.between]: [start, end] },
            },
          },
        ],
      },
    ],
  });
  if (profiles.length === 0) {
    return res.status(406).json({ message: 'Not enough data' }).end();
  }

  res.json(profiles);
});

module.exports = router;
