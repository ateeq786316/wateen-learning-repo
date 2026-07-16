let prisma;

async function getPrisma() {
  if (!prisma) {
    const mod = await import('../services/prismaService.ts');
    prisma = mod.default;
  }
  return prisma;
}

const UserController = {
  async getAll(req, res, next) {
    try {
      const db = await getPrisma();
      const users = await db.user.findMany({ orderBy: { id: 'asc' } });
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const db = await getPrisma();
      const { id } = req.params;
      const user = await db.user.findUnique({ where: { id: Number(id) } });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const db = await getPrisma();
      const { name, email, age } = req.body;

      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and email are required' });
      }

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }

      const user = await db.user.create({ data: { name, email, age: age ? Number(age) : null } });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const db = await getPrisma();
      const { id } = req.params;
      const { name, email, age } = req.body;

      const data = {};
      if (name !== undefined) data.name = name;
      if (email !== undefined) data.email = email;
      if (age !== undefined) data.age = Number(age);

      const user = await db.user.update({
        where: { id: Number(id) },
        data,
      });

      res.json({ success: true, data: user });
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const db = await getPrisma();
      const { id } = req.params;

      await db.user.delete({ where: { id: Number(id) } });

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      next(err);
    }
  },
};

module.exports = UserController;
