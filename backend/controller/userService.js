const { Users } = require("../models/AllCollectionSchema");
const bcrypt = require("bcryptjs");

/**
 * Create new user (Admin or Normal)
 */
exports.create = async (data) => {
  // check mobile duplication
  const existing = await Users.findOne({ mobile: data.mobile });
  if (existing) throw new Error("Mobile number already registered");

  // hash password if not already hashed
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = new Users({
    ...data,
    password: hashedPassword,
  });

  return await user.save();
};

/**
 * List all users
 */
exports.list = async (filters = {}) => {
  return await Users.find(filters)
    .select("-password") // hide password
    .populate("createdBy updatedBy", "name");
};

/**
 * Get single user by ID
 */
exports.getById = async (id) => {
  return await Users.findById(id).select("-password").populate("createdBy updatedBy", "name");
};

/**
 * Update user info
 */
exports.update = async (id, data) => {
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  return await Users.findByIdAndUpdate(id, data, { new: true }).select("-password");
};

/**
 * Delete user
 */
exports.remove = async (id) => {
  return await Users.findByIdAndDelete(id);
};
