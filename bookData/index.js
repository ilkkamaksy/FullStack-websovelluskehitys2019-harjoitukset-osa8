const config = require('./utils/config')
const jwt = require('jsonwebtoken')

const { ApolloServer, gql, PubSub, UserInputError, AuthenticationError } = require('apollo-server')
const mongoose = require('mongoose')
const pubsub = new PubSub()
const Author = require('./models/author')
const Book = require('./models/book')
const User = require('./models/user')

mongoose.set('useFindAndModify', false)

mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true })
	.then(() => {
		console.log('Connected to Mongdb')
	})
	.catch((error) => {
		console.log('error connection to MongoDB:', error.message)
	})


const typeDefs = gql`
	type User {
		username: String!
		favoriteGenre: String!
		id: ID!
	}

	type Token {
		value: String!
	}

    type Author {
        name: String!
        born: Int
        bookCount: Int
        id: ID!
    }
	
	type Book {
		title: String!
		published: Int!
		author: Author!
		genres: [String!]!
		id: ID!
	}

    type Query {
        bookCount: Int!
        authorCount: Int!
        allBooks(author: String, genre: String): [Book!]!
		allAuthors: [Author!]!
		me: User
    }  
	
	type Subscription {
		bookAdded: Book!
	} 

    type Mutation {
        addBook(
            title: String!
            published: Int!
            author: String!
            genres: [String!]
		): Book
		addAuthor(
			name: String!
			born: Int
		): Author
        editAuthor(
            name: String!
            setBornTo: Int!
		): Author
		createUser(
			username: String!
			favoriteGenre: String!
		): User
		login(
			username: String!
			password: String!
		): Token
    }
`

const resolvers = {
	Query: {
		me: (root, args, context) => {
			return context.currentUser
		},
		bookCount: () => Book.collection.countDocuments(),
		authorCount: () => Author.collection.countDocuments(),
		allBooks: async (root, args) => {
			if ( !args.author && !args.genre ) {
				return Book.find({}).populate( 'author', { name: 1, born: 1 })
			} 
        
			if ( args.author && !args.genre ) {

				try {
					const authorObj = await Author.findOne({ name: args.author })
					if ( authorObj ) {
						return Book.find({ 
							author: { $in: [ authorObj._id ] } 
						}).populate( 'author', { name: 1, born: 1 })
					} 
				} catch(error) {
					throw new UserInputError(error.message, {
						invalidArgs: args,
					})
				}
			} 
        
			if ( args.genre && !args.author ) {
				return Book.find({
					genres: { $in: [ args.genre ] }
				}).populate( 'author', { name: 1, born: 1})
			} 

			if ( args.author && args.genre ) {
				
				try {
					const authorObj = await Author.findOne({ name: args.author })
					if ( authorObj ) {
						return Book.find({ 
							author: { $in: [ authorObj._id ] }, 
							genres: { $in: [ args.genre ] }
						}).populate( 'author', { name: 1, born: 1 })
					} 
				} catch(error) {
					throw new UserInputError(error.message, {
						invalidArgs: args,
					})
				}

			}
		},
		allAuthors: () => Author.find({})
	},
	Author: {
		bookCount: async (root) => {
			return Book.collection.countDocuments({ author: root._id })
		}
	},
	Mutation: {
		addBook: async (root, args, context) => {

			const currentUser = context.currentUser

			if ( !currentUser ) {
				throw new AuthenticationError('not authenticated')
			}
			
			let author = await Author.findOne({ name: args.author })
			if ( !author ) {
				author = new Author({ name: args.author })
				try {
					await author.save()
				} catch(error) {
					throw new UserInputError(error.message, {
						invalidArgs: args,
					})
				}
			}
			
			const book = new Book({ 
				...args,
				author: author._id 
			})
			
			try {
				await book.save()
			} catch(error) {
				throw new UserInputError(error.message, {
					invalidArgs: args,
				})
			}
			book.author = author
			pubsub.publish('BOOK_ADDED', { bookAdded: book })
			return book
		},
		addAuthor: async (root, args, context) => {

			const currentUser = context.currentUser

			if ( !currentUser ) {
				throw new AuthenticationError('not authenticated')
			}

			const author = new Author({ ...args })
			try {
				await author.save()
			} catch(error) {
				throw new UserInputError(error.message, {
					invalidArgs: args,
				})
			}
			return author
		},
		editAuthor: async (root, args, context) => {

			const currentUser = context.currentUser

			if ( !currentUser ) {
				throw new AuthenticationError('not authenticated')
			}

			const author = await Author.findOne({ name: args.name })
			if ( !author ) {
				return null
			}
			author.born = args.setBornTo

			try {
				await author.save()
			} catch(error) {
				throw new UserInputError(error.message, {
					invalidArgs: args,
				})
			}
			return author
		},
		createUser: (root, args) => {
			const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre })
			try {
				return user.save()
			} catch(error) {
				throw new UserInputError(error.message, {
					invalidArgs: args
				})
			}
		},
		login: async (root, args) => {
			const user = await User.findOne({ username: args.username })

			if ( !user || args.password !== 'secret' ) {
				throw new UserInputError('wrong credentials')
			}

			const userForToken = {
				username: user.username,
				id: user._id,
			}

			return { value: jwt.sign(userForToken, config.JWT_SECRET ) }
		}
	},
	Subscription: {
		bookAdded: {
			subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
		}
	}
}

const server = new ApolloServer({
	typeDefs,
	resolvers,
	context: async ({req}) => {
		const auth = req ? req.headers.authorization : null
		if ( auth && auth.toLowerCase().startsWith('bearer') ) {
			const decodedToken = jwt.verify(
				auth.substring(7), config.JWT_SECRET
			)
			const currentUser = await User.findById(decodedToken.id)
			return { currentUser }
		}
	}
})

server.listen().then(({ url, subscriptionsUrl }) => {
	console.log(`Server ready at ${url}`)
	console.log(`Subscriptions ready at ${subscriptionsUrl}`)
})