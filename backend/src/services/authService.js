const bcrypt = require('bcrypt');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, hashToken, generateRandomToken } = require('../auth/utils/token');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./emailService');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

let prisma;

function getDb() {
  if (!prisma) {
    if (!globalThis.__prisma) {
      const err = new Error('Database not initialized');
      err.statusCode = 500;
      throw err;
    }
    prisma = globalThis.__prisma;
  }
  return prisma;
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  age: true,
  role: true,
  provider: true,
  avatar: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
};

function stripSensitiveFields(user) {
  const {
    password: _,
    refreshToken: __,
    emailVerificationToken: ___,
    emailVerificationExpires: ____,
    resetPasswordToken: _____,
    resetPasswordExpires: ______,
    ...safeUser
  } = user;
  return safeUser;
}

const AuthService = {

  async register({ name, email, password, age }) {
    const db = await getDb();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      const err = new Error('Email already registered');
      err.statusCode = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = generateRandomToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        age: age || null,
        provider: 'LOCAL',
        emailVerificationToken: hashToken(verificationToken),
        emailVerificationExpires: verificationExpires,
      },
      select: userSelect,
    });

    sendVerificationEmail(user, verificationToken).catch((err) => {
      logger.error(`Failed to send verification email to ${user.email}`, { error: err.message });
    });

    return { user, verificationToken };
  },

  async verifyEmail(token) {
    const db = await getDb();

    const user = await db.user.findFirst({
      where: {
        emailVerificationToken: hashToken(token),
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      const err = new Error('Invalid or expired verification token');
      err.statusCode = 400;
      throw err;
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { message: 'Email verified successfully' };
  },

  async login({ email, password }) {
    const db = await getDb();

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    if (user.provider !== 'LOCAL') {
      const err = new Error(`This account uses ${user.provider} login. Please sign in with ${user.provider}.`);
      err.statusCode = 400;
      throw err;
    }

    if (!user.password) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    if (!user.emailVerified) {
      const err = new Error('Please verify your email before logging in');
      err.statusCode = 403;
      throw err;
    }

    const accessToken = generateAccessToken(user);
    const { token: refreshToken } = generateRefreshToken(user);

    await db.user.update({
      where: { id: user.id },
      data: { refreshToken: hashToken(refreshToken) },
    });

    return { user: stripSensitiveFields(user), accessToken, refreshToken };
  },

  async refresh(refreshTokenStr) {
    const db = await getDb();

    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenStr);
    } catch (err) {
      const error = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      throw error;
    }

    if (payload.type !== 'refresh') {
      const err = new Error('Invalid token type');
      err.statusCode = 401;
      throw err;
    }

    const tokenHash = hashToken(refreshTokenStr);

    const user = await db.user.findFirst({
      where: { id: payload.sub, refreshToken: tokenHash },
    });

    if (!user) {
      const err = new Error('Refresh token has been revoked');
      err.statusCode = 401;
      throw err;
    }

    const accessToken = generateAccessToken(user);
    const { token: newRefreshToken } = generateRefreshToken(user);

    await db.user.update({
      where: { id: user.id },
      data: { refreshToken: hashToken(newRefreshToken) },
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(userId) {
    const db = await getDb();

    await db.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  },

  async getProfile(userId) {
    const db = await getDb();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    return { user };
  },

  async updateProfile(userId, updates) {
    const db = await getDb();

    const data = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.age !== undefined) data.age = updates.age;

    const user = await db.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });

    return { user };
  },

  async forgotPassword({ email }) {
    const db = await getDb();

    const user = await db.user.findUnique({ where: { email } });
    if (!user || user.provider !== 'LOCAL') {
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    const resetToken = generateRandomToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await db.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashToken(resetToken),
        resetPasswordExpires: resetExpires,
      },
    });

    await sendPasswordResetEmail(user, resetToken);

    return { message: 'If the email exists, a password reset link has been sent.' };
  },

  async resetPassword({ token, password }) {
    const db = await getDb();

    const user = await db.user.findFirst({
      where: {
        resetPasswordToken: hashToken(token),
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      const err = new Error('Invalid or expired reset token');
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        refreshToken: null,
      },
    });

    return { message: 'Password reset successful' };
  },

  async findOrCreateOAuthUser({ provider, providerId, email, name, avatar }) {
    const db = await getDb();

    let user = await db.user.findFirst({
      where: {
        OR: [
          { provider, providerId },
          { email },
        ],
      },
    });

    if (user) {
      if (user.provider === provider && user.providerId === providerId) {
        if (user.email !== email || user.name !== name || user.avatar !== avatar) {
          user = await db.user.update({
            where: { id: user.id },
            data: { email, name, avatar },
          });
        }
      } else if (user.provider === 'LOCAL') {
        user = await db.user.update({
          where: { id: user.id },
          data: { provider, providerId, avatar, emailVerified: true, password: null },
        });
      }
    } else {
      user = await db.user.create({
        data: {
          name,
          email,
          provider,
          providerId,
          avatar,
          emailVerified: true,
        },
      });
    }

    const accessToken = generateAccessToken(user);
    const { token: refreshToken } = generateRefreshToken(user);

    await db.user.update({
      where: { id: user.id },
      data: { refreshToken: hashToken(refreshToken) },
    });

    return { user: stripSensitiveFields(user), accessToken, refreshToken };
  },

};

module.exports = AuthService;
