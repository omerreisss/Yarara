const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  image: String,
  forum: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum' }
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;