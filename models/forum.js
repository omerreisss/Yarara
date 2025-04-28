const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
  title: String
});

const Forum = mongoose.model('Forum', forumSchema);
module.exports = Forum;