// backend/controller/LeadDB.

const mongoose = require('mongoose');

class DatabaseService {
  constructor(model) {
    this.model = model;
  }

  // Create (Add)
  async create(data) {
    try {
      const newDoc = new this.model(data);
      return await newDoc.save();
    } catch (err) {
      throw new Error('Create failed: ' + err.message);
    }
  }

  // Read (Get all or by filter)
  async get(filter = {}) {
    try {
      return await this.model.find(filter).sort({ createdAt: -1 });
    } catch (err) {
      throw new Error('Get failed: ' + err.message);
    }
  }

  // Read (Get by ID)
  async getById(id) {
    try {
      return await this.model.findById(id);
    } catch (err) {
      throw new Error('GetById failed: ' + err.message);
    }
  }

  // Update
  async update(id, data) {
    try {
      return await this.model.findByIdAndUpdate(id, data, { new: true });
    } catch (err) {
      throw new Error('Update failed: ' + err.message);
    }
  }

  // Delete
  async delete(id) {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (err) {
      throw new Error('Delete failed: ' + err.message);
    }
  }
}

module.exports = DatabaseService;
