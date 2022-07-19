// in ideal world this should be read from env variables
const ADMIN_TOKEN = 'super_secret';

const adminFilter = async (req, res, next) => {
  const token = req.get('admin_token');
  if (token !== ADMIN_TOKEN) return res.status(401).end();
  next();
};
module.exports = { adminFilter };
