const { Users, Corporates } = require("../models/UsersCorporates");
const bcrypt = require("bcryptjs");

/** 🧱 CREATE USER (Admin / Normal) */
exports.create = async (data) => {
  const { userMobile, userPassword, corporateId } = data;

  const existing = await Users.findOne({ userMobile });
  if (existing) throw new Error("Mobile number already registered");

  const hashedPassword = await bcrypt.hash(userPassword, 10);

  const user = new Users({
    ...data,
    userPassword: hashedPassword,
  });

  await user.save();

  // 🔗 If linked to a corporate, add both-way linkage
  if (corporateId) {
    const corp = await Corporates.findById(corporateId);
    if (corp) {
      corp.linkedUsers.push(user._id);
      await corp.save();
      user.corporateId = corp._id;
      await user.save();
    }
  }

  return user;
};

/** 📜 LIST USERS */
exports.list = async (filters = {}) => {
  return await Users.find(filters)
    .select("-userPassword")
    .populate("corporateId", "corporateName corporatePAN");
};

/** 🔍 GET USER BY ID */
exports.getById = async (id) => {
  return await Users.findById(id)
    .select("-userPassword")
    .populate("corporateId", "corporateName corporatePAN");
};

/** ✏️ UPDATE USER */
exports.update = async (id, data) => {
  if (data.userPassword) {
    data.userPassword = await bcrypt.hash(data.userPassword, 10);
  }
  return await Users.findByIdAndUpdate(id, data, {
    new: true,
  }).select("-userPassword");
};

/** 🗑️ DELETE USER */
exports.remove = async (id) => {
  const user = await Users.findById(id);
  if (!user) throw new Error("User not found");

  if (user.corporateId) {
    await Corporates.findByIdAndUpdate(user.corporateId, {
      $pull: { linkedUsers: user._id },
    });
  }

  return await Users.findByIdAndDelete(id);
};
