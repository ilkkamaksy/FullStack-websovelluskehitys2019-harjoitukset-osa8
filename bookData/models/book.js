const mongoose = require('mongoose')

const bookSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		minlength: 2,
		unique: true,
	},
	published: {
		type: Number,
	},
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Author'
	},
	genres: [{
		type: String
	}]
})

module.exports = mongoose.model('Book', bookSchema)